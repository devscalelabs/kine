import { ConversationOrchestrator } from "../execution/conversation-orchestrator";
import { ExecutionLoop } from "../execution/execution-loop";
import { StepExecutor } from "../execution/step-executor";
import { OpenAIProvider } from "../providers/openai-provider";
import { XMLResponseFormatter } from "../response/xml-response-formatter";
import { ToolManager } from "../tools/tool-manager";
import type { AgentConfig } from "../types";
import { SystemPromptBuilder } from "../utils/system-prompt-builder";

/**
 * Internal factory class for creating Agent dependencies.
 * This class is exported only for Agent constructor use.
 */
export class AgentFactory {
	static createDependencies(config: AgentConfig): {
		executionLoop: ExecutionLoop;
		systemPromptBuilder: SystemPromptBuilder;
		toolManager: ToolManager;
	} {
		// 1. Create providers
		const llmProvider = new OpenAIProvider(config.apiKey, config.baseURL);
		const responseFormatter = new XMLResponseFormatter();

		// 2. Create core services
		const toolManager = new ToolManager(config.id, config.debug ?? false);
		const systemPromptBuilder = new SystemPromptBuilder(
			config.id,
			config.description,
		);

		// 3. Create execution services
		const conversationOrchestrator = new ConversationOrchestrator(
			config.id,
			config.maxSteps ?? 10,
			config.memory || null,
			config.debug ?? false,
		);

		const stepExecutor = new StepExecutor(
			config.id,
			llmProvider,
			responseFormatter,
			toolManager,
			conversationOrchestrator,
			config.model,
			config.debug ?? false,
		);

		const executionLoop = new ExecutionLoop(
			conversationOrchestrator,
			stepExecutor,
		);

		// 4. Return dependencies
		return {
			executionLoop,
			systemPromptBuilder,
			toolManager,
		};
	}
}
