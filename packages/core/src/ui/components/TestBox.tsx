import React from "react";
import { Box, Text } from "ink";

export const TestBox = () =>
	React.createElement(
		Box,
		{ borderStyle: "round", borderColor: "green", padding: 1 },
		React.createElement(Text, { color: "green" }, "Hello from Kine UI! 🚀"),
	);
