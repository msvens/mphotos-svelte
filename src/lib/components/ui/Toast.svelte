<script lang="ts">
	import {
		Icon,
		CheckCircle,
		ExclamationCircle,
		ExclamationTriangle,
		InformationCircle,
		XMark,
		type IconSource
	} from 'svelte-hero-icons';
	import type { ToastSeverity } from '$lib/stores/toast.svelte';

	interface ToastProps {
		id: string;
		message: string;
		severity?: ToastSeverity;
		autoHideDuration?: number;
		onClose: (id: string) => void;
	}

	let { id, message, severity = 'info', autoHideDuration = 6000, onClose }: ToastProps = $props();

	const severityConfig: Record<ToastSeverity, { bg: string; icon: IconSource }> = {
		success: { bg: 'bg-blue-600', icon: CheckCircle },
		error: { bg: 'bg-red-600', icon: ExclamationCircle },
		warning: { bg: 'bg-orange-600', icon: ExclamationTriangle },
		info: { bg: 'bg-blue-600', icon: InformationCircle }
	};

	let config = $derived(severityConfig[severity]);

	// Self-dismiss. The cleanup clears the timer on unmount, so a toast removed
	// early (via the close button) can't fire onClose again.
	$effect(() => {
		if (!autoHideDuration || autoHideDuration <= 0) return;
		const timer = setTimeout(() => onClose(id), autoHideDuration);
		return () => clearTimeout(timer);
	});
</script>

<div
	role="alert"
	class="toast-enter flex max-w-[568px] min-w-[288px] items-center gap-3 rounded px-4 py-3 text-white shadow-xl {config.bg}"
>
	<Icon src={config.icon} class="h-6 w-6 flex-shrink-0 text-white" />
	<div class="flex-1 text-sm">{message}</div>
	<button
		onclick={() => onClose(id)}
		aria-label="Close"
		class="pointer-events-auto flex-shrink-0 cursor-pointer text-white transition-colors hover:text-gray-300"
	>
		<Icon src={XMark} class="h-5 w-5" />
	</button>
</div>

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.toast-enter {
		animation: slide-in 0.3s ease-out;
	}
</style>
