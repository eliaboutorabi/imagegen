export const MIN_VIEWER_ZOOM = 1;
export const MAX_VIEWER_ZOOM = 5;

export function clampViewerZoom(value: number) {
	return Math.min(MAX_VIEWER_ZOOM, Math.max(MIN_VIEWER_ZOOM, value));
}

export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number) {
	const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
	return Math.min(1.08, Math.max(0.92, Math.exp(-pixels * 0.0014)));
}

export function clampViewerPan(
	x: number,
	y: number,
	zoom: number,
	imageWidth: number,
	imageHeight: number,
	stageWidth: number,
	stageHeight: number
) {
	const maxX = Math.max(0, (imageWidth * zoom - stageWidth) / 2);
	const maxY = Math.max(0, (imageHeight * zoom - stageHeight) / 2);
	return {
		x: Math.min(maxX, Math.max(-maxX, x)),
		y: Math.min(maxY, Math.max(-maxY, y))
	};
}

export function getViewerMinimap(
	imageWidth: number,
	imageHeight: number,
	stageWidth: number,
	stageHeight: number,
	zoom: number,
	panX: number,
	panY: number
) {
	if (!imageWidth || !imageHeight || !stageWidth || !stageHeight) return null;
	const previewScale = Math.min(176 / imageWidth, 126 / imageHeight);
	const width = Math.round(imageWidth * previewScale);
	const height = Math.round(imageHeight * previewScale);
	const scaledWidth = imageWidth * zoom;
	const scaledHeight = imageHeight * zoom;
	const imageLeft = stageWidth / 2 + panX - scaledWidth / 2;
	const imageTop = stageHeight / 2 + panY - scaledHeight / 2;
	const visibleLeft = Math.min(scaledWidth, Math.max(0, -imageLeft));
	const visibleTop = Math.min(scaledHeight, Math.max(0, -imageTop));
	const visibleRight = Math.min(scaledWidth, Math.max(visibleLeft, stageWidth - imageLeft));
	const visibleBottom = Math.min(scaledHeight, Math.max(visibleTop, stageHeight - imageTop));
	return {
		width,
		height,
		viewportLeft: (visibleLeft / scaledWidth) * width,
		viewportTop: (visibleTop / scaledHeight) * height,
		viewportWidth: ((visibleRight - visibleLeft) / scaledWidth) * width,
		viewportHeight: ((visibleBottom - visibleTop) / scaledHeight) * height
	};
}
