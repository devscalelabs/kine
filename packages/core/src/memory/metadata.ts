export type TokenUsage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
};

export type StepMeta = {
	ctxSwitches: number;
	tokens?: TokenUsage;
	latency?: number;
	model?: string;
	finish_reason?: string;
};

export type AggregateUsage = {
	total_prompt_tokens: number;
	total_completion_tokens: number;
	total_tokens: number;
	total_latency: number;
	llm_calls: number;
};

export class MetadataAggregator {
	static aggregate(steps: Array<{ meta?: StepMeta }>): AggregateUsage {
		const usage: AggregateUsage = {
			total_prompt_tokens: 0,
			total_completion_tokens: 0,
			total_tokens: 0,
			total_latency: 0,
			llm_calls: 0,
		};

		for (const step of steps) {
			if (step.meta?.tokens) {
				usage.total_prompt_tokens += step.meta.tokens.prompt_tokens;
				usage.total_completion_tokens += step.meta.tokens.completion_tokens;
				usage.total_tokens += step.meta.tokens.total_tokens;
				usage.llm_calls++;
			}
			if (step.meta?.latency) {
				usage.total_latency += step.meta.latency;
			}
		}

		return usage;
	}
}
