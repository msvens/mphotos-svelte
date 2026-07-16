<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	type DialogMaxWidth = 'sm' | 'md' | 'lg' | 'xl';

	interface DialogProps {
		open: boolean;
		onClose: () => void;
		title?: string;
		text?: string;
		onOk?: () => void | Promise<void>;
		closeText?: string;
		okText?: string;
		closeOnOk?: boolean;
		maxWidth?: DialogMaxWidth;
		children?: Snippet;
		/** Replaces the default footer. Use when the buttons need their own state. */
		actions?: Snippet;
	}

	let {
		open,
		onClose,
		title,
		text,
		onOk,
		closeText = 'CANCEL',
		okText = 'OK',
		closeOnOk = true,
		maxWidth = 'md',
		children,
		actions
	}: DialogProps = $props();

	const maxWidthClasses: Record<DialogMaxWidth, string> = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl'
	};

	async function handleOk() {
		if (onOk) await onOk();
		if (closeOnOk) onClose();
	}

	// Escape routes through onClose, so any guard the caller puts there still applies.
	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button aria-label="Close dialog" class="absolute inset-0 bg-black/50" onclick={onClose}
		></button>

		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'dialog-title' : undefined}
			class="relative mx-4 w-full rounded bg-white shadow-lg dark:bg-[#424242] {maxWidthClasses[
				maxWidth
			]}"
		>
			{#if title}
				<div class="px-6 pt-6 pb-4">
					<h2 id="dialog-title" class="text-xl font-normal text-gray-900 dark:text-white">
						{title}
					</h2>
				</div>
			{/if}

			<div class="px-6 pb-4">
				{#if text}
					<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{text}</p>
				{/if}
				{@render children?.()}
			</div>

			<div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
				{#if actions}
					{@render actions()}
				{:else}
					<Button variant="text" onclick={onClose}>{closeText}</Button>
					{#if onOk}
						<Button variant="text" onclick={handleOk}>{okText}</Button>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
