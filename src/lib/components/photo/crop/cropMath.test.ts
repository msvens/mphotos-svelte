import { describe, it, expect } from 'vitest';
import {
	rotatedBoundingBox,
	centeredAspectBox,
	moveRect,
	clampRect,
	resizeRect,
	drawRect,
	toNaturalRect,
	editParams,
	type Rect,
	type Handle
} from './cropMath';

const rect = (x: number, y: number, width: number, height: number): Rect => ({
	x,
	y,
	width,
	height
});

describe('rotatedBoundingBox', () => {
	it('is unchanged at 0°', () => {
		expect(rotatedBoundingBox(400, 300, 0)).toEqual({ width: 400, height: 300 });
	});

	it('swaps dimensions at 90/270', () => {
		expect(rotatedBoundingBox(400, 300, 90)).toEqual({ width: 300, height: 400 });
		expect(rotatedBoundingBox(400, 300, 270)).toEqual({ width: 300, height: 400 });
	});

	it('is unchanged at 180', () => {
		expect(rotatedBoundingBox(400, 300, 180)).toEqual({ width: 400, height: 300 });
	});

	it('grows both dimensions at a fine angle', () => {
		const b = rotatedBoundingBox(400, 300, 5);
		expect(b.width).toBeGreaterThan(400);
		expect(b.height).toBeGreaterThan(300);
		// 400·cos5 + 300·sin5 ≈ 424.6 → 424 ; 400·sin5 + 300·cos5 ≈ 333.7 → 333
		expect(b).toEqual({ width: 424, height: 333 });
	});
});

describe('centeredAspectBox', () => {
	it('centers a landscape box at 80% width', () => {
		// aspect 2 (>1), dw 1000 dh 1000 → width = min(800, 1600) = 800, height = 400
		const b = centeredAspectBox(1000, 1000, 2);
		expect(b).toEqual({ x: 100, y: 300, width: 800, height: 400 });
	});

	it('centers a portrait box at 80% height', () => {
		// aspect 0.5 (<1), dw 1000 dh 1000 → height = min(800, 1600) = 800, width = 400
		const b = centeredAspectBox(1000, 1000, 0.5);
		expect(b).toEqual({ x: 300, y: 100, width: 400, height: 800 });
	});

	it('centers a square box', () => {
		const b = centeredAspectBox(1000, 600, 1);
		// aspect 1 → height = min(480, 800) = 480, width = 480
		expect(b).toEqual({ x: 260, y: 60, width: 480, height: 480 });
	});

	it('is constrained by the shorter dimension in landscape', () => {
		// dw 500 dh 1000, aspect 2 → width = min(400, 1600) = 400
		const b = centeredAspectBox(500, 1000, 2);
		expect(b.width).toBe(400);
		expect(b.height).toBe(200);
	});
});

describe('moveRect', () => {
	it('translates', () => {
		expect(moveRect(rect(10, 20, 100, 50), 5, -5)).toEqual(rect(15, 15, 100, 50));
	});
});

describe('clampRect', () => {
	it('pushes a rect back inside on the left/top', () => {
		expect(clampRect(rect(-10, -20, 100, 50), 800, 600)).toEqual(rect(0, 0, 100, 50));
	});

	it('pushes back on the right/bottom', () => {
		expect(clampRect(rect(750, 580, 100, 50), 800, 600)).toEqual(rect(700, 550, 100, 50));
	});

	it('shrinks a rect larger than the image', () => {
		expect(clampRect(rect(0, 0, 1000, 800), 800, 600)).toEqual(rect(0, 0, 800, 600));
	});
});

describe('resizeRect (free)', () => {
	const base = rect(100, 100, 200, 200);
	const free = (h: Handle, dx: number, dy: number) =>
		resizeRect(base, h, dx, dy, undefined, 800, 600);

	it('se corner grows both axes, anchoring the top-left', () => {
		expect(free('se', 50, 30)).toEqual(rect(100, 100, 250, 230));
	});

	it('nw corner moves both edges, anchoring the bottom-right', () => {
		// left 100→150, top 100→140; right/bottom stay at 300
		expect(free('nw', 50, 40)).toEqual(rect(150, 140, 150, 160));
	});

	it('e edge moves only the right edge', () => {
		expect(free('e', 40, 999)).toEqual(rect(100, 100, 240, 200));
	});

	it('n edge moves only the top edge', () => {
		expect(free('n', 999, -30)).toEqual(rect(100, 70, 200, 230));
	});

	it('enforces the minimum size', () => {
		// drag the east edge far left → clamps to MIN_SIZE (20)
		const r = free('e', -500, 0);
		expect(r.width).toBe(20);
		expect(r.x).toBe(100);
	});

	it('clamps a resize to the image bounds', () => {
		const r = free('se', 999, 999);
		expect(r.x + r.width).toBeLessThanOrEqual(800);
		expect(r.y + r.height).toBeLessThanOrEqual(600);
	});
});

