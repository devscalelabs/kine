import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { parse } from "yaml";

import logger from "./logger";
import { StepsManager } from "./steps";
import { getToolMetadata } from "./tool";
import type { AgentConfig, AgentRuntime, BaseMemory, Tool } from "./types";

export class Agent {
	private openai: OpenAI;
	protected config: AgentConfig;
	private stepsManager: StepsManager;
	private tools: Map<string, Tool> = new Map();
	private memory: BaseMemory | null = null;
	private debug: boolean;

	constructor(config: AgentConfig, maxSteps: number = 10, debug?: boolean) {
		this.config = config;
		this.stepsManager = new StepsManager(maxSteps);
		this.memory = config.memory || null;
		this.debug = debug ?? (process.env.KINE_DEBUG === "true" || false);
		this.openai = new OpenAI({
			apiKey: this.config.apiKey ?? process.env.LLM_API_KEY,
			baseURL: this.config.baseURL ?? process.env.LLM_BASE_URL,
		});

		if (this.config.tools) {
			for (const tool of this.config.tools) {
				this.registerTool(tool);
			}
		}
	}

	getDebug(): boolean {
		return this.debug;
	}

	registerTool(tool: Tool): void {
		this.tools.set(tool.name, tool);
		if (this.debug) {
			logger.debug(`[${this.config.id}] Registered tool: ${tool.name}`);
		}

		const metadata = getToolMetadata(tool);
		if (this.debug) {
			logger.debug(
				`[${this.config.id}] Tool metadata: ${JSON.stringify(metadata)}`,
			);
		}
	}

	private getToolsList(): string {
		if (this.tools.size === 0) {
			return "No tools available. Use 'finalize' to answer.";
		}

		const toolDescriptions = Array.from(this.tools.values())
			.map((t) => {
				const metadata = getToolMetadata(t);
				return `  - ${t.name}: ${t.description}\n    Input example: ${metadata.inputExample}\n    Output example: ${metadata.outputExample}`;
			})
			.join("\n");

		return `Available tools:\n${toolDescriptions}\n  - finalize: End task and provide final answer`;
	}

	async run(prompt: string): Promise<AgentRuntime> {
		const systemPrompt = this.buildSystemPrompt();
		this.stepsManager.initialize();

		if (this.memory) {
			this.memory.addMessage("user", prompt);
		}

		let finalResponse: string | null = null;

		while (!this.stepsManager.hasReachedMaxSteps()) {
			const stepOutput = await this.singleStep(systemPrompt, prompt);

			this.stepsManager.addStep({
				type: stepOutput.type,
				content: stepOutput.content,
				action: stepOutput.action,
				parameter: stepOutput.parameter,
				result: stepOutput.result,
			});

			if (this.memory) {
				this.memory.addStep(
					{
						type: stepOutput.type,
						content: stepOutput.content,
						action: stepOutput.action,
						parameter: stepOutput.parameter,
						result: stepOutput.result,
					},
					this.stepsManager.getStepCount(),
				);
			}

			if (this.debug) {
				logger.debug(
					`[${this.config.id}] Step ${this.stepsManager.getStepCount()}: ${stepOutput.action} - ${stepOutput.content}`,
				);
			}

			if (stepOutput.action === "finalize") {
				if (this.debug) {
					logger.debug(`[${this.config.id}] Finalized: ${stepOutput.result}`);
				}
				finalResponse = stepOutput.result as string;
				break;
			}

			if (this.stepsManager.isEroded(stepOutput)) {
				this.stepsManager.incrementContextSwitches();
			}
		}

		if (!finalResponse) {
			if (this.debug) {
				logger.debug(
					`[${this.config.id}] Timeout after ${this.stepsManager.getMaxSteps()} steps`,
				);
			}
			finalResponse = `Agent timed out (max ${this.stepsManager.getMaxSteps()} steps).`;
		}

		if (this.memory) {
			this.memory.addMessage("assistant", finalResponse);
		}

		return {
			response: finalResponse,
			steps: this.stepsManager.getAllSteps(),
		};
	}

