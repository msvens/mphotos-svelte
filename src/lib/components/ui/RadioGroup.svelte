<script module lang="ts">
	export interface RadioOption {
		value: string;
		label: string;
	}
</script>

<script lang="ts">
	interface RadioGroupProps {
		value?: string;
		options: RadioOption[];
		label?: string;
		id?: string;
		/** Groups the radios in the DOM. Defaults to a per-instance unique name. */
		name?: string;
	}

	let { value = $bindable(''), options, label, id, name }: RadioGroupProps = $props();

	const uid = $props.id();
	// `bind:group` groups by the bound variable, but the *browser* groups by `name` —
	// without a unique one, two RadioGroups on a page would share arrow-key roving.
	let groupName = $derived(name ?? uid);
	const labelId = `${uid}-label`;
</script>

<div {id} role="radiogroup" aria-labelledby={label ? labelId : undefined}>
	{#if label}
		<div id={labelId} class="mb-2 text-sm text-gray-600 dark:text-gray-400">{label}</div>
	{/if}
	<div class="space-y-2">
		{#each options as option (option.value)}
			<label class="flex w-fit cursor-pointer items-center gap-2">
				<input
					type="radio"
					class="peer sr-only"
					name={groupName}
					value={option.value}
					bind:group={value}
				/>
				<!-- Dot is an `after:` pseudo: `peer-checked:` is a sibling combinator and
				     can't reach a descendant of the circle. -->
				<div
					class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-500 after:block after:h-2.5 after:w-2.5 after:rounded-full after:bg-blue-500 after:opacity-0 after:content-[''] peer-checked:border-blue-500 peer-checked:after:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
				></div>
				<span class="text-gray-900 dark:text-white">{option.label}</span>
			</label>
		{/each}
	</div>
</div>
