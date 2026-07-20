<script lang="ts">
	export interface SideMenuItem {
		id: string;
		name: string;
	}

	interface SideMenuProps {
		items: SideMenuItem[];
		activeItem: string;
		onItemChange: (id: string) => void;
	}

	let { items, activeItem, onItemChange }: SideMenuProps = $props();
</script>

<div
	class="mb-6 w-full flex-shrink-0 border-b border-gray-200 sm:mb-0 sm:w-64 sm:border-r sm:border-b-0 dark:border-gray-700"
>
	<div class="sm:sticky sm:top-24">
		<nav class="py-2 sm:pr-2">
			{#each items as item (item.id)}
				<button
					onclick={() => onItemChange(item.id)}
					aria-current={activeItem === item.id ? 'true' : undefined}
					class="w-full px-4 py-2 text-left text-sm transition-colors {activeItem === item.id
						? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
						: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'}"
				>
					{item.name}
				</button>
			{/each}
		</nav>
	</div>
</div>
