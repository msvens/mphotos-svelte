<script lang="ts">
	import { pointerDrag } from '$lib/attachments/pointerDrag';
	import {
		moveRect,
		resizeRect,
		drawRect,
		clampRect,
		toNaturalRect,
		MIN_SIZE,
		type Rect,
		type Handle
	} from './cropMath';

	interface CropBoxProps {
		src: string;
		alt: string;
		imageClass: string;
		aspect?: number;
		/** The box in displayed pixels, owned by the parent. Null = no selection. */
		crop: Rect | null;
		onCropChange: (r: Rect | null) => void;
		/** Fired on release, in the image's natural pixels — what the backend crops with. */
		onCompleteCrop: (natural: Rect) => void;
		/** The displayed image element, exposed so the parent can read its client/natural dims. */
		imgEl?: HTMLImageElement;
	}

	let {
		src,
		alt,
		imageClass,
		aspect,
		crop,
		onCropChange,
		onCompleteCrop,
		imgEl = $bindable()
	}: CropBoxProps = $props();

	// The box as it was when a move/resize drag began.
	let startRect: Rect | null = null;
	// The latest box produced this gesture — read on release rather than the (possibly-lagging)
	// `crop` prop, so the completed natural rect always matches what's on screen.
	let liveRect: Rect | null = null;
	// Where a draw gesture was anchored, in displayed pixels.
	let anchorX = 0;
	let anchorY = 0;

	function emitComplete() {
		if (imgEl && liveRect) {
			onCompleteCrop(
				toNaturalRect(
					liveRect,
					imgEl.naturalWidth,
					imgEl.clientWidth,
					imgEl.naturalHeight,
					imgEl.clientHeight
				)
			);
		}
	}

	// Draw a new box on the bare image (react-image-crop's draw-to-create). This is what makes the
	// "Free" crop usable when no box exists yet. Defined once so the attachment isn't re-created.
	const drawDrag = pointerDrag({
		onStart: (ox, oy) => {
			if (!imgEl) return;
			anchorX = Math.min(Math.max(ox, 0), imgEl.clientWidth);
			anchorY = Math.min(Math.max(oy, 0), imgEl.clientHeight);
			liveRect = { x: anchorX, y: anchorY, width: 0, height: 0 };
		},
		onMove: (dx, dy) => {
			if (!imgEl) return;
			liveRect = drawRect(
				anchorX,
				anchorY,
				anchorX + dx,
				anchorY + dy,
				aspect,
				imgEl.clientWidth,
				imgEl.clientHeight
			);
			onCropChange(liveRect);
		},
		onEnd: () => {
			// A click or a sliver is a mis-drag, not a crop — drop it rather than send a degenerate rect.
			if (!liveRect || liveRect.width < MIN_SIZE || liveRect.height < MIN_SIZE) {
				liveRect = null;
				onCropChange(null);
				return;
			}
			emitComplete();
		}
	});

	// Drag the box body to move it.
	const moveDrag = pointerDrag({
		onStart: () => (startRect = crop),
		onMove: (dx, dy) => {
			if (!startRect || !imgEl) return;
			liveRect = clampRect(moveRect(startRect, dx, dy), imgEl.clientWidth, imgEl.clientHeight);
			onCropChange(liveRect);
		},
		onEnd: emitComplete
	});

	// One drag per handle; the closure captures the handle, and reads `aspect`/`imgEl` live.
	// `corner` handles show always; the edge midpoints only in free mode — under a locked ratio an
	// edge drag is redundant with the corners, matching react-image-crop.
	const HANDLES: { handle: Handle; cursor: string; style: string; corner: boolean }[] = [
		{ handle: 'nw', cursor: 'nwse-resize', style: 'left:0;top:0', corner: true },
		{ handle: 'n', cursor: 'ns-resize', style: 'left:50%;top:0', corner: false },
		{ handle: 'ne', cursor: 'nesw-resize', style: 'left:100%;top:0', corner: true },
		{ handle: 'e', cursor: 'ew-resize', style: 'left:100%;top:50%', corner: false },
		{ handle: 'se', cursor: 'nwse-resize', style: 'left:100%;top:100%', corner: true },
		{ handle: 's', cursor: 'ns-resize', style: 'left:50%;top:100%', corner: false },
		{ handle: 'sw', cursor: 'nesw-resize', style: 'left:0;top:100%', corner: true },
		{ handle: 'w', cursor: 'ew-resize', style: 'left:0;top:50%', corner: false }
	];

	const handleDrags = HANDLES.map((h) => ({
		...h,
		attach: pointerDrag({
			onStart: () => (startRect = crop),
			onMove: (dx, dy) => {
				if (!startRect || !imgEl) return;
				liveRect = resizeRect(
					startRect,
					h.handle,
					dx,
					dy,
					aspect,
					imgEl.clientWidth,
					imgEl.clientHeight
				);
				onCropChange(liveRect);
			},
			onEnd: emitComplete
		})
	}));

	// All 8 in free mode; just the 4 corners once an aspect ratio is locked.
	let visibleHandles = $derived(aspect ? handleDrags.filter((h) => h.corner) : handleDrags);
</script>

<!-- object-contain shrinks this wrapper to the rendered image rect, so the overlay aligns. -->
<div class="relative inline-block">
	<img
		bind:this={imgEl}
		{src}
		{alt}
		class="{imageClass} cursor-crosshair"
		draggable="false"
		{@attach drawDrag}
	/>

	{#if crop}
		<div
			class="marching absolute box-border cursor-move touch-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
			style="left:{crop.x}px; top:{crop.y}px; width:{crop.width}px; height:{crop.height}px"
			{@attach moveDrag}
		>
			{#each visibleHandles as { handle, cursor, style, attach } (handle)}
				<div
					class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-gray-500 bg-white"
					style="{style}; cursor:{cursor}"
					{@attach attach}
				></div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Marching ants: four thin dashed edges whose dashes scroll, so the selection border animates
	   like the original react-image-crop selector. Two-tone so it reads on light and dark images. */
	.marching {
		--ant: 8px;
		background-image:
			linear-gradient(90deg, #fff 0 50%, rgba(0, 0, 0, 0.65) 50% 100%),
			linear-gradient(90deg, #fff 0 50%, rgba(0, 0, 0, 0.65) 50% 100%),
			linear-gradient(0deg, #fff 0 50%, rgba(0, 0, 0, 0.65) 50% 100%),
			linear-gradient(0deg, #fff 0 50%, rgba(0, 0, 0, 0.65) 50% 100%);
		background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
		background-size:
			var(--ant) 2px,
			var(--ant) 2px,
			2px var(--ant),
			2px var(--ant);
		background-position:
			0 0,
			0 100%,
			0 0,
			100% 0;
		animation: marching-ants 0.5s linear infinite;
	}
	@keyframes marching-ants {
		to {
			background-position:
				var(--ant) 0,
				calc(-1 * var(--ant)) 100%,
				0 calc(-1 * var(--ant)),
				100% var(--ant);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.marching {
			animation: none;
		}
	}
</style>
