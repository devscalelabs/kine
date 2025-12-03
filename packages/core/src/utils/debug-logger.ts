import logger from "./logger";

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
