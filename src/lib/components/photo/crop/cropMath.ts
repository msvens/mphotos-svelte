import type { EditPhotoParams } from '$lib/api/services';

/** A rectangle. Units depend on context — displayed pixels while editing, natural pixels on save. */
export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** The eight resize handles: four corners + four edge midpoints. */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Smallest a crop box may get, in displayed pixels. */
export const MIN_SIZE = 20;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * The bounding box of a `w × h` image rotated by `deg`, floored — the same growth the display
 * canvas (`rotateImage`) and the Go backend (`imaging.Rotate`) produce, so crop coordinates in
 * this space map straight through to the server.
 */
export function rotatedBoundingBox(
	w: number,
	h: number,
	deg: number
): { width: number; height: number } {
	const a = rad(deg % 360);
	const s = Math.abs(Math.sin(a));
	const c = Math.abs(Math.cos(a));
	return { width: Math.floor(w * c + h * s), height: Math.floor(w * s + h * c) };
}

/**
 * A centered crop box at 80% of the constraining dimension for the given aspect ratio, in the
 * displayed image's pixels. Verbatim port of the React `handleAspectChange` math.
 */
export function centeredAspectBox(dw: number, dh: number, aspect: number): Rect {
	let width: number;
	let height: number;
	if (aspect > 1) {
		// Landscape — width is the longer side.
		width = Math.min(dw * 0.8, dh * aspect * 0.8);
		height = width / aspect;
	} else {
		// Portrait or square — height is the longer/equal side.
		height = Math.min(dh * 0.8, (dw / aspect) * 0.8);
		width = height * aspect;
	}
	return { x: (dw - width) / 2, y: (dh - height) / 2, width, height };
}

/** Translate a rect by a pointer delta. */
export function moveRect(r: Rect, dx: number, dy: number): Rect {
	return { ...r, x: r.x + dx, y: r.y + dy };
}

/** Keep a rect fully inside `[0, 0, maxW, maxH]`, translating it back in if it has run off. */
export function clampRect(r: Rect, maxW: number, maxH: number): Rect {
	const width = Math.min(r.width, maxW);
	const height = Math.min(r.height, maxH);
	const x = Math.min(Math.max(r.x, 0), maxW - width);
	const y = Math.min(Math.max(r.y, 0), maxH - height);
	return { x, y, width, height };
}

const isWest = (h: Handle) => h === 'nw' || 'w' === h || h === 'sw';
const isEast = (h: Handle) => h === 'ne' || h === 'e' || h === 'se';
const isNorth = (h: Handle) => h === 'nw' || h === 'n' || h === 'ne';
const isSouth = (h: Handle) => h === 'sw' || h === 's' || h === 'se';

/**
 * Resize a rect by dragging one of its handles.
 *
 * Free (no aspect): corners move two edges, edge handles move one; the opposite edge(s) stay
 * anchored. Aspect-locked: corners derive the locked dimension from the dragged one; an edge
 * sets its own axis and grows the perpendicular symmetrically about the box's midline. The
 * result is min-size enforced and clamped inside `[0, 0, maxW, maxH]`.
 */
export function resizeRect(
	r: Rect,
	handle: Handle,
	dx: number,
	dy: number,
	aspect: number | undefined,
	maxW: number,
	maxH: number
): Rect {
	// Work in edges, clamped to the image, then reassemble.
	let left = r.x;
	let right = r.x + r.width;
	let top = r.y;
	let bottom = r.y + r.height;

	if (isWest(handle)) left = Math.min(Math.max(r.x + dx, 0), right - MIN_SIZE);
	if (isEast(handle)) right = Math.max(Math.min(r.x + r.width + dx, maxW), left + MIN_SIZE);
	if (isNorth(handle)) top = Math.min(Math.max(r.y + dy, 0), bottom - MIN_SIZE);
	if (isSouth(handle)) bottom = Math.max(Math.min(r.y + r.height + dy, maxH), top + MIN_SIZE);

	let width = right - left;
	let height = bottom - top;

	if (aspect) {
		const horizontal = handle === 'e' || handle === 'w';
		const vertical = handle === 'n' || handle === 's';

		if (horizontal) {
			// Width is the driver; grow height symmetrically about the box's vertical midline.
			height = width / aspect;
			const midY = (top + bottom) / 2;
			top = midY - height / 2;
			bottom = midY + height / 2;
		} else if (vertical) {
			width = height * aspect;
			const midX = (left + right) / 2;
			left = midX - width / 2;
			right = midX + width / 2;
		} else {
			// Corner: derive height from the width just set, keeping the anchored corner fixed.
			height = width / aspect;
			if (isNorth(handle)) top = bottom - height;
			else bottom = top + height;
		}
		width = right - left;
		height = bottom - top;
	}

	return clampRect({ x: left, y: top, width, height }, maxW, maxH);
}

