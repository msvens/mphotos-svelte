<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	let { class: cls = 'text-gray-900 dark:text-white', ...rest }: SVGAttributes<SVGSVGElement> =
		$props();
</script>

<svg class={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1085.68 1085.68" {...rest}>
	<rect
		fill="none"
		stroke="currentColor"
		stroke-miterlimit="10"
		stroke-width="6"
		x="3"
		y="3"
		width="1079.68"
		height="1079.68"
	/>
	<polyline
		fill="none"
		stroke="currentColor"
		stroke-miterlimit="10"
		stroke-width="13"
		points="335.78 881.23 184.09 881.23 184.09 681.32"
	/>
	<path
		fill="none"
		stroke="currentColor"
		stroke-miterlimit="10"
		stroke-width="13"
		d="M879.52,697.92q-19.24-17.83-50-17.84H750.21l-72.1,86.56L606,680.08H567.83V899.54h42.42V745.44h1.25L675,822.73h6l63.46-77.29h1.26V862.9l-1,36.64h43.42v-92h39.84q31.88,0,51.36-17.6t19.48-46Q898.76,715.75,879.52,697.92Zm-34.09,68.64q-9.51,7.79-26.47,7.78H788.08V713.23H816q39,0,39,30.32Q854.94,758.79,845.43,766.56Z"
		transform="translate(2.83 2.68)"
	/>
	<polyline
		fill="none"
		stroke="currentColor"
		stroke-miterlimit="10"
		stroke-width="13"
		points="731.74 183.46 883.43 183.46 883.43 383.37"
	/>
	<polyline
		fill="none"
		stroke="currentColor"
		stroke-miterlimit="10"
		stroke-width="13"
		points="335.78 183.46 184.09 183.46 184.09 383.37"
	/>
</svg>
