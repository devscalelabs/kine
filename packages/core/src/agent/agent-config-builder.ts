import type { AgentConfig } from "../types";

export class AgentConfigBuilder {
	private config: Partial<AgentConfig> = {};

	id(id: string): AgentConfigBuilder {
		this.config.id = id;
		return this;
	}

	description(description: string): AgentConfigBuilder {
		this.config.description = description;
		return this;
	}

	model(model: string): AgentConfigBuilder {
		this.config.model = model;
		return this;
	}

	apiKey(apiKey: string): AgentConfigBuilder {
		this.config.apiKey = apiKey;
		return this;
	}

	baseURL(baseURL: string): AgentConfigBuilder {
		this.config.baseURL = baseURL;
		return this;
	}

	tools(tools: any[]): AgentConfigBuilder {
		this.config.tools = tools;
		return this;
	}

	memory(memory: any): AgentConfigBuilder {
		this.config.memory = memory;
		return this;
	}

	maxSteps(maxSteps: number): AgentConfigBuilder {
		this.config.maxSteps = maxSteps;
		return this;
	}

	debug(debug: boolean): AgentConfigBuilder {
		this.config.debug = debug;
		return this;
	}

	build(): AgentConfig {
		const requiredFields = ["id", "model"];
		for (const field of requiredFields) {
			if (!this.config[field as keyof AgentConfig]) {
				throw new Error(`Missing required field: ${field}`);
			}
		}

		const result: AgentConfig = {
			id: this.config.id!,
			model: this.config.model!,
		};

		if (this.config.description !== undefined) {
			result.description = this.config.description;
		}

		if (this.config.apiKey !== undefined) {
			result.apiKey = this.config.apiKey;
		}

		if (this.config.baseURL !== undefined) {
			result.baseURL = this.config.baseURL;
		}

		if (this.config.tools !== undefined) {
			result.tools = this.config.tools;
		}

		if (this.config.memory !== undefined) {
			result.memory = this.config.memory;
		}

		if (this.config.maxSteps !== undefined) {
			result.maxSteps = this.config.maxSteps;
		}

		result.debug =
			this.config.debug ?? (process.env.KINE_DEBUG === "true" || false);

		return result;
	}

	static create(): AgentConfigBuilder {
		return new AgentConfigBuilder();
	}
}
