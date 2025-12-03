import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";

import logger from "./logger";
import { MetadataAggregator, type TokenUsage } from "./metadata";
import { parseXMLResponse } from "./parser";
import { Response } from "./response";
import { StepsManager } from "./steps";
import { getToolMetadata } from "./tool";
import type { AgentConfig, AgentRuntime, BaseMemory, Tool } from "./types";

export { Response } from "./response";

export class Agent {
	private openai: OpenAI;
	protected config: AgentConfig;
	private stepsManager: StepsManager;
	private tools: Map<string, Tool> = new Map();
	private memory: BaseMemory | null = null;
	private debug: boolean;

	constructor(config: AgentConfig) {
		this.config = config;
		this.stepsManager = new StepsManager(config.maxSteps ?? 10);
		this.memory = config.memory || null;
		this.debug = config.debug ?? (process.env.KINE_DEBUG === "true" || false);
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

	async run(prompt: string): Promise<Response> {
		const systemPrompt = this.buildSystemPrompt();
		this.stepsManager.initialize();

		if (this.memory) {
			this.memory.addMessage("user", prompt);
		}

		let finalResponse: string | null = null;

		while (!this.stepsManager.hasReachedMaxSteps()) {
			const stepOutput = await this.singleStep(systemPrompt, prompt);

			this.stepsManager.addStep(
				{
					type: stepOutput.type,
					content: stepOutput.content,
					action: stepOutput.action,
					parameter: stepOutput.parameter,
					result: stepOutput.result,
				},
				stepOutput.llmMetadata,
			);

			if (this.memory) {
				const steps = this.stepsManager.getAllSteps();
				const lastStep = steps[steps.length - 1];
				if (lastStep) {
					this.memory.addStep(lastStep, this.stepsManager.getStepCount());
				}
			}

			if (this.debug) {
				logger.debug(
					`[${this.config.id}] Step ${this.stepsManager.getStepCount()}: ${
						stepOutput.action
					} - ${stepOutput.content}`,
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
					`[${
						this.config.id
					}] Timeout after ${this.stepsManager.getMaxSteps()} steps`,
				);
			}
			finalResponse = `Agent timed out (max ${this.stepsManager.getMaxSteps()} steps).`;
		}

		if (this.memory) {
			this.memory.addMessage("assistant", finalResponse);
		}

		const steps = this.stepsManager.getAllSteps();
		const usage = MetadataAggregator.aggregate(steps);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps,
			usage,
		};

		return new Response(agentRuntime);
	}

	async *runStreaming(prompt: string): AsyncGenerator<
		{
			type: "agent" | "error" | "tool";
			content: string;
			action?: string;
			parameter?: any;
			result?: any;
		},
		Response,
		unknown
	> {
		const systemPrompt = this.buildSystemPrompt();
		this.stepsManager.initialize();

		if (this.memory) {
			this.memory.addMessage("user", prompt);
		}

		let finalResponse: string | null = null;

		while (!this.stepsManager.hasReachedMaxSteps()) {
			const stepOutput = await this.singleStep(systemPrompt, prompt);

			this.stepsManager.addStep(
				{
					type: stepOutput.type,
					content: stepOutput.content,
					action: stepOutput.action,
					parameter: stepOutput.parameter,
					result: stepOutput.result,
				},
				stepOutput.llmMetadata,
			);

			const steps = this.stepsManager.getAllSteps();
			const lastStep = steps[steps.length - 1];

			if (lastStep) {
				if (this.memory) {
					this.memory.addStep(lastStep, this.stepsManager.getStepCount());
				}

				if (this.debug) {
					logger.debug(
						`[${this.config.id}] Step ${this.stepsManager.getStepCount()}: ${
							stepOutput.action
						} - ${stepOutput.content}`,
					);
				}

				yield lastStep;
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
					`[${
						this.config.id
					}] Timeout after ${this.stepsManager.getMaxSteps()} steps`,
				);
			}
			finalResponse = `Agent timed out (max ${this.stepsManager.getMaxSteps()} steps).`;
		}

		if (this.memory) {
			this.memory.addMessage("assistant", finalResponse);
		}

		const steps = this.stepsManager.getAllSteps();
		const usage = MetadataAggregator.aggregate(steps);

		const agentRuntime: AgentRuntime = {
			response: finalResponse,
			steps,
			usage,
		};

