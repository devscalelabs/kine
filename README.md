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
- 📊 **Token Usage Tracking**: Built-in token usage and latency tracking
- 🔄 **Streaming Support**: Stream agent execution steps in real-time

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
import { Agent, defineTool, z } from "@devscalelabs/kine";

// Define a custom tool
const weatherTool = defineTool({
  id: "get_weather",
  description: "Get current weather for a location",
  input: z.object({
    location: z.string(),
  }),
  output: z.object({
    temperature: z.number(),
    condition: z.string(),
  }),
  execute: async ({ location }) => {
    // Your weather API call here
    return { temperature: 72, condition: "sunny" };
  },
});

// Create an agent with tools
const agent = new Agent({
  id: "weather-assistant",
  description: "AI assistant that provides weather information",
  model: "gpt-4",
  apiKey: "your-api-key", // or use LLM_API_KEY env var
  tools: [weatherTool],
});

// Run the agent
const result = await agent.run("What is the weather in New York?");
console.log(result.getFinalAnswer()); // "The current weather in New York is 72°F and sunny."
```

## Core Components

### Agent

The main agent class that orchestrates conversations and tool usage using a ReAct pattern.

```typescript
import { Agent } from "@devscalelabs/kine";

const agent = new Agent({
  id: "my-agent",              // Unique identifier
  description: "AI assistant", // Agent description
  model: "gpt-4",              // AI model
  apiKey: "your-api-key",      // or use LLM_API_KEY env var
  baseURL: "custom-api-url",   // Optional custom base URL
  tools: [...],                // Array of tools
  maxSteps: 10,                // Maximum steps (default: 10)
  debug: true,                 // Enable debug logging
  memory: memory,              // Optional memory instance
});
```

#### Agent Methods

- `run(prompt: string)`: Execute the agent with a given prompt and return a `Response`
- `runStreaming(prompt: string)`: Execute the agent with streaming support, returns an async generator that yields steps and resolves to a `Response`
- `registerTool(tool: Tool)`: Register a new tool with the agent
- `getDebug()`: Get the debug status

#### Streaming Example

```typescript
const agent = new Agent({
  id: "streaming-agent",
  model: "gpt-4",
  tools: [weatherTool],
});

const stream = agent.runStreaming("What is the weather in New York?");

let finalResponse: Response | undefined;
let result;
while (!(result = await stream.next()).done) {
  const step = result.value;
  console.log(`[STREAM] Action: ${step.action}`);
  console.log(`[STREAM] Result:`, step.result);
}

// The final value is the Response object
finalResponse = result.value;
console.log(finalResponse.getFinalAnswer());
```

### Tools

Tools are defined with Zod schemas for input/output validation:

```typescript
import { defineTool, z } from "@devscalelabs/kine";

const myTool = defineTool({
  id: "tool_name", // Unique tool identifier
  description: "What this tool does",
  input: z.object({
    // Input schema
    param1: z.string(),
    param2: z.number().optional(),
  }),
  output: z.object({
    // Output schema
    result: z.string(),
    success: z.boolean(),
  }),
  execute: async (input) => {
    // Tool implementation
    return { result: "success", success: true };
  },
});
```

### Memory

The framework includes a simple memory implementation for managing conversation history:

```typescript
import { SimpleMemory } from "@devscalelabs/kine";

const memory = new SimpleMemory({
  maxMessages: 100, // Maximum messages to store (default: 1000)
  maxSteps: 50, // Maximum steps to store (default: 100)
});

// Use with agent
const agent = new Agent({
  // ... other config
  memory: memory,
});
```

#### Memory Methods

- `addMessage(role, content, metadata?)`: Add a message to memory
- `addStep(step, stepNumber)`: Add a step to memory
- `getMessages()`: Retrieve all messages
- `getSteps()`: Retrieve all steps
- `getRecentMessages(count)`: Get the most recent N messages
- `getRecentSteps(count)`: Get the most recent N steps
- `clearMessages()`: Clear message history
- `clearSteps()`: Clear step history
- `clearAll()`: Clear all memory
- `getStats()`: Get memory statistics (totalMessages, totalSteps, userMessages, assistantMessages, systemMessages, agentSteps, toolSteps, errorSteps)
- `toConversationHistory()`: Convert memory to OpenAI conversation format
- `stepsToConversationHistory()`: Convert steps to conversation format

### Response

The agent returns a `Response` object containing the final answer and execution steps:

```typescript
const result = await agent.run("What is the weather in New York?");

// Get the final answer
console.log(result.getFinalAnswer());

// Get a formatted summary
console.log(result.getSummary());

// Get beautified output with all steps
console.log(result.beautify());

// Get raw response data
console.log(result.getRawResponse());

// Get token usage (aggregate across all steps)
console.log(result.getTokenUsage());

// Get metadata for a specific step
console.log(result.getStepMetadata(0));

// Get formatted steps string
console.log(result.getFormattedSteps());
```

#### Response Methods

- `getFinalAnswer()`: Get the final answer string
- `getSummary()`: Get a formatted summary with step counts and token usage
- `beautify()`: Get beautified output with all steps, tokens, and latency information
- `getRawResponse()`: Get raw `AgentRuntime` object
- `getTokenUsage()`: Get aggregate token usage across all steps
- `getStepMetadata(index)`: Get metadata (tokens, latency, model, etc.) for a specific step
- `getFormattedSteps()`: Get formatted steps as a string

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

## Package Exports

The package supports both main exports and subpath exports:

```typescript
// Main exports
import {
  Agent,
  SimpleMemory,
  Response,
  defineTool,
  z,
} from "@devscalelabs/kine";

// Subpath exports
import { Agent } from "@devscalelabs/kine/agent";
import { SimpleMemory } from "@devscalelabs/kine/memory";
import { defineTool } from "@devscalelabs/kine/tool";
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
  addMessage(
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: Record<string, any>
  ): void;
  getMessages(): MemoryMessage[];
  getRecentMessages(count: number): MemoryMessage[];
  addStep(step: Omit<Step, "meta">, stepNumber: number): void;
  getSteps(): MemoryStep[];
  getRecentSteps(count: number): MemoryStep[];
  clearMessages(): void;
  clearSteps(): void;
  clearAll(): void;
  getStats(): Record<string, number>;
}

interface AgentRuntime {
  response: string;
  steps: Step[];
  usage?: AggregateUsage;
}

interface Step {
  type: "agent" | "error" | "tool";
  content: string;
  action?: string;
  parameter?: any;
  result?: any;
  meta?: StepMeta;
}

interface StepMeta {
  ctxSwitches: number;
  tokens?: TokenUsage;
  latency?: number;
  model?: string;
  finish_reason?: string;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface AggregateUsage {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_latency: number;
  llm_calls: number;
}

interface MemoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface MemoryStep extends Step {
  timestamp: Date;
  stepNumber: number;
}

interface MemoryConfig {
  maxMessages?: number;
  maxSteps?: number;
}
```

## Error Handling

The framework includes robust error handling for:

- Invalid YAML responses from LLM
- Missing required fields
- Tool execution failures
- Schema validation errors
- Tool not found scenarios
- Empty final answers

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
