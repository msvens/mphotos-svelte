<script module lang="ts">
	export interface MultiSelectOption {
		value: string;
		label: string;
	}
</script>

<script lang="ts">
	import { clickOutside } from '$lib/attachments/clickOutside';

	interface MultiSelectProps {
		value?: string[];
		options: MultiSelectOption[];
		label?: string;
		id?: string;
		placeholder?: string;
		fullWidth?: boolean;
		/** Fired on toggle. `bind:value` is the primary API; this is for side effects. */
		onChange?: (value: string[]) => void;
	}

	let {
		value = $bindable([]),
		options,
		label,
		id,
		placeholder = 'Select...',
		fullWidth = false,
		onChange
	}: MultiSelectProps = $props();

	const uid = $props.id();
	let triggerId = $derived(id ?? `${uid}-trigger`);
	const listboxId = `${uid}-listbox`;
	const labelId = `${uid}-label`;
	const optionId = (i: number) => `${uid}-opt-${i}`;

	let open = $state(false);
	let activeIndex = $state(-1);
	let optionEls = $state<(HTMLElement | null)[]>([]);
	let triggerEl = $state<HTMLButtonElement | null>(null);

	// Comma-joined labels of the selected options, in option order.
	let displayText = $derived.by(() => {
		const labels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
		return labels.length ? labels.join(', ') : placeholder;
	});
	let widthClass = $derived(fullWidth ? 'w-full' : '');

	function openList(index = 0) {
		open = true;
		activeIndex = options.length ? Math.max(0, Math.min(options.length - 1, index)) : -1;
	}

	function close() {
		open = false;
		activeIndex = -1;
	}

	// Unlike Select, a multiselect toggles and stays open — you tick several, then dismiss.
	function toggle(index: number) {
		const option = options[index];
		if (!option) return;
		value = value.includes(option.value)
			? value.filter((v) => v !== option.value)
			: [...value, option.value];
		onChange?.(value);
	}

	function move(to: number) {
		if (!options.length) return;
		activeIndex = Math.max(0, Math.min(options.length - 1, to));
		// jsdom has no scrollIntoView.
		optionEls[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (open) toggle(activeIndex);
				else openList();
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (open) move(activeIndex + 1);
				else openList();
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (open) move(activeIndex - 1);
				else openList();
				break;
			case 'Home':
				event.preventDefault();
				if (open) move(0);
				else openList(0);
				break;
			case 'End':
				event.preventDefault();
				if (open) move(options.length - 1);
				else openList(options.length - 1);
				break;
			case 'Escape':
				if (open) {
					event.preventDefault();
					close();
				}
				break;
			case 'Tab':
				if (open) close();
				break;
		}
	}
</script>

<div class={widthClass} {@attach clickOutside(close)}>
	{#if label}
		<span id={labelId} class="mb-1 block text-xs text-gray-600 dark:text-gray-400">{label}</span>
	{/if}
	<div class="relative">
		<!--
			APG multi-select listbox: focus stays on the trigger, the active option is pointed
			at with aria-activedescendant, and toggling keeps the list open.
		-->
		<button
			bind:this={triggerEl}
			id={triggerId}
			type="button"
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
			aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
			onclick={() => (open ? close() : openList())}
			onkeydown={handleKeydown}
			class="flex min-h-[42px] w-full cursor-pointer items-center rounded border border-gray-200 bg-transparent py-2 pr-10 pl-3 text-left hover:border-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:hover:border-white {widthClass}"
		>
			<span
				class={value.length === 0
					? 'text-gray-400 dark:text-gray-600'
					: 'text-gray-900 dark:text-white'}
			>
				{displayText}
			</span>
		</button>

		<div class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
			<svg
				aria-hidden="true"
				class="h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 {open
					? 'rotate-180'
					: ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

		<div
			id={listboxId}
			role="listbox"
			aria-multiselectable="true"
			aria-labelledby={label ? labelId : undefined}
			hidden={!open}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#424242]"
		>
			{#each options as option, i (option.value)}
				{@const selected = value.includes(option.value)}
				<button
					bind:this={optionEls[i]}
					type="button"
					role="option"
					id={optionId(i)}
					tabindex="-1"
					aria-selected={selected}
					onclick={() => toggle(i)}
					class="flex w-full cursor-pointer items-center px-3 py-2 text-left {i === activeIndex
						? 'bg-gray-200 dark:bg-gray-600'
						: 'hover:bg-gray-200 dark:hover:bg-gray-600'}"
				>
					<!-- Presentational: selection is driven by the row/keyboard, not the checkbox. -->
					<input
						type="checkbox"
						checked={selected}
						tabindex="-1"
						aria-hidden="true"
						class="pointer-events-none mr-3 h-4 w-4 accent-blue-500"
					/>
					<span class="text-sm text-gray-900 dark:text-white">{option.label}</span>
				</button>
			{/each}
			{#if options.length === 0}
				<div class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">No options available</div>
			{/if}
		</div>
	</div>
</div>
