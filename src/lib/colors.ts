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