	private async singleStep(systemPrompt: string, task: string) {
		const messages: ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: task },
		];

		const history = this.stepsManager.buildConversationHistory();
		messages.push(...history);

		const completion = await this.openai.chat.completions.create({
			messages,
			model: this.config.model,
		});

		const rawMsg = completion.choices[0]?.message.content ?? "";
		let parsed: any;

		try {
			parsed = parse(rawMsg);
		} catch (error) {
			return {
				type: "error" as const,
				content: "Invalid YAML format",
				action: undefined,
				parameter: undefined,
				result: `YAML parsing error: ${error instanceof Error ? error.message : String(error)}. Please respond with valid YAML only.`,
			};
		}

		if (this.debug) {
			logger.debug(`[${this.config.id}] LLM response: action=${parsed.action}`);
		}

		if (!rawMsg.includes("action:")) {
			return {
				type: "error" as const,
				content: "LLM response missing 'action' field",
				action: undefined,
				parameter: undefined,
				result: "GPT skipped 'action'",
			};
		}

		if (parsed.action === "finalize") {
			const finalAnswer = parsed.final_answer || parsed.parameter?.answer || "";

			if (!finalAnswer.trim()) {
				return {
					type: "error" as const,
					content: parsed.thought || "Empty final answer",
					action: "finalize",
					parameter: parsed.parameter,
					result:
						"final_answer cannot be empty. Provide a substantive response.",
				};
			}

			return {
				type: "agent" as const,
				content: parsed.thought || "",
				action: "finalize",
				parameter: parsed.parameter,
				result: finalAnswer,
			};
		}

		const tool = this.tools.get(parsed.action);

		if (!tool) {
			return {
				type: "error" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: parsed.parameter,
				result: `Tool not found: ${parsed.action}. Available: ${Array.from(this.tools.keys()).join(", ")}`,
			};
		}

		try {
			const validatedInput = tool.inputSchema.parse(parsed.parameter);
			const toolResult = await tool.execute(validatedInput);
			const validatedOutput = tool.outputSchema.parse(toolResult);

			return {
				type: "tool" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: validatedInput,
				result: validatedOutput,
			};
		} catch (error: any) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const validatedInput = tool.inputSchema.safeParse(parsed.parameter);
			return {
				type: "error" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: validatedInput.success
					? validatedInput.data
					: parsed.parameter,
				result: `Tool execution failed: ${errorMessage}. Please try again with different parameters.`,
			};
		}
	}

	private buildSystemPrompt(): string {
		const toolsList = this.getToolsList();

		return `
		Your id: ${this.config.id}
    Your description: ${this.config.description || "AI Agent built with Kine by Devscalelabs"}

    You are an AI agent operating in a strict ReAct loop: THINK → ACT → OBSERVE → REPEAT.

    ${toolsList}

    REQUIRED FIELDS IN EVERY RESPONSE:
    - thought: (string) Your reasoning about what to do next
    - action: (string) Name of tool to use, or 'finalize' to end
    - parameter: (object) Input data for the tool

    WHEN ACTION IS 'finalize':
    - final_answer: (string) REQUIRED. Your complete response to the user. MUST be substantive and helpful.

    CRITICAL RULES:
    1. EVERY response MUST include 'action' field
    2. NEVER use backticks, code blocks, or text outside YAML
    3. YAML keys must be lowercase
    4. If you can answer immediately, use 'finalize' with a complete 'final_answer'
    5. If you need information, use a tool, then 'finalize' with the answer
    6. 'final_answer' must NEVER be empty or generic - provide real value

    EXAMPLES:

    # Example 1: Simple query (no tools needed)
    thought: "User asked for introduction. I can answer directly without tools."
    action: "finalize"
    final_answer: "I am ${this.config.id}, an AI agent built with Kine by Devscalelabs. I can help you with various tasks using my available tools."

    # Example 2: Need to use tool first
    thought: "User wants current weather. I need to use the weather tool."
    action: "get_weather"
    parameter:
      location: "New York"

    # After tool returns observation
    observation:
      temperature: 72
      condition: "sunny"
    thought: "Got weather data. Now I can provide final answer."
    action: "finalize"
    final_answer: "The current weather in New York is 72°F and sunny."

    BEGIN. RESPOND WITH VALID YAML ONLY.
    `.trim();
	}
}
