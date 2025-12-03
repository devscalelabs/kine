import { Box, render, Text } from "ink";
import React from "react";

import type { AgentRuntime } from "../types";
import type { DebugLogger } from "../utils/debug-logger";

interface DebugDisplayProps {
	events: any[];
	steps: any[];
}

const DebugDisplay: React.FC<DebugDisplayProps> = ({ events, steps }) => {
	const latestEvents = events.slice(-10); // Show last 10 events

	return React.createElement(
		Box,
		{ flexDirection: "column", gap: 1 },
		React.createElement(
			Box,
			{
				borderStyle: "round",
				borderColor: "green",
				padding: 1,
				marginBottom: 1,
			},
			React.createElement(
				Text,
				{ color: "green", bold: true },
				"🚀 Kine Debug UI - Execution Steps",
			),
		),
		steps.map((step, index) =>
			React.createElement(
				Box,
				{
					key: index,
					borderStyle: "single",
					borderColor: "blue",
					padding: 1,
					marginBottom: 1,
					flexDirection: "column",
				},
				React.createElement(
					Text,
					{ color: "blue", bold: true },
					`Step ${index + 1} - ${step.type?.toUpperCase() || "UNKNOWN"}`,
				),
				step.action &&
					React.createElement(
						Text,
						{ color: "yellow" },
						`Action: ${step.action}`,
					),
				step.content &&
					React.createElement(
						Text,
						{ color: "white" },
						`Thought: ${step.content}`,
					),
				step.result &&
					React.createElement(
						Text,
						{ color: "green" },
						`Result: ${typeof step.result === "string" ? step.result : JSON.stringify(step.result)}`,
					),
				step.meta?.tokens &&
					React.createElement(
						Text,
						{ color: "cyan" },
						`Tokens: ${step.meta.tokens.prompt_tokens} in / ${step.meta.tokens.completion_tokens} out`,
					),
				step.meta?.latency &&
					React.createElement(
						Text,
						{ color: "magenta" },
						`Latency: ${step.meta.latency}ms`,
					),
			),
		),
		latestEvents.map((event, index) =>
			React.createElement(
				Box,
				{ key: index, flexDirection: "column" },
				React.createElement(
					Text,
					{ color: "gray" },
					`[${event.timestamp.toLocaleTimeString()}] ${event.type.toUpperCase()}`,
				),
				React.createElement(Text, { color: "white" }, `  ${event.message}`),
				event.data &&
					React.createElement(
						Text,
						{ color: "yellow" },
						`  Data: ${JSON.stringify(event.data, null, 2)}`,
					),
			),
		),
		steps.length === 0 &&
			latestEvents.length === 0 &&
			React.createElement(
				Text,
				{ color: "gray" },
				"No debug information available yet...",
			),
	);
};

export class TerminalUI {
	private runtime: AgentRuntime;
	private debugLogger: DebugLogger | undefined;
	private uiInstance?: any;

	constructor(runtime: AgentRuntime, debugLogger?: DebugLogger) {
		this.runtime = runtime;
		this.debugLogger = debugLogger;
	}

	render(): void {
		if (this.uiInstance) {
			this.uiInstance.unmount();
		}

		const debugEvents = this.debugLogger?.getEvents() || [];

		this.uiInstance = render(
			React.createElement(DebugDisplay, {
				steps: this.runtime.steps || [],
				events: debugEvents,
			}),
		);
	}

	stop(): void {
		if (this.uiInstance) {
			this.uiInstance.unmount();
			this.uiInstance = undefined;
		}
	}
}
