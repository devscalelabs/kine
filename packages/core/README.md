# @devscalelabs/kine

TypeScript framework for building AI agents with tool capabilities, memory management, and token usage tracking.

## Features

- 🤖 **AI Agent Core**: Configurable AI agent with tool integration
- 🛠️ **Tool System**: Extensible tool framework with input/output validation using Zod schemas
- 💾 **Advanced Memory Management**: Configurable message and step storage with automatic cleanup, conversation history conversion, and ReAct pattern support
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🧠 **ReAct Pattern**: Structured reasoning and acting loop with YAML communication
- 📊 **Comprehensive Token Usage Tracking**: Aggregate token usage, latency metrics, and LLM call statistics across all agent steps
- 🔄 **Streaming Support**: Stream agent execution steps in real-time
- 📈 **Built-in Analytics**: Memory statistics, step categorization, and performance monitoring

## Installation

```bash
npm install @devscalelabs/kine
```

## Quick Start

```typescript
import { Agent } from "@devscalelabs/kine/agent";
import { defineTool } from "@devscalelabs/kine/tool";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { z } from "zod";

// Define a tool
const weatherTool = defineTool({
  id: "get_weather",
  description: "Get current weather for a location",
  input: z.object({ location: z.string() }),
  output: z.object({ temperature: z.number(), condition: z.string() }),
  execute: async ({ location }) => {
    // Your API call here
    return { temperature: 72, condition: "sunny" };
  },
});

// Create agent
const agent = new Agent({
  id: "weather-assistant",
  model: "gpt-4",
  apiKey: process.env.LLM_API_KEY,
  tools: [weatherTool],
});

// Run agent
const result = await agent.run("What's the weather in New York?");
console.log(result.getFinalAnswer());

// Access memory and usage statistics
const memory = result.getMemory();
console.log(memory.getStats()); // Message and step counts
console.log(memory.getTokenUsage()); // Token usage aggregation
```

## Memory Management

The framework provides comprehensive memory management through the `SimpleMemory` class:

```typescript
import { SimpleMemory } from "@devscalelabs/kine/memory";

// Create memory with custom configuration
const memory = new SimpleMemory({
  maxMessages: 500,  // Maximum messages to store
  maxSteps: 50,      // Maximum steps to store
});

// Add messages and steps
memory.addMessage("user", "What's the weather?");
memory.addStep(toolStep, 1);

// Get statistics
const stats = memory.getStats();
console.log(stats);
// {
//   totalMessages: 1,
//   totalSteps: 1,
//   userMessages: 1,
//   assistantMessages: 0,
//   systemMessages: 0,
//   agentSteps: 0,
//   toolSteps: 1,
//   errorSteps: 0
// }

// Get token usage
const usage = memory.getTokenUsage();
console.log(usage);
// {
//   prompt_tokens: 150,
//   completion_tokens: 75,
//   total_tokens: 225
// }

// Convert to conversation history
const history = memory.toConversationHistory();
const reactHistory = memory.stepsToConversationHistory();
```

### Agent

```typescript
const agent = new Agent({
  id: "my-agent",
  model: "gpt-4",
  apiKey: process.env.LLM_API_KEY,
  tools: [myTool],
});

// Standard execution
const result = await agent.run("Your prompt here");
console.log(result.getFinalAnswer());

// Streaming execution
const stream = agent.runStreaming("Your prompt here");
for await (const step of stream) {
  console.log(`Step: ${step.action}`);
}
```

### defineTool

```typescript
const myTool = defineTool({
  id: "tool_id",
  description: "What this tool does",
  input: z.object({ param: z.string() }),
  output: z.object({ result: z.string() }),
  execute: async (input) => {
    return { result: "success" };
  },
});
```

## Token Usage Tracking

Track and aggregate token usage across all agent steps:

```typescript
import { MetadataAggregator } from "@devscalelabs/kine/metadata";

// Aggregate usage from agent result
const steps = result.getSteps();
const aggregated = MetadataAggregator.aggregate(steps);

console.log(aggregated);
// {
//   total_prompt_tokens: 450,
//   total_completion_tokens: 225,
//   total_tokens: 675,
//   total_latency: 2400, // milliseconds
//   llm_calls: 3
// }
```

Each step can include metadata for detailed tracking:
```typescript
const step = {
  type: "tool",
  action: "get_weather",
  content: "Getting weather data",
  meta: {
    tokens: {
      prompt_tokens: 150,
      completion_tokens: 75,
      total_tokens: 225
    },
    latency: 800,
    model: "gpt-4",
    finish_reason: "stop"
  }
};
```

## Environment Variables

- `LLM_API_KEY`: Your AI provider API key
- `LLM_BASE_URL`: Custom API base URL (optional)
- `KINE_DEBUG`: Enable debug mode

## License

MIT
