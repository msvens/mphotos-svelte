import { getContext, setContext } from 'svelte';
import { authService, userService, guestsService } from '$lib/api/services';
import type { User, Guest, UXConfig } from '$lib/api/types';
import { Colors } from '$lib/colors';

export const defaultUXConfig: UXConfig = {
	photoStreamAlbumId: '',
	photoGridCols: 3,
	photoItemsLoad: 30,
	// 0 ("None") is the only sensible default: the UX Config dropdown offers 0/5/10/15,
	// so any other value renders as unset. mphotos-web used 0; the 1 came in with the
	// Next.js port and renders a meaningless 0.1rem gap.
	photoGridSpacing: 0,
	showBio: true,
	photoBackgroundColor: Colors.Black,
	photoBorders: 'none',
	colorTheme: 'dark',
	denseTopBar: false,
	denseBottomBar: false,
	windowFullScreen: false
};

export const defaultUser: User = { name: '', bio: '', pic: '' };

/**
 * App-wide auth, guest, and UX-config state.
 *
 * Holds only state + actions (no `$effect`) so it can be unit-tested by
 * instantiating it directly. The root layout owns the side effects (initial
 * load, applying the theme). Provide/consume it via the context helpers below.
 */
export class AppState {
	user = $state<User>(defaultUser);
	guest = $state<Guest | undefined>(undefined);
	uxConfig = $state<UXConfig>(defaultUXConfig);
	isUser = $state(false);
	isGuest = $state(false);
	loading = $state(true);

	#initialized = false;

	/** Refresh owner auth + public user + UX config. Never throws. */
	async refreshAuth() {
		try {
			const loggedIn = await authService.isLoggedIn();

			// Public user info is served whether or not the owner is logged in.
			try {
				this.user = await userService.getUser();
			} catch {
				this.user = defaultUser;
			}

			// Config is best-effort: fall back to defaults if it fails.
			try {
				this.uxConfig = { ...defaultUXConfig, ...(await userService.getUserConfig()) };
			} catch {
				this.uxConfig = defaultUXConfig;
			}

			this.isUser = loggedIn;
		} catch (e) {
			console.error('refreshAuth failed:', e);
			this.user = defaultUser;
			this.uxConfig = defaultUXConfig;
			this.isUser = false;
		} finally {
			this.loading = false;
		}
	}

	/** Refresh registered-guest state. Never throws. */
	async refreshGuest() {
		try {
			if (await guestsService.isGuest()) {
				this.guest = await guestsService.getGuest();
				this.isGuest = true;
			} else {
				this.guest = undefined;
				this.isGuest = false;
			}
		} catch (e) {
			console.error('refreshGuest failed:', e);
			this.guest = undefined;
			this.isGuest = false;
		}
	}

	async login(password: string) {
		await authService.login(password);
		await this.refreshAuth();
	}

	async logout() {
		try {
			await authService.logout();
		} catch (e) {
			console.error('logout failed:', e);
		} finally {
			this.user = defaultUser;
			this.isUser = false;
		}
	}

	/** Save UX config and adopt it locally. Throws on failure. */
	async updateUXConfig(config: UXConfig) {
		await userService.updateUserConfig(config);
		// Adopt what we sent, not what came back: the endpoint echoes the updated *User*,
		// not the config. The backend stores the payload verbatim, so this is the truth.
		this.uxConfig = { ...defaultUXConfig, ...config };
	}

	/** One-shot initial load; safe to call more than once. */
	async init() {
		if (this.#initialized) return;
		this.#initialized = true;
		await this.refreshAuth();
		await this.refreshGuest();
	}
}

/** Context key for the app state. Exported so tests can inject a controlled instance. */
export const APP_STATE_KEY = Symbol('app-state');

/** Create the app state and put it in context. Call once, in the root layout. */
export function setAppState(): AppState {
	const state = new AppState();
	setContext(APP_STATE_KEY, state);
	return state;
}

/** Read the app state from context. Call during component initialization. */
export function getAppState(): AppState {
	return getContext<AppState>(APP_STATE_KEY);
}
