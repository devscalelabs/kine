import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";

import type { LLMMessage, LLMProvider, LLMResponse } from "./llm-provider";
import type { TokenUsage } from "./metadata";

export class OpenAIProvider implements LLMProvider {
	private openai: OpenAI;

	constructor(apiKey?: string, baseURL?: string) {
		this.openai = new OpenAI({
			apiKey: apiKey ?? process.env.LLM_API_KEY,
			baseURL: baseURL ?? process.env.LLM_BASE_URL,
		});
	}

	async chatCompletion(
		messages: LLMMessage[],
		model: string,
	): Promise<LLMResponse> {
		const openaiMessages: ChatCompletionMessageParam[] = messages.map((msg) => {
			if (msg.role === "tool") {
				return {
					role: "tool" as const,
					content: msg.content || "",
					tool_call_id: msg.tool_call_id!,
				};
			}

			if (msg.role === "system") {
				return {
					role: "system" as const,
					content: msg.content || "",
				};
			}

			if (msg.role === "user") {
				return {
					role: "user" as const,
					content: msg.content || "",
				};
			}

			// assistant
			const assistantMsg: ChatCompletionMessageParam = {
				role: "assistant" as const,
				content: msg.content,
			};

			if (msg.tool_calls) {
				(assistantMsg as any).tool_calls = msg.tool_calls;
			}

			return assistantMsg;
		});

		const completion = await this.openai.chat.completions.create({
			messages: openaiMessages,
			model,
		});

		const usage = completion.usage
			? {
					prompt_tokens: completion.usage.prompt_tokens,
					completion_tokens: completion.usage.completion_tokens,
					total_tokens: completion.usage.total_tokens,
				}
			: undefined;

		const response: LLMResponse = {
			content: completion.choices[0]?.message.content ?? "",
			model: completion.model,
		};

		if (usage) {
			response.usage = usage;
		}

		if (completion.choices[0]?.finish_reason) {
			response.finish_reason = completion.choices[0].finish_reason;
		}

		return response;
	}
}
