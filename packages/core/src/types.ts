export type Step = {
	type: "agent" | "error" | "tool";
	content: string;
	action?: string;
	parameter?: any;
	result?: any;
	meta?: { ctxSwitches: number } | undefined;
};

export type AgentRuntime = { response: string; steps: Step[] };

export interface AgentConfig {
	id: string;
	description?: string;
	model: string;
	apiKey: string;
	baseURL: string;
}

export interface Tool {
	name: string;
	description: string;
	execute(parameter: any): Promise<any>;
}
