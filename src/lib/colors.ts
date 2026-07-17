/**
 * Photo background color choices offered in UX Config.
 *
 * A const object rather than a TS `enum`: enums emit a runtime IIFE that doesn't
 * tree-shake and create a dual value/type namespace. `UXConfig.photoBackgroundColor`
 * is typed `string` at the API boundary anyway.
 */
export const Colors = {
	White: '#ffffff',
	Light: '#fafafa',
	Grey: '#bdbdbd',
	Dark: '#303030',
	Black: '#121212' // Match dark theme background
} as const;

export type ColorValue = (typeof Colors)[keyof typeof Colors];

export interface ColorScheme {
	backgroundColor: string;
	color: string;
}

const LightBackgroundText = '#000000';
const DarkBackgroundText = '#ffffff';

/**
 * Pick readable text for a photo background.
 *
 * Matches the five palette values exactly, as lowercase 6-digit hex. Anything else —
 * `'#FFFFFF'`, `'#fff'`, `'black'` — falls back to Light and **discards** the requested
 * background. Only reachable via a hand-edited config: the UX Config picker only ever
 * emits these five. That fallback is also what keeps `alpha()` safe (see below), so
 * don't loosen one without the other.
 */
export function colorScheme(backgroundColor: string): ColorScheme {
	switch (backgroundColor) {
		case Colors.White:
		case Colors.Light:
		case Colors.Grey:
			return { backgroundColor, color: LightBackgroundText };
		case Colors.Dark:
		case Colors.Black:
			return { backgroundColor, color: DarkBackgroundText };
		default:
			return { backgroundColor: Colors.Light, color: LightBackgroundText };
	}
}

/**
 * Add an alpha channel to a hex color.
 *
 * Assumes 6-digit hex — `alpha('#fff', 0.5)` yields `rgba(NaN, NaN, NaN, 0.5)`. Safe in
 * practice because it is only ever handed a `ColorScheme.backgroundColor`, which
 * `colorScheme` guarantees is one of the five palette values.
 */
export function alpha(color: string, opacity: number): string {
	const hex = color.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
