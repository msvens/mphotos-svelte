<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface ToggleSwitchProps extends HTMLInputAttributes {
		checked?: boolean;
		label?: string;
	}

	let { checked = $bindable(false), label, id, ...rest }: ToggleSwitchProps = $props();

	const uid = $props.id();
	let inputId = $derived(id ?? uid);
</script>

<!--
	A real checkbox, visually hidden, driving a styled sibling via `peer-checked:`.
	The knob is an `after:` pseudo-element on the track: `peer-checked:` compiles to a
	sibling combinator, so it cannot reach a descendant of the track.
-->
<label for={inputId} class="flex w-fit cursor-pointer items-center gap-3">
	<input id={inputId} type="checkbox" class="peer sr-only" bind:checked {...rest} />
	<div
		class="relative h-6 w-11 rounded-full bg-gray-600 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
	></div>
	{#if label}
		<span class="text-gray-900 dark:text-white">{label}</span>
	{/if}
</label>
