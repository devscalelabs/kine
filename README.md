# Kine - AI Agent Framework

A TypeScript framework for building AI agents with tool capabilities.

## Overview

Kine is a modular framework that enables you to create intelligent AI agents that can interact with external tools using a ReAct (Reasoning + Acting) pattern. Built with TypeScript and Zod for type safety, it uses YAML-based communication between the AI and tools.

## Features

- 🤖 **AI Agent Core**: Configurable AI agent with tool integration
- 🛠️ **Tool System**: Extensible tool framework with input/output validation using Zod schemas
- 💾 **Conversation History**: Built-in step management and conversation context
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🧠 **ReAct Pattern**: Structured reasoning and acting loop with YAML communication

## Installation

```bash
pnpm add @devscalelabs/kine
```

## Quick Start

```typescript
import { Agent, defineTool, z } from '@devscalelabs/kine';

// Define a custom tool
const weatherTool = defineTool({
  id: 'get_weather',
  description: 'Get current weather for a location',
  input: z.object({
    location: z.string()
  }),
  output: z.object({
    temperature: z.number(),
    condition: z.string()
  }),
  execute: async ({ location }) => {
    // Your weather API call here
    return { temperature: 72, condition: 'sunny' };
  }
});

// Create an agent with tools
const agent = new Agent({
  id: 'weather-assistant',
  description: 'AI assistant that provides weather information',
  model: 'gpt-4',
  apiKey: 'your-api-key',  // or use API_KEY env var
  tools: [weatherTool]
});

// Run the agent
const result = await agent.run('What is the weather in New York?');
console.log(result.response); // "The current weather in New York is 72°F and sunny."
```

## Core Components

### Agent

The main agent class that orchestrates conversations and tool usage using a ReAct pattern.

```typescript
const agent = new Agent({
  id: 'my-agent',                    // Unique identifier
  description: 'AI assistant',       // Agent description
  model: 'gpt-4',                    // AI model
  apiKey: 'your-api-key',           // or use API_KEY env var
  baseURL: 'custom-api-url',        // Optional custom base URL
  tools: [...]                       // Array of tools
}, maxSteps = 10);                   // Optional max steps (default: 10)
```

### Tools

Tools are defined with Zod schemas for input/output validation:

```typescript
import { defineTool, z } from '@devscalelabs/kine';

const myTool = defineTool({
  id: 'tool_name',                    // Unique tool identifier
  description: 'What this tool does',
  input: z.object({                    // Input schema
    param1: z.string(),
    param2: z.number().optional()
  }),
  output: z.object({                   // Output schema
    result: z.string(),
    success: z.boolean()
  }),
  execute: async (input) => {
    // Tool implementation
    return { result: 'success', success: true };
  }
});
```

### Step Management

The agent uses a `StepsManager` to track conversation history and manage the ReAct loop:

```typescript
// Steps are automatically managed and include:
// - Agent reasoning steps
// - Tool executions
// - Error handling
// - Context switching detection
```

## ReAct Pattern

The agent operates in a strict ReAct loop with YAML-based communication:

```
thought: "User asked about weather in New York"
action: "get_weather"
parameter:
  location: "New York"

observation:
  temperature: 72
  condition: "sunny"

thought: "Now I can provide final answer"
action: "finalize"
final_answer: "The current weather in New York is 72°F and sunny"
```

## Agent Response Format

The agent returns an `AgentRuntime` object containing:

```typescript
interface AgentRuntime {
  response: string;    // Final answer from the agent
  steps: Step[];       // Complete conversation history
}

interface Step {
  type: "agent" | "error" | "tool";
  content: string;     // Thought or error message
  action?: string;     // Tool name or "finalize"
  parameter?: any;     // Tool input parameters
  result?: any;        // Tool output or final answer
  meta?: {             // Metadata
    ctxSwitches: number;
  };
}
```

## Error Handling

The framework includes robust error handling for:
- Invalid YAML responses from LLM
- Missing required fields
- Tool execution failures
- Schema validation errors
- Tool not found scenarios

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm run test

# Format code
pnpm run format
```

## Configuration

The framework supports configuration through environment variables:

- `API_KEY`: Your AI provider API key (if not provided in agent config)
- `BASE_URL`: Custom API base URL (optional)
- `LOG_LEVEL`: Logging level (default: "debug")

## License

MIT