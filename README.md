# @devscalelabs/kine - Core Package

Core components for the Kine AI Agent Framework - A TypeScript framework for building AI agents with tool capabilities.

## Overview

This package contains the core functionality of Kine, a modular framework that enables you to create intelligent AI agents that can interact with external tools using a ReAct (Reasoning + Acting) pattern. Built with TypeScript and Zod for type safety, it uses YAML-based communication between the AI and tools.

## Features

- 🤖 **AI Agent Core**: Configurable AI agent with tool integration
- 🛠️ **Tool System**: Extensible tool framework with input/output validation using Zod schemas
- 💾 **Memory Management**: Built-in conversation history and state management
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🧠 **ReAct Pattern**: Structured reasoning and acting loop with YAML communication

## Installation

```bash
npm install @devscalelabs/kine
# or
yarn add @devscalelabs/kine
# or
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
  apiKey: 'your-api-key',  // or use LLM_API_KEY env var
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
import { Agent } from '@devscalelabs/kine';

const agent = new Agent({
  id: 'my-agent',              // Unique identifier
  description: 'AI assistant', // Agent description
  model: 'gpt-4',              // AI model
  apiKey: 'your-api-key',      // or use LLM_API_KEY env var
  baseURL: 'custom-api-url',   // Optional custom base URL
  tools: [...],                // Array of tools
  maxSteps: 10,                // Maximum steps (default: 10)
  debug: true                  // Enable debug logging
});
```

#### Agent Methods

- `run(prompt: string)`: Execute the agent with a given prompt
- `registerTool(tool: Tool)`: Register a new tool with the agent
- `getDebug()`: Get the debug status

### Tools

Tools are defined with Zod schemas for input/output validation:

```typescript
import { defineTool, z } from '@devscalelabs/kine';

const myTool = defineTool({
  id: 'tool_name',              // Unique tool identifier
  description: 'What this tool does',
  input: z.object({             // Input schema
    param1: z.string(),
    param2: z.number().optional()
  }),
  output: z.object({            // Output schema
    result: z.string(),
    success: z.boolean()
  }),
  execute: async (input) => {
    // Tool implementation
    return { result: 'success', success: true };
  }
});
```

### Memory

The framework includes a simple memory implementation for managing conversation history:

```typescript
import { SimpleMemory } from '@devscalelabs/kine';

const memory = new SimpleMemory({
  maxMessages: 100,  // Maximum messages to store
  maxSteps: 50       // Maximum steps to store
});

// Use with agent
const agent = new Agent({
  // ... other config
  memory: memory
});
```

Memory methods:
- `addMessage(role, content, metadata?)`: Add a message to memory
- `addStep(step, stepNumber)`: Add a step to memory
- `getMessages()`: Retrieve all messages
- `getSteps()`: Retrieve all steps
- `clearMessages()`: Clear message history
- `clearSteps()`: Clear step history
- `clearAll()`: Clear all memory
- `getStats()`: Get memory statistics

### Response

The agent returns a `Response` object containing the final answer and execution steps:

```typescript
const result = await agent.run('What is the weather in New York?');

// Get the final answer
console.log(result.getFinalAnswer());

// Get a formatted summary
console.log(result.getSummary());

// Get beautified output with all steps
console.log(result.beautify());

// Get raw response data
console.log(result.getRawResponse());
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

## Environment Variables

The framework supports configuration through environment variables:

- `LLM_API_KEY`: Your AI provider API key (if not provided in agent config)
- `LLM_BASE_URL`: Custom API base URL (optional)
- `KINE_DEBUG`: Enable debug mode (set to "true")
- `LOG_LEVEL`: Logging level (default: "debug")

## Type Definitions

The package exports several important TypeScript interfaces:

```typescript
interface AgentConfig {
  id: string;
  description?: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
  tools?: Tool[];
  memory?: BaseMemory;
  maxSteps?: number;
  debug?: boolean;
}

interface Tool<Input = any, Output = any> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<Input>;
  outputSchema: z.ZodSchema<Output>;
  execute(parameter: any): Promise<any>;
}

interface BaseMemory {
  addMessage(role: "user" | "assistant" | "system", content: string, metadata?: Record<string, any>): void;
  getMessages(): MemoryMessage[];
  addStep(step: Omit<Step, "meta">, stepNumber: number): void;
  getSteps(): MemoryStep[];
  clearAll(): void;
  getStats(): Record<string, number>;
}

interface AgentRuntime {
  response: string;
  steps: Step[];
}

interface Step {
  type: "agent" | "error" | "tool";
  content: string;
  action?: string;
  parameter?: any;
  result?: any;
  meta?: { ctxSwitches: number };
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

# Development mode with watch
pnpm run dev

# Type checking
pnpm run typecheck
```

## License

MIT