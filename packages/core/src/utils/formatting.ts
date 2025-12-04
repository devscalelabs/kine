export function formatStepResult(result: any): string {
	if (typeof result === "string") {
		return result;
	}

	return JSON.stringify(result, null, 2);
}
