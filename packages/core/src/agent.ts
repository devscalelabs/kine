import OpenAI from "openai";

export interface AgentConfig {
    model?: string;
    apiKey?: string;
    baseURL?: string;
}

export class Agent {
    private openai: OpenAI;
    private model: string;

    constructor(config: AgentConfig = {}) {
        this.model = config.model || "gpt-4o-mini";

        const openaiConfig: any = {
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        };

        if (config.baseURL) {
            openaiConfig.baseURL = config.baseURL;
        }

        this.openai = new OpenAI(openaiConfig);
    }

    async run(prompt: string): Promise<string> {
        const messages = [{ role: "user" as const, content: prompt }];

        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
        });

        return response.choices[0]?.message?.content || "No response";
    }
}