		return new Response(agentRuntime);
	}

	private async singleStep(systemPrompt: string, task: string) {
		const messages: ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: task },
		];

		if (this.memory) {
			const memoryHistory = this.memory.toConversationHistory();
			const filteredMemoryHistory = memoryHistory.filter(
				(msg: any) => !(msg.role === "user" && msg.content === task),
			);
			messages.splice(1, 0, ...filteredMemoryHistory);
		}

		const history = this.stepsManager.buildConversationHistory();
		messages.push(...history);

		const startTime = Date.now();
		const completion = await this.openai.chat.completions.create({
			messages,
			model: this.config.model,
		});
		const latency = Date.now() - startTime;

		const llmMetadata: {
			tokens?: TokenUsage;
			latency: number;
			model: string;
			finish_reason?: string;
		} = {
			latency,
			model: completion.model,
		};

		if (completion.usage) {
			llmMetadata.tokens = {
				prompt_tokens: completion.usage.prompt_tokens,
				completion_tokens: completion.usage.completion_tokens,
				total_tokens: completion.usage.total_tokens,
			};
		}

		if (completion.choices[0]?.finish_reason) {
			llmMetadata.finish_reason = completion.choices[0].finish_reason;
		}

		const rawMsg = completion.choices[0]?.message.content ?? "";
		let parsed: any;

		if (this.debug) {
			logger.debug(`[${this.config.id}] Raw LLM response: ${rawMsg}`);
		}

		try {
			parsed = parseXMLResponse(rawMsg);
		} catch (error) {
			return {
				type: "error" as const,
				content: "Invalid XML format",
				action: undefined,
				parameter: undefined,
				result: `XML parsing error: ${
					error instanceof Error ? error.message : String(error)
				}. Please respond with valid XML tags only.`,
				llmMetadata,
			};
		}

		if (this.debug) {
			logger.debug(`[${this.config.id}] LLM response: action=${parsed.action}`);
		}

		if (!parsed.action) {
			return {
				type: "error" as const,
				content: "LLM response missing 'action' tag",
				action: undefined,
				parameter: undefined,
				result:
					"LLM response skipped 'action' tag. Please include <action> tag in your response.",
				llmMetadata,
			};
		}

		if (parsed.action === "finalize") {
			const finalAnswer = parsed.finalAnswer || "";

			if (!finalAnswer.trim()) {
				return {
					type: "error" as const,
					content: parsed.thought || "Empty final answer",
					action: "finalize",
					parameter: parsed.parameter,
					result:
						"final_answer cannot be empty. Provide a substantive response with <final_answer> tag.",
					llmMetadata,
				};
			}

			return {
				type: "agent" as const,
				content: parsed.thought || "",
				action: "finalize",
				parameter: parsed.parameter,
				result: finalAnswer,
				llmMetadata,
			};
		}

		const tool = this.tools.get(parsed.action);

		if (!tool) {
			return {
				type: "error" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: parsed.parameter,
				result: `Tool not found: ${parsed.action}. Available: ${Array.from(
					this.tools.keys(),
				).join(", ")}`,
				llmMetadata,
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
				llmMetadata,
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
				llmMetadata,
			};
		}
	}

	private buildSystemPrompt(): string {
		const toolsList = this.getToolsList();

		return `
		Your id: ${this.config.id}
    Your description: ${
			this.config.description || "AI Agent built with Kine by Devscalelabs"
		}

    You are an AI agent operating in a strict ReAct loop: THINK → ACT → OBSERVE → REPEAT.

    ${toolsList}

    REQUIRED XML TAGS IN EVERY RESPONSE:
    - <thought>: Your reasoning about what to do next
    - <action>: Name of tool to use, or 'finalize' to end
    - <parameter>: Input data for the tool (can contain nested XML tags or JSON)

    WHEN ACTION IS 'finalize':
    - <final_answer>: REQUIRED. Your complete response to the user. MUST be substantive and helpful.

    CRITICAL RULES:
    1. EVERY response MUST include <action> tag - NO EXCEPTIONS EVER
    2. NEVER use backticks, code blocks, or ANY text outside XML tags
    3. XML tags must be properly closed: <tag>content</tag>
    4. If you can answer immediately, use 'finalize' with a complete <final_answer>
    5. If you need information, use a tool, then 'finalize' with the answer
    6. <final_answer> must NEVER be empty or generic - provide real value
    7. ALWAYS wrap your ENTIRE response in XML tags - ZERO plain text allowed
    8. FAILURE to include <action> tag will result in errors - ALWAYS include it

    EXAMPLES:

    <!-- Example 1: Simple query (no tools needed) -->
    <thought>User asked for introduction. I can answer directly without tools.</thought>
    <action>finalize</action>
    <final_answer>I am ${
			this.config.id
		}, an AI agent built with Kine by Devscalelabs. I can help you with various tasks using my available tools.</final_answer>

    <!-- Example 2: Need to use tool first -->
    <thought>User wants current weather. I need to use the weather tool.</thought>
    <action>get_weather</action>
    <parameter>
      <location>New York</location>
      <units>celsius</units>
    </parameter>

    <!-- After tool returns observation -->
    <thought>Got weather data. Now I can provide final answer.</thought>
    <action>finalize</action>
    <final_answer>The current weather in New York is 22°C and sunny.</final_answer>

    BEGIN. YOUR ENTIRE RESPONSE MUST BE XML TAGS ONLY - NO PLAIN TEXT WHATSOEVER. EVERY RESPONSE MUST HAVE <action> TAG.
    `.trim();
	}
}
