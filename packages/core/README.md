# @devscalelabs/kine

TypeScript framework for building AI agents with tool capabilities.

## Features

- 🤖 **AI Agent Core**: Configurable AI agent with tool integration
- 🛠️ **Tool System**: Extensible tool framework with input/output validation using Zod schemas
- 💾 **Memory Management**: Built-in conversation history and state management
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🧠 **ReAct Pattern**: Structured reasoning and acting loop with YAML communication
- 📊 **Token Usage Tracking**: Built-in token usage and latency tracking
- 🔄 **Streaming Support**: Stream agent execution steps in real-time

## Installation

```bash
npm install @devscalelabs/kine
```

## Quick Start

```typescript
import { Agent, defineTool, z } from "@devscalelabs/kine";

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
```

## API

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

## Environment Variables

- `LLM_API_KEY`: Your AI provider API key
- `LLM_BASE_URL`: Custom API base URL (optional)
- `KINE_DEBUG`: Enable debug mode

## License

MIT
