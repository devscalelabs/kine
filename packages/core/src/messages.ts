export interface Message {
	role: "user" | "assistant";
	content: string;
}

export function userMessage(content: string): Message {
	return {
		role: "user",
		content,
	};
}

export function assistantMessage(content: string): Message {
	return {
		role: "assistant",
		content,
	};
}
