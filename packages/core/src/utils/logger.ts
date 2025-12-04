import pino from "pino";

const logger = pino({
	level: process.env.LOG_LEVEL || "debug",
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
			translateTime: "SYS:standard",
			ignore: "pid,hostname",
		},
	},
});

export function createDebugLogger(agentId: string, debug: boolean = false) {
	return {
		info: (obj: any, msg: string) => {
			if (debug) logger.info({ agentId, ...obj }, msg);
		},
		error: (obj: any, msg: string) => {
			logger.error({ agentId, ...obj }, msg); // Always log errors
		},
	};
}

export default logger;
