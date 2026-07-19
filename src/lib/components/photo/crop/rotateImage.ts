export interface RotatedImage {
	src: string;
	width: number;
	height: number;
}

// One reused canvas across calls — rotating is frequent (5° steps) and allocating a canvas
// each time is wasteful.
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/**
 * Render `img` rotated by `rotation` degrees to an axis-aligned data URL.
 *
 * The result matches what the Go backend produces: the canvas grows to the rotated bounding
 * box (so nothing is clipped) and the image is centered, with the corners left transparent.
 * Displaying this upright raster keeps the crop box a simple axis-aligned rectangle, and its
 * natural dimensions equal the server's rotated dimensions — so the crop coordinates map
 * straight through on save.
 */
export function rotateToDataUrl(img: HTMLImageElement, rotation: number): RotatedImage {
	if (!canvas) {
		canvas = document.createElement('canvas');
		ctx = canvas.getContext('2d');
	}
	const w = img.naturalWidth;
	const h = img.naturalHeight;
	const deg = ((rotation % 360) + 360) % 360;

	if (deg === 0 || !ctx) {
		return { src: img.src, width: w, height: h };
	}

	const angle = (deg * Math.PI) / 180;
	const sin = Math.abs(Math.sin(angle));
	const cos = Math.abs(Math.cos(angle));
	const cw = w * cos + h * sin;
	const ch = w * sin + h * cos;

	canvas.width = cw;
	canvas.height = ch;
	ctx.clearRect(0, 0, cw, ch);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.translate(cw / 2, ch / 2);
	ctx.rotate(angle);
	ctx.drawImage(img, -w / 2, -h / 2, w, h);
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	return { src: canvas.toDataURL('image/png'), width: Math.floor(cw), height: Math.floor(ch) };
}
