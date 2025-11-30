import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { parse } from "yaml";

import { StepsManager } from "./steps";
import type { AgentConfig, AgentRuntime, Tool } from "./types";

export class Agent {
	private openai: OpenAI;
	protected config: AgentConfig;
	private stepsManager: StepsManager;
	private tools: Map<string, Tool> = new Map();

	constructor(config: AgentConfig, maxSteps: number = 10) {
		this.config = config;
		this.stepsManager = new StepsManager(maxSteps);
		this.openai = new OpenAI({
			apiKey: this.config.apiKey,
			baseURL: this.config.baseURL,
		});
	}

	registerTool(tool: Tool): void {
		this.tools.set(tool.name, tool);
		console.debug(`[${this.config.id}] Registered tool: ${tool.name}`);
	}

	private getToolsList(): string {
		if (this.tools.size === 0) {
			return "No tools available. Use 'finalize' to answer.";
		}

		const toolDescriptions = Array.from(this.tools.values())
			.map((t) => `  - ${t.name}: ${t.description}`)
			.join("\n");

		return `Available tools:\n${toolDescriptions}\n  - finalize: End task and provide final answer`;
	}

	async run(prompt: string): Promise<AgentRuntime> {
		const systemPrompt = this.buildSystemPrompt();
		this.stepsManager.initialize();

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

			console.debug(
				`[${this.config.id}] Step ${this.stepsManager.getStepCount()}: ${stepOutput.action} - ${stepOutput.content}`,
			);

			if (stepOutput.action === "finalize") {
				console.debug(`[${this.config.id}] Finalized: ${stepOutput.result}`);
				finalResponse = stepOutput.result as string;
				break;
			}

			if (this.stepsManager.isEroded(stepOutput)) {
				this.stepsManager.incrementContextSwitches();
				// Future: If > 2, call this.adapt()
			}
		}

		if (!finalResponse) {
			console.debug(
				`[${this.config.id}] Timeout after ${this.stepsManager.getMaxSteps()} steps`,
			);
			finalResponse = `Agent timed out (max ${this.stepsManager.getMaxSteps()} steps).`;
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
		const parsed = parse(rawMsg);

		console.debug(`[${this.config.id}] LLM response: action=${parsed.action}`);

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
			const toolResult = await tool.execute(parsed.parameter);
			return {
				type: "tool" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: parsed.parameter,
				result: toolResult,
			};
		} catch (error: any) {
			return {
				type: "error" as const,
				content: parsed.thought || "",
				action: parsed.action,
				parameter: parsed.parameter,
				result: `Tool execution failed: ${error.message}`,
			};
		}
	}

	private buildSystemPrompt(): string {
		const toolsList = this.getToolsList();

		return `
		// Execute tool	// Build system promptYour id: ${this.config.id}
Your description: ${this.config.description || "AI Agent built with Kine by Devscalelabs"}

You are an AI agent operating in a strict ReAct loop: THINK → ACT → OBSERVE → REPEAT.

${toolsList}

REQUIRED FIELDS IN EVERY RESPONSE:
- thought: (string) Your reasoning about what to do next
- action: (string) Name of tool to use, or 'finalize' to end
- parameter: (object) Input data for the tool

WHEN ACTION IS 'finalize':
- final_answer: (string) REQUIRED. Your complete response to the user. MUST be substantive and helpful.

❗ CRITICAL RULES:
1. EVERY response MUST include 'action' field
2. NEVER use backticks, code blocks, or text outside YAML
3. YAML keys must be lowercase
4. If you can answer immediately, use 'finalize' with a complete 'final_answer'
5. If you need information, use a tool, then 'finalize' with the answer
6. 'final_answer' must NEVER be empty or generic - provide real value

✅ EXAMPLES:

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
