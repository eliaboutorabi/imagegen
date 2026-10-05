/** Convert arbitrary reference dimensions to a supported GPT Image canvas.
 * Preserve the ratio where supported; extreme panoramas are letterboxed. */
export function referenceCanvas(width: number, height: number) {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return { width: 1536, height: 1024, letterboxed: false };
	}
	const ratio = width / height;
	const safeRatio = Math.min(3, Math.max(1 / 3, ratio));
	const pixels = Math.min(8_000_000, Math.max(786_432, width * height));
	let w = Math.sqrt(pixels * safeRatio);
	let h = w / safeRatio;
	const edgeScale = Math.min(1, 3840 / Math.max(w, h));
	w = Math.round((w * edgeScale) / 16) * 16;
	h = Math.round((h * edgeScale) / 16) * 16;
	if (w > h * 3) h = Math.ceil(w / 3 / 16) * 16;
	if (h > w * 3) w = Math.ceil(h / 3 / 16) * 16;
	return { width: w, height: h, letterboxed: ratio !== safeRatio };
}
