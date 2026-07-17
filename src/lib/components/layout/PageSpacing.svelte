<script lang="ts">
	type Spacing = 'none' | 'small' | 'default' | 'large';

	interface PageSpacingProps {
		/** Top breathing room below the (self-clearing) sticky navbar. */
		height?: Spacing;
		class?: string;
	}

	let { height = 'default', class: cls = '' }: PageSpacingProps = $props();

	// Aligned with Section's scale (sm/md/lg = 16/32/48). `default` (32px) preserves the
	// spacing the site shipped with. The navbar clears itself now, so this is pure breathing
	// room — no navbar-height math here any more.
	const spacing: Record<Spacing, string> = {
		none: '0',
		small: '16px',
		default: '32px',
		large: '48px'
	};

	let resolved = $derived(spacing[height]);
</script>

<div style="height: {resolved}" class={cls}></div>
