# Kine - AI Agent Framework

A TypeScript framework for building AI agents with tool capabilities, powered by OpenAI.

## Overview

Kine is a modular framework that enables you to create intelligent AI agents that can interact with external tools and maintain conversation memory. Built with TypeScript and Zod for type safety.

## Features

- 🤖 **AI Agent Core**: OpenAI-powered agent with configurable models
- 🛠️ **Tool System**: Extensible tool framework with input/output validation
- 💾 **Memory Management**: Conversation history and context persistence
- 📁 **Built-in Tools**: Calculator and filesystem tools included
- 🔒 **Type Safety**: Full TypeScript support with Zod schemas

## Installation

```bash
pnpm add @devscalelabs/kine
```

## Quick Start

```typescript
import { Agent, simpleMemory, calculatorTool } from '@devscalelabs/kine';

// Create an agent with tools and memory
const agent = new Agent({
  model: 'gpt-4',
  tools: [calculatorTool],
  memory: simpleMemory(),
  instruction: 'You are a helpful math assistant.'
});

// Run the agent
const response = await agent.run({
  messages: [{ role: 'user', content: 'What is 15 + 27?' }]
});

console.log(response); // "15 + 27 = 42"
```

## Core Components

### Agent

The main agent class that orchestrates conversations and tool usage.

```typescript
const agent = new Agent({
  model: 'gpt-4',           // OpenAI model
  apiKey: 'your-api-key',   // or use OPENAI_API_KEY env var
  tools: [...],            // Array of tools
  maxIterations: 10,        // Max tool usage iterations
  instruction: '...',       // System instructions
  memory: simpleMemory()    // Memory implementation
});
```

### Tools

Tools are defined with input/output schemas and execution logic:

```typescript
import { defineTool, z } from '@devscalelabs/kine';

const myTool = defineTool({
  name: 'my_tool',
  description: 'Does something useful',
  inputSchema: z.object({
    message: z.string()
  }),
  outputSchema: z.object({
    result: z.string()
  }),
  execute: async ({ input }) => {
    return { result: `Processed: ${input.message}` };
  }
});
```

### Built-in Tools

- **Calculator**: Basic arithmetic operations
- **Filesystem**: File operations (read, write, list, search)

```typescript
import { 
  calculatorTool, 
  readFileTool, 
  writeFileTool, 
  listDirectoryTool 
} from '@devscalelabs/kine/tools';
```

### Memory

Manage conversation history and context:

```typescript
import { simpleMemory } from '@devscalelabs/kine';

const memory = simpleMemory();
// Automatically stores conversation when used with Agent
```

## Agent Response Format

The agent uses a structured response format:

```
THOUGHT: <reasoning about the task>
ACTION: <tool_name>:<json_input>
OBSERVATION: <tool_result>
FINAL_ANSWER: <final response>
```

## Examples

Check the `apps/` directory for complete examples:
- `basic-agent/`: Simple agent demonstrations
- `chat-agent/`: Memory and conversation examples

## Development

```bash
# Install dependencies
pnpm install

# Run examples
pnpm run dev

# Format code
pnpm run format
```

## License

MIT