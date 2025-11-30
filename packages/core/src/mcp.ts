import { spawn } from "node:child_process";
import { z } from "zod";
import { defineTool, type ToolInterface } from "./tools";

export interface MCPConfig {
	serverUrl?: string;
	command?: string;
	args?: string[];
	allowedTools?: string[];
	serverLabel?: string;
	auth?: {
		type: "bearer" | "api_key";
		token: string;
	};
	env?: Record<string, string>;
}

export interface MCPTool {
	name: string;
	description: string;
	inputSchema: z.ZodType<any>;
}

export interface MCPToolResult {
	content: any;
	isError?: boolean;
}

export interface MCPResponse {
	tools: MCPTool[];
	results?: Record<string, MCPToolResult>;
}

export interface MCPClientInterface {
	listTools(): Promise<MCPTool[]>;
	callTool(name: string, input: any): Promise<MCPToolResult>;
}

class StdioMCPClient implements MCPClientInterface {
	private config: MCPConfig;
	private process: any;

	constructor(config: MCPConfig) {
		this.config = config;
	}

	async listTools(): Promise<MCPTool[]> {
		console.log("📋 Listing tools from stdio MCP server...");

		try {
			// Start the MCP server process
			const args = this.config.args || [];
			const command = this.config.command || "npx.cmd";

			console.log(`🚀 Starting MCP process: ${command} ${args.join(" ")}`);

			this.process = spawn(command, args, {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, ...this.config.env },
				shell: true,
			});

			let responseData = "";

			// Send the listTools request
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "tools/list",
				params: {},
			};

			this.process.stdin.write(`${JSON.stringify(request)}\n`);

			// Wait for response
			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error("MCP server timeout"));
				}, 10000);

				this.process.stdout.on("data", (data: Buffer) => {
					responseData += data.toString();

					// Try to parse complete JSON response
					try {
						const lines = responseData.trim().split("\n");
						for (const line of lines) {
							if (line.trim()) {
								const response = JSON.parse(line);
								if (response.id === 1 && response.result) {
									clearTimeout(timeout);
									const tools = this.parseMCPTools(response.result.tools || []);
									resolve(tools);
									return;
								}
							}
						}
					} catch (_e) {
						// Not complete JSON yet, continue waiting
					}
				});

				this.process.stderr.on("data", (data: Buffer) => {
					console.error("MCP stderr:", data.toString());
				});

				this.process.on("error", (error: Error) => {
					clearTimeout(timeout);
					reject(error);
				});
			});
		} catch (error) {
			console.error("Failed to list MCP tools:", error);
			throw new Error(
				`MCP server communication failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async callTool(name: string, input: any): Promise<MCPToolResult> {
		console.log(`⚡ Calling stdio MCP tool: ${name} with input:`, input);

		if (!this.process) {
			throw new Error("MCP process not initialized");
		}

		try {
			const request = {
				jsonrpc: "2.0",
				id: Date.now(),
				method: "tools/call",
				params: {
					name: name,
					arguments: input,
				},
			};

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error("MCP tool call timeout"));
				}, 30000);

				let responseData = "";

				const onData = (data: Buffer) => {
					responseData += data.toString();

					try {
						const lines = responseData.trim().split("\n");
						for (const line of lines) {
							if (line.trim()) {
								const response = JSON.parse(line);
								if (response.id === request.id) {
									clearTimeout(timeout);
									this.process.stdout.removeListener("data", onData);

									if (response.error) {
										reject(
											new Error(
												response.error.message || "MCP tool call failed",
											),
										);
									} else {
										resolve({
											content: response.result?.content || response.result,
											isError: false,
										});
									}
									return;
								}
							}
						}
					} catch (_e) {
						// Not complete JSON yet, continue waiting
					}
				};

				this.process.stdout.on("data", onData);
				this.process.stdin.write(`${JSON.stringify(request)}\n`);
			});
		} catch (error) {
			console.error(`Failed to call MCP tool ${name}:`, error);
			throw new Error(
				`MCP tool call failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private parseMCPTools(mcpTools: any[]): MCPTool[] {
		return mcpTools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: this.parseSchema(tool.inputSchema),
		}));
	}

	private parseSchema(schema: any): z.ZodType<any> {
		if (schema.type === "object" && schema.properties) {
			const shape: Record<string, z.ZodType<any>> = {};
			const required = schema.required || [];

			for (const [key, prop] of Object.entries(schema.properties as any)) {
				let zodType = this.parseProperty(prop);

				// Make field optional if not in required array
				if (!required.includes(key)) {
					zodType = zodType.optional();
				}

				shape[key] = zodType;
			}
			return z.object(shape);
		}
		return z.any();
	}

	private parseProperty(prop: any): z.ZodType<any> {
		let baseType: z.ZodType<any>;

		switch (prop.type) {
			case "string":
				baseType = z.string();
				break;
			case "number":
				baseType = z.number();
				break;
			case "boolean":
				baseType = z.boolean();
				break;
			case "array":
				baseType = z.array(z.any());
				break;
			default:
				baseType = z.any();
		}

		// Handle default values
		if (prop.default !== undefined) {
			return baseType.default(prop.default);
		}

		return baseType;
	}
}

