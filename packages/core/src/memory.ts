import type { Message } from "./messages";

export interface MemoryInterface {
	getMessages(): Message[];
	addMessage(message: Message): void;
	clear(): void;
}

export class SimpleMemory implements MemoryInterface {
	private messages: Message[] = [];

	getMessages(): Message[] {
		return [...this.messages];
	}

	addMessage(message: Message): void {
		this.messages.push(message);
	}

	clear(): void {
		this.messages = [];
	}
}

export function simpleMemory(): SimpleMemory {
	return new SimpleMemory();
}
