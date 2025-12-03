import logger from "./logger";

export class DebugLogger {
	private enabled: boolean;
	private agentId: string;

	constructor(agentId: string, enabled: boolean = false) {
		this.agentId = agentId;
		this.enabled = enabled;
	}

	debug(message: string, data?: any): void {
		if (!this.enabled) return;

		const formattedMessage = data
			? `[${this.agentId}] ${message}: ${JSON.stringify(data)}`
			: `[${this.agentId}] ${message}`;

		logger.debug(formattedMessage);
	}

	logToolRegistration(toolName: string, metadata?: any): void {
		if (!this.enabled) return;

		this.debug(`Registered tool: ${toolName}`);
		if (metadata) {
			this.debug(`Tool metadata: ${JSON.stringify(metadata)}`);
		}
	}

	logStep(stepNumber: number, action: string, content: string): void {
		if (!this.enabled) return;

		this.debug(`Step ${stepNumber}: ${action} - ${content}`);
	}

	logRawLLMResponse(response: string): void {
		if (!this.enabled) return;

		this.debug(`Raw LLM response: ${response}`);
	}

	logParsedLLMResponse(action?: string): void {
		if (!this.enabled) return;

		this.debug(`LLM response: action=${action}`);
	}

	logFinalization(result: string): void {
		if (!this.enabled) return;

		this.debug(`Finalized: ${result}`);
	}

	logTimeout(maxSteps: number): void {
		if (!this.enabled) return;

		this.debug(`Timeout after ${maxSteps} steps`);
	}

	isEnabled(): boolean {
		return this.enabled;
	}
}
