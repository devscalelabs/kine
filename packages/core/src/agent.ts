import OpenAI from "openai";

export interface AgentConfig {
    model?: string;
    apiKey?: string;
    baseURL?: string;
    debug?: boolean;
}

export class Agent {
    private openai: OpenAI;
    private model: string;
    private debug: boolean;

    constructor(config: AgentConfig = {}) {
        this.model = config.model || "gpt-4o-mini";
        this.debug = config.debug || false;

        const openaiConfig: any = {
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        };

        if (config.baseURL) {
            openaiConfig.baseURL = config.baseURL;
        }

        this.openai = new OpenAI(openaiConfig);
    }

    private debugLog(message: string, data?: any) {
        if (this.debug) {
            console.log(
                `[Agent] ${message}`,
                data ? JSON.stringify(data, null, 2) : "",
            );
        }
    }

    async run(prompt: string): Promise<string> {
        this.debugLog("Running agent", {
            prompt: prompt.substring(0, 50) + "...",
        });

        try {
            const messages = [{ role: "user" as const, content: prompt }];

            this.debugLog("Sending to LLM");

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 2000,
            });

            const result =
                response.choices[0]?.message?.content || "No response";

            this.debugLog("Received response", {
                result: result.substring(0, 50) + "...",
            });

            return result;
        } catch (error) {
            this.debugLog("Error", { error });
            throw error;
        }
    }

    async *runStream(prompt: string): AsyncGenerator<string, string, unknown> {
        this.debugLog("Starting stream", {
            prompt: prompt.substring(0, 50) + "...",
        });

        try {
            const messages = [{ role: "user" as const, content: prompt }];

            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
            });

            let fullResponse = "";

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    fullResponse += content;
                    yield content;
                }
            }

            this.debugLog("Stream completed", {
                result: fullResponse.substring(0, 50) + "...",
            });

            return fullResponse;
        } catch (error) {
            this.debugLog("Stream error", { error });
            throw error;
        }
    }
}
