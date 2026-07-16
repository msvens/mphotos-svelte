<script lang="ts">
	import { onMount } from 'svelte';
	import { albumsService } from '$lib/api/services';
	import { getAppState, defaultUXConfig } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { Colors } from '$lib/colors';
	import type { Album, UXConfig } from '$lib/api/types';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select, { type SelectOption } from '$lib/components/ui/Select.svelte';
	import RadioGroup, { type RadioOption } from '$lib/components/ui/RadioGroup.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';

	const app = getAppState();
	const toast = getToastState();

	const MIN_COLS = 1;
	const MAX_COLS = 12;

	const gridSpacings: SelectOption[] = [
		{ value: '0', label: 'None' },
		{ value: '5', label: 'Thin' },
		{ value: '10', label: 'Normal' },
		{ value: '15', label: 'Thick' }
	];

	const backgrounds: RadioOption[] = [
		{ value: Colors.White, label: 'White' },
		{ value: Colors.Light, label: 'Light' },
		{ value: Colors.Grey, label: 'Grey' },
		{ value: Colors.Dark, label: 'Dark' },
		{ value: Colors.Black, label: 'Black' }
	];

	const borderOptions: RadioOption[] = [
		{ value: 'none', label: 'None' },
		{ value: 'left-right', label: 'Left-Right' },
		{ value: 'all', label: 'All' }
	];

	const themeOptions: RadioOption[] = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	// Each field is *seeded* from the store and re-seeded whenever it changes: editing a
	// control overrides the derived value, and saving (which reassigns `app.uxConfig`)
	// drops the overrides. That's the rune equivalent of the React original's
	// `useEffect(..., [uxConfig])` reset — no effect, no bookkeeping.
	//
	// Note this differs from Profile.svelte, which seeds `$state` once and never re-syncs.
	// That's deliberate on both sides: React's Profile has no reset effect; UX Config does.
	// `number | undefined`, not string: `bind:value` on a number input coerces for us, and
	// yields `undefined` while the field is empty — which is exactly the intermediate state
	// the React original couldn't express (`Number(value) || 1` snapped it to 1 per keystroke).
	let cols: number | undefined = $derived(app.uxConfig.photoGridCols);
	let gridSpacing = $derived(String(app.uxConfig.photoGridSpacing));
	let albumId = $derived(app.uxConfig.photoStreamAlbumId);
	let showBio = $derived(app.uxConfig.showBio);
	let denseTopBar = $derived(app.uxConfig.denseTopBar);
	let denseBottomBar = $derived(app.uxConfig.denseBottomBar);
	let photoBackground = $derived(app.uxConfig.photoBackgroundColor);
	let photoBorders = $derived(app.uxConfig.photoBorders);
	let theme = $derived(app.uxConfig.colorTheme);

	let albums = $state<Album[]>([]);
	let saving = $state(false);

	let albumOptions = $derived(albums.map((a) => ({ value: a.id, label: a.name })));

	onMount(async () => {
		try {
			albums = await albumsService.getAlbums();
		} catch (e) {
			console.error('Error fetching albums:', e);
		}
	});

	/** Empty or nonsense falls back to the default; anything else is clamped to 1–12. */
	function clampCols(input: number | undefined): number {
		if (input === undefined || !Number.isFinite(input)) return defaultUXConfig.photoGridCols;
		return Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(input)));
	}

	async function handleUpdate() {
		saving = true;
		try {
			const config: UXConfig = {
				photoGridCols: clampCols(cols),
				photoGridSpacing: Number(gridSpacing),
				// Neither has a control; carry the stored value through untouched.
				photoItemsLoad: app.uxConfig.photoItemsLoad,
				windowFullScreen: app.uxConfig.windowFullScreen,
				showBio,
				photoBackgroundColor: photoBackground,
				colorTheme: theme,
				denseTopBar,
				denseBottomBar,
				photoBorders,
				photoStreamAlbumId: albumId
			};
			await app.updateUXConfig(config);
			toast.success('Configuration saved successfully');
		} catch (error) {
			console.error('Error saving config:', error);
			toast.error('Failed to save configuration');
		} finally {
			saving = false;
		}
	}
</script>

<div class="max-w-2xl space-y-6">
	<TextField
		id="cols"
		label="Grid Columns"
		bind:value={cols}
		type="number"
		min={MIN_COLS}
		max={MAX_COLS}
		step="1"
		fullWidth
	/>

	<Select
		id="gridSpacing"
		label="Grid Spacing"
		bind:value={gridSpacing}
		options={gridSpacings}
		fullWidth
	/>

	<Select
		id="photoStreamAlbum"
		label="Photostream Album"
		bind:value={albumId}
		options={albumOptions}
		placeholder="Select an album..."
		fullWidth
	/>

	<div class="grid grid-cols-3 gap-4 py-4">
		<ToggleSwitch bind:checked={showBio} label="Show Bio" />
		<ToggleSwitch bind:checked={denseTopBar} label="Dense Topbar" />
		<ToggleSwitch bind:checked={denseBottomBar} label="Dense Bottombar" />
	</div>

	<div class="grid grid-cols-3 gap-8 py-4">
		<RadioGroup label="Photo Background" bind:value={photoBackground} options={backgrounds} />
		<RadioGroup label="Photo Borders" bind:value={photoBorders} options={borderOptions} />
		<RadioGroup label="Site Theme" bind:value={theme} options={themeOptions} />
	</div>

	<div class="pt-4">
		<Button onclick={handleUpdate} disabled={saving}>
			{saving ? 'SAVING...' : 'SAVE CONFIG'}
		</Button>
	</div>
</div>
