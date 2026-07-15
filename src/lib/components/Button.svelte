<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonVariant = 'text' | 'outlined' | 'contained';
	type ButtonColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

	interface ButtonProps extends HTMLButtonAttributes {
		children: Snippet;
		variant?: ButtonVariant;
		color?: ButtonColor;
		href?: string;
		class?: string;
		startIcon?: Snippet;
		endIcon?: Snippet;
		fullWidth?: boolean;
	}

	let {
		children,
		variant = 'contained',
		color = 'default',
		href,
		class: cls = '',
		startIcon,
		endIcon,
		fullWidth = false,
		...rest
	}: ButtonProps = $props();

	const colorStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
		default: {
			text: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
			outlined:
				'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
			contained:
				'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
		},
		primary: {
			text: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30',
			outlined:
				'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30',
			contained: 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
		},
		secondary: {
			text: 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30',
			outlined:
				'border border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30',
			contained:
				'bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700'
		},
		success: {
			text: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30',
			outlined:
				'border border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30',
			contained:
				'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
		},
		warning: {
			text: 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30',
			outlined:
				'border border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30',
			contained:
				'bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700'
		},
		error: {
			text: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
			outlined:
				'border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
			contained: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
		}
	};

	const baseStyles = 'inline-flex items-center justify-center px-4 py-2 rounded transition-colors';
	let combined = $derived(
		`${baseStyles} ${fullWidth ? 'w-full' : ''} ${colorStyles[color][variant]} ${cls}`
	);
</script>

{#snippet content()}
	{#if startIcon}<span class="mr-2">{@render startIcon()}</span>{/if}
	{@render children()}
	{#if endIcon}<span class="ml-2">{@render endIcon()}</span>{/if}
{/snippet}

{#if href}
	<a {href} class={combined}>{@render content()}</a>
{:else}
	<button class={combined} {...rest}>{@render content()}</button>
{/if}
