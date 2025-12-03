import type { TokenUsage } from "../memory/metadata";

export interface LLMMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: {
			name: string;
			arguments: string;
		};
	}>;
	tool_call_id?: string;
}

export interface LLMResponse {
	content: string;
	model: string;
	usage?: TokenUsage;
	finish_reason?: string;
}

export interface LLMProvider {
	chatCompletion(messages: LLMMessage[], model: string): Promise<LLMResponse>;
}
