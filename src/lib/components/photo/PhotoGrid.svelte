<script lang="ts">
	import type { Snippet } from 'svelte';
	import { photosService } from '$lib/api/services';
	import type { PhotoMetadata } from '$lib/api/types';

	interface PhotoGridProps {
		photos: PhotoMetadata[];
		/** Column count, from `uxConfig.photoGridCols`. */
		columns: number;
		/** Gap between tiles in pixels, from `uxConfig.photoGridSpacing`. */
		spacing: number;
		/** Tiles link to `{linkTo}/{photo.id}`. */
		linkTo: string;
		dimPhoto?: (photo: PhotoMetadata) => boolean;
		/** Overlay bar along the bottom of each tile. Put real buttons in here. */
		overlay?: Snippet<[PhotoMetadata, number]>;
	}

	// `columns` and `spacing` are required: the only sensible defaults live in
	// `defaultUXConfig`, and every call site passes them straight from there.
	let { photos, columns, spacing, linkTo, dimPhoto, overlay }: PhotoGridProps = $props();
</script>

{#if !photos || photos.length === 0}
	<div class="w-full py-8 text-center text-gray-500">No photos available</div>
{:else}
	<div class="w-full flex-grow">
		<!-- Inline styles: Tailwind's scanner can't see runtime values, so a class built
		     from `columns` would never be generated. -->
		<div
			style="display: grid; grid-template-columns: repeat({columns}, minmax(0, 1fr)); gap: {spacing}px; width: 100%; min-width: 100%"
		>
			{#each photos as photo, i (photo.id)}
				{@const isDimmed = dimPhoto?.(photo)}
				<!-- The anchor and the overlay are siblings, not nested: a <button> inside an
				     <a> is invalid HTML. They stack via this tile's `relative`. -->
				<div class="group relative block w-full overflow-hidden">
					<div class="relative aspect-square w-full">
						<a
							href="{linkTo}/{photo.id}"
							class="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
						>
							<img
								src={photosService.getPhotoThumbUrl(photo.id)}
								alt={photo.title || photo.fileName}
								class="h-full w-full object-cover
									{isDimmed ? 'opacity-25' : 'opacity-100'}
									transition-all duration-300 ease-in-out group-hover:scale-105"
								loading="lazy"
							/>
						</a>
						{#if overlay}
							<div class="absolute right-0 bottom-0 left-0 z-10">
								<div class="flex w-full items-center justify-end bg-black/50 p-2">
									{@render overlay(photo, i)}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
