import { getContext, setContext } from 'svelte';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
	id: string;
	message: string;
	severity: ToastSeverity;
	autoHideDuration: number;
}

/**
 * Queue of transient notifications.
 *
 * Like `AppState`, this holds only state + actions (no `$effect`, no timers) so it
 * can be unit-tested by instantiating it directly. Auto-dismiss belongs to `<Toast>`,
 * which has the lifecycle the timer needs — and `$effect` never runs on the server,
 * so no timer can leak into a server render.
 */
export class ToastState {
	toasts = $state<ToastItem[]>([]);

	#seq = 0;

	/** Queue a toast. Returns its id so callers can dismiss it early. */
	showToast(message: string, severity: ToastSeverity = 'info', autoHideDuration = 6000): string {
		const id = `toast-${++this.#seq}`;
		this.toasts.push({ id, message, severity, autoHideDuration });
		return id;
	}

	success(message: string, autoHideDuration?: number) {
		return this.showToast(message, 'success', autoHideDuration);
	}

	error(message: string, autoHideDuration?: number) {
		return this.showToast(message, 'error', autoHideDuration);
	}

	warning(message: string, autoHideDuration?: number) {
		return this.showToast(message, 'warning', autoHideDuration);
	}

	info(message: string, autoHideDuration?: number) {
		return this.showToast(message, 'info', autoHideDuration);
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

/** Context key for the toast state. Exported so tests can inject a controlled instance. */
export const TOAST_STATE_KEY = Symbol('toast-state');

/** Create the toast state and put it in context. Call once, in the root layout. */
export function setToastState(): ToastState {
	const state = new ToastState();
	setContext(TOAST_STATE_KEY, state);
	return state;
}

/** Read the toast state from context. Call during component initialization. */
export function getToastState(): ToastState {
	return getContext<ToastState>(TOAST_STATE_KEY);
}
