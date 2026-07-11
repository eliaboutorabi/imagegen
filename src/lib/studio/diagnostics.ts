const DIAGNOSTICS_KEY = 'modyfi-diagnostics-v1';
const MAX_DIAGNOSTICS = 30;

export interface DiagnosticRecord {
	id: string;
	timestamp: string;
	stage: string;
	name: string;
	message: string;
	stack?: string;
	details: Record<string, unknown>;
	context: Record<string, string | number | boolean>;
}

function errorDetails(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== 'object') return { value: String(error) };

	const candidate = error as Record<string, unknown>;
	const details: Record<string, unknown> = {};
	for (const key of [
		'status',
		'code',
		'type',
		'param',
		'request_id',
		'requestID',
		'modyfiStage',
		'modyfiModel',
		'modyfiAttemptedModels',
		'cause'
	]) {
		if (candidate[key] !== undefined) details[key] = candidate[key];
	}
	return details;
}

export function recordDiagnostic(
	stage: string,
	error: unknown,
	context: Record<string, string | number | boolean> = {}
): DiagnosticRecord {
	const record: DiagnosticRecord = {
		id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		stage,
		name: error instanceof Error ? error.name : 'UnknownError',
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
		details: errorDetails(error),
		context
	};

	console.groupCollapsed(`[Lattice] ${stage}: ${record.message}`);
	console.error(error);
	console.info('Diagnostic context', context);
	console.groupEnd();

	try {
		const existing = JSON.parse(
			localStorage.getItem(DIAGNOSTICS_KEY) ?? '[]'
		) as DiagnosticRecord[];
		localStorage.setItem(
			DIAGNOSTICS_KEY,
			JSON.stringify([record, ...existing].slice(0, MAX_DIAGNOSTICS))
		);
	} catch {
		// Diagnostics must never interfere with the user's primary workflow.
	}

	return record;
}

export function formatDiagnostic(record: DiagnosticRecord): string {
	return [
		`${record.timestamp} · ${record.stage}`,
		`${record.name}: ${record.message}`,
		Object.keys(record.details).length ? `Details: ${JSON.stringify(record.details, null, 2)}` : '',
		`Context: ${JSON.stringify(record.context, null, 2)}`,
		record.stack ?? ''
	]
		.filter(Boolean)
		.join('\n\n');
}