describe('resizeRect (aspect-locked)', () => {
	const base = rect(100, 100, 200, 200); // square, in an 800×600 image
	const locked = (h: Handle, dx: number, dy: number) => resizeRect(base, h, dx, dy, 2, 800, 600);

	it('derives height from width on a corner drag', () => {
		// aspect 2; se corner +100 width → width 300, height 150, top-left anchored
		const r = locked('se', 100, 0);
		expect(r.width / r.height).toBeCloseTo(2);
		expect(r.x).toBe(100);
		expect(r.y).toBe(100);
	});

	it('grows height symmetrically when dragging an edge', () => {
		// e edge +100 → width 300, height 150 centered on the old vertical midline (200)
		const r = locked('e', 100, 0);
		expect(r.width).toBe(300);
		expect(r.height).toBe(150);
		expect(r.y + r.height / 2).toBeCloseTo(200); // midline preserved
	});

	it('keeps the aspect ratio on a vertical edge drag', () => {
		const r = locked('s', 0, 40);
		expect(r.width / r.height).toBeCloseTo(2);
	});
});

describe('drawRect (draw-to-create)', () => {
	it('builds a free box from anchor to current point', () => {
		expect(drawRect(100, 100, 300, 250, undefined, 800, 600)).toEqual(rect(100, 100, 200, 150));
	});

	it('normalizes a drag up-and-left (current before anchor)', () => {
		expect(drawRect(300, 250, 100, 100, undefined, 800, 600)).toEqual(rect(100, 100, 200, 150));
	});

	it('clamps the current point to the image', () => {
		const r = drawRect(700, 500, 900, 700, undefined, 800, 600);
		expect(r).toEqual(rect(700, 500, 100, 100));
	});

	it('keeps the aspect ratio, driven by the dominant axis', () => {
		// wide drag, tiny vertical → width drives, height = width / 2
		const r = drawRect(100, 100, 300, 120, 2, 800, 600);
		expect(r).toEqual(rect(100, 100, 200, 100));
	});

	it('caps a ratio-locked box to the room on the short side of the anchor', () => {
		// anchor near the bottom: only 50px below, aspect 2 → height ≤ 50, width ≤ 100
		const r = drawRect(100, 550, 500, 600, 2, 800, 600);
		expect(r).toEqual(rect(100, 550, 100, 50));
	});
});

describe('toNaturalRect (the scaling fix)', () => {
	it('scales displayed pixels up to natural pixels', () => {
		// natural 4000×3000, client 800×600 → ×5
		const r = toNaturalRect(rect(80, 60, 400, 300), 4000, 800, 3000, 600);
		expect(r).toEqual({ x: 400, y: 300, width: 2000, height: 1500 });
	});

	it('floors fractional coordinates', () => {
		const r = toNaturalRect(rect(10.7, 10.7, 100.9, 100.9), 4000, 800, 3000, 600);
		expect(r.x).toBe(Math.floor(10.7 * 5));
		expect(r.width).toBe(Math.floor(100.9 * 5));
	});

	it('insets so the rect stays inside the natural bounds', () => {
		// A box flush to the displayed edge must not exceed natural bounds after scaling,
		// or the Go CropImage silently no-ops.
		const r = toNaturalRect(rect(0, 0, 800, 600), 4000, 800, 3000, 600);
		expect(r.x + r.width).toBeLessThanOrEqual(4000);
		expect(r.y + r.height).toBeLessThanOrEqual(3000);
	});

	it('insets a slightly-overflowing box', () => {
		// client box wider than the client image (rounding) → clamp width to naturalW - x
		const r = toNaturalRect(rect(790, 0, 20, 100), 4000, 800, 3000, 600);
		expect(r.x).toBe(3950);
		expect(r.x + r.width).toBeLessThanOrEqual(4000);
	});
});

describe('editParams', () => {
	it('sends the whole image when there is no crop', () => {
		expect(editParams(90, null, 4000, 3000)).toEqual({
			rotation: 90,
			x: 0,
			y: 0,
			width: 4000,
			height: 3000
		});
	});

	it('passes a crop through', () => {
		expect(editParams(5, rect(10, 20, 100, 200), 4000, 3000)).toEqual({
			rotation: 5,
			x: 10,
			y: 20,
			width: 100,
			height: 200
		});
	});
});
