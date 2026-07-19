/** Convert Svelte reactive proxies into records accepted by structured cloning and IndexedDB. */
export function toCloneSafe<T>(value: T, seen = new WeakMap<object, unknown>()): T {
	if (value === null || typeof value !== 'object') return value;
	if (value instanceof Blob || value instanceof Date || value instanceof ArrayBuffer) return value;
	if (ArrayBuffer.isView(value)) return value;

	const source = value as object;
	const existing = seen.get(source);
	if (existing) return existing as T;

	if (Array.isArray(value)) {
		const result: unknown[] = [];
		seen.set(source, result);
		for (const item of value) result.push(toCloneSafe(item, seen));
		return result as T;
	}

	const result: Record<string, unknown> = {};
	seen.set(source, result);
	for (const [key, item] of Object.entries(value)) result[key] = toCloneSafe(item, seen);
	return result as T;
}
