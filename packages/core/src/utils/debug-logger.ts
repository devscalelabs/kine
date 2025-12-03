interface DebugEvent {
	type: "tool" | "step" | "llm" | "finalize" | "timeout";
	timestamp: Date;
	agentId: string;
	message: string;
	data?: any;
}

export class DebugLogger {
	private enabled: boolean;
	private agentId: string;
	private events: DebugEvent[] = [];

	constructor(agentId: string, enabled: boolean = false) {
		this.agentId = agentId;
		this.enabled = enabled;
	}

	private addEvent(
		type: DebugEvent["type"],
		message: string,
		data?: any,
	): void {
		if (!this.enabled) return;

		const event: DebugEvent = {
			type,
			timestamp: new Date(),
			agentId: this.agentId,
			message,
			data,
		};

		this.events.push(event);
	}

	debug(message: string, data?: any): void {
		this.addEvent("llm", message, data);
	}

	logToolRegistration(toolName: string, metadata?: any): void {
		this.addEvent("tool", `Registered tool: ${toolName}`, metadata);
	}

	logStep(stepNumber: number, action: string, content: string): void {
		this.addEvent("step", `Step ${stepNumber}: ${action} - ${content}`);
	}

	logRawLLMResponse(response: string): void {
		this.addEvent("llm", `Raw LLM response: ${response}`);
	}

	logParsedLLMResponse(action?: string): void {
		this.addEvent("llm", `LLM response: action=${action}`);
	}

	logFinalization(result: string): void {
		this.addEvent("finalize", `Finalized: ${result}`);
	}

	logTimeout(maxSteps: number): void {
		this.addEvent("timeout", `Timeout after ${maxSteps} steps`);
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	// Method to get all events for Response.debug()
	getEvents(): DebugEvent[] {
		return this.events;
	}
}