/**
 * Build a crop box from a draw gesture, in displayed pixels: `anchor` is where the pointer went
 * down, `cur` the current pointer point. Free-form unless `aspect` is set, in which case the box
 * keeps that ratio, driven by whichever axis the pointer pulled further. Clamped to the image.
 *
 * This is how a fresh selection is made when no box exists (react-image-crop's draw-to-create),
 * so the "Free" crop has something to produce.
 */
export function drawRect(
	anchorX: number,
	anchorY: number,
	curX: number,
	curY: number,
	aspect: number | undefined,
	maxW: number,
	maxH: number
): Rect {
	const ax = Math.min(Math.max(anchorX, 0), maxW);
	const ay = Math.min(Math.max(anchorY, 0), maxH);
	const cx = Math.min(Math.max(curX, 0), maxW);
	const cy = Math.min(Math.max(curY, 0), maxH);

	const dirX = cx >= ax ? 1 : -1;
	const dirY = cy >= ay ? 1 : -1;
	let width = Math.abs(cx - ax);
	let height = Math.abs(cy - ay);

	if (aspect) {
		// Drive from the dominant axis, then cap to the room left on each side of the anchor so
		// the ratio-locked box still fits inside the image.
		if (width / aspect < height) width = height * aspect;
		const availX = dirX > 0 ? maxW - ax : ax;
		const availY = dirY > 0 ? maxH - ay : ay;
		width = Math.min(width, availX, availY * aspect);
		height = width / aspect;
	}

	const x = dirX > 0 ? ax : ax - width;
	const y = dirY > 0 ? ay : ay - height;
	return clampRect({ x, y, width, height }, maxW, maxH);
}

/**
 * Convert a displayed-pixel crop box to natural pixels for the backend.
 *
 * The crux fix over the React version, which sent displayed pixels straight to a server that
 * crops the full-res original — wrong on any scaled image. Scales by `natural/client`, floors,
 * and insets so `x+width ≤ naturalW` and `y+height ≤ naturalH`: the Go `CropImage` silently
 * no-ops (rotates but doesn't crop) if the rect isn't fully inside the image bounds.
 */
export function toNaturalRect(
	r: Rect,
	naturalW: number,
	clientW: number,
	naturalH: number,
	clientH: number
): Rect {
	const sx = naturalW / clientW;
	const sy = naturalH / clientH;
	const x = Math.min(Math.max(Math.floor(r.x * sx), 0), naturalW);
	const y = Math.min(Math.max(Math.floor(r.y * sy), 0), naturalH);
	const width = Math.min(Math.floor(r.width * sx), naturalW - x);
	const height = Math.min(Math.floor(r.height * sy), naturalH - y);
	return { x, y, width, height };
}

/** The five ints the backend wants: a crop rect, or the whole (rotated) image when there's none. */
export function editParams(
	rotation: number,
	crop: Rect | null,
	naturalW: number,
	naturalH: number
): EditPhotoParams {
	return crop
		? { rotation, x: crop.x, y: crop.y, width: crop.width, height: crop.height }
		: { rotation, x: 0, y: 0, width: naturalW, height: naturalH };
}