class HTTPMCPClient implements MCPClientInterface {
	private config: MCPConfig;

	constructor(config: MCPConfig) {
		this.config = config;
	}

	async listTools(): Promise<MCPTool[]> {
		if (!this.config.serverUrl) {
			throw new Error("serverUrl is required for HTTP MCP client");
		}

		const response = await fetch(`${this.config.serverUrl}/tools`, {
			method: "GET",
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`Failed to list MCP tools: ${response.statusText}`);
		}

		const data = await response.json();
		const tools = data.tools || [];

		if (this.config.allowedTools) {
			return tools.filter((tool: MCPTool) =>
				this.config.allowedTools?.includes(tool.name),
			);
		}

		return tools;
	}

	async callTool(name: string, input: any): Promise<MCPToolResult> {
		if (!this.config.serverUrl) {
			throw new Error("serverUrl is required for HTTP MCP client");
		}

		const response = await fetch(
			`${this.config.serverUrl}/tools/${name}/call`,
			{
				method: "POST",
				headers: {
					...this.getHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ input }),
			},
		);

		if (!response.ok) {
			throw new Error(
				`Failed to call MCP tool ${name}: ${response.statusText}`,
			);
		}

		return await response.json();
	}

	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {};

		if (this.config.auth) {
			if (this.config.auth.type === "bearer") {
				headers.Authorization = `Bearer ${this.config.auth.token}`;
			} else if (this.config.auth.type === "api_key") {
				headers["X-API-Key"] = this.config.auth.token;
			}
		}

		return headers;
	}
}

export async function defineMCP(config: MCPConfig): Promise<ToolInterface[]> {
	console.log("🔌 Initializing MCP client with config:", {
		serverUrl: config.serverUrl,
		command: config.command,
		args: config.args,
		serverLabel: config.serverLabel,
		allowedToolsCount: config.allowedTools?.length || 0,
		hasAuth: !!config.auth,
	});

	// Choose client type based on config
	let client: MCPClientInterface;

	if (config.command) {
		client = new StdioMCPClient(config);
	} else if (config.serverUrl) {
		client = new HTTPMCPClient(config);
	} else {
		throw new Error(
			"Either 'command' or 'serverUrl' must be provided in MCP config",
		);
	}

	try {
		console.log("📋 Fetching available MCP tools...");
		const mcpTools = await client.listTools();
		console.log(`✅ Found ${mcpTools.length} MCP tools`);

		const tools: ToolInterface[] = [];

		for (const mcpTool of mcpTools) {
			console.log(`🔨 Creating tool wrapper for: ${mcpTool.name}`);

			const tool = defineTool({
				name: mcpTool.name,
				description: `[MCP] ${mcpTool.description}`,
				inputSchema: mcpTool.inputSchema || z.any(),
				outputSchema: z.any(),
				execute: async (context) => {
					console.log(`⚡ Executing MCP tool: ${mcpTool.name}`);
					try {
						const result = await client.callTool(mcpTool.name, context.input);
						console.log(`✅ MCP tool ${mcpTool.name} executed successfully`);
						return result.content;
					} catch (error) {
						console.error(`❌ MCP tool ${mcpTool.name} failed:`, error);
						throw error;
					}
				},
			});

			tools.push(tool);
		}

		console.log(`✅ Created ${tools.length} MCP tool wrappers`);
		return tools;
	} catch (error) {
		console.error("❌ Failed to initialize MCP:", error);
		throw new Error(
			`MCP initialization failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
