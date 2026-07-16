<script module lang="ts">
	export interface SelectOption {
		value: string;
		label: string;
	}
</script>

<script lang="ts">
	import { clickOutside } from '$lib/attachments/clickOutside';

	interface SelectProps {
		value?: string;
		options: SelectOption[];
		label?: string;
		id?: string;
		placeholder?: string;
		fullWidth?: boolean;
		/** Fired on selection. `bind:value` is the primary API; this is for side effects. */
		onChange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		options,
		label,
		id,
		placeholder = 'Select...',
		fullWidth = false,
		onChange
	}: SelectProps = $props();

	const uid = $props.id();
	let triggerId = $derived(id ?? `${uid}-trigger`);
	const listboxId = `${uid}-listbox`;
	const labelId = `${uid}-label`;
	const optionId = (i: number) => `${uid}-opt-${i}`;

	let open = $state(false);
	let activeIndex = $state(-1);
	let optionEls = $state<(HTMLElement | null)[]>([]);
	let triggerEl = $state<HTMLButtonElement | null>(null);

	let selectedIndex = $derived(options.findIndex((o) => o.value === value));
	let displayText = $derived(options[selectedIndex]?.label ?? placeholder);
	let widthClass = $derived(fullWidth ? 'w-full' : '');

	function openList(index = selectedIndex >= 0 ? selectedIndex : 0) {
		open = true;
		activeIndex = options.length ? Math.max(0, Math.min(options.length - 1, index)) : -1;
	}

	function close() {
		open = false;
		activeIndex = -1;
	}

	function commit(index: number) {
		const option = options[index];
		if (!option) return;
		value = option.value;
		onChange?.(option.value);
		close();
		triggerEl?.focus();
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
				if (open) commit(activeIndex);
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
			APG select-only combobox: focus stays on the trigger and the active option is
			pointed at with aria-activedescendant, so options are never focus targets.
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
			class="cursor-pointer rounded border border-gray-200 bg-transparent py-2 pr-10 pl-3 text-left text-gray-900 hover:border-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white dark:hover:border-white {widthClass}"
		>
			{displayText}
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
			aria-labelledby={label ? labelId : undefined}
			hidden={!open}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#424242]"
		>
			{#each options as option, i (option.value)}
				<button
					bind:this={optionEls[i]}
					type="button"
					role="option"
					id={optionId(i)}
					tabindex="-1"
					aria-selected={option.value === value}
					onclick={() => commit(i)}
					class="block w-full cursor-pointer px-3 py-2 text-left {option.value === value
						? 'bg-gray-600 text-white'
						: i === activeIndex
							? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white'
							: 'text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-600'}"
				>
					{option.label}
				</button>
			{/each}
			{#if options.length === 0}
				<div class="px-3 py-2 text-gray-600 dark:text-gray-400">No options available</div>
			{/if}
		</div>
	</div>
</div>
