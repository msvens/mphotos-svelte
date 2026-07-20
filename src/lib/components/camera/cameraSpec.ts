import type { Camera } from '$lib/api/types';

/** Human-readable labels for camera spec keys. Verbatim from the React CameraDetail. */
const NAME_MAP: Record<string, string> = {
	model: 'Model',
	make: 'Make',
	year: 'Year',
	effectivePixels: 'Effective Pixels',
	totalPixels: 'Total Pixels',
	sensorSize: 'Sensor Size',
	sensorType: 'Sensor Type',
	sensorResolution: 'Sensor Resolution',
	imageResolution: 'Image Resolution',
	cropFactor: 'Crop Factor',
	opticalZoom: 'Optical Zoom',
	digitalZoom: 'Digital Zoom',
	iso: 'ISO',
	raw: 'Supports Raw',
	manualFocus: 'Manual Focus',
	focusRange: 'Focus Range',
	macroFocusRange: 'Macro Focus Range',
	focalLengthEquiv: 'Focal Length Equiv',
	aperturePriority: 'Aperture Priority',
	maxAperture: 'Max Aperture',
	maxApertureEquiv: 'Max Aperture Equiv',
	metering: 'Metering',
	exposureComp: 'Exposure Comp',
	shutterPriority: 'Shutter Priority',
	minShutterSpeed: 'Min Shutter Speed',
	maxShutterSpeed: 'Max Shutter Speed',
	builtInFlash: 'Built In Flash',
	externalFlash: 'External Flash',
	viewFinder: 'View Finder',
	videoCapture: 'Video Capture',
	maxVideoResolution: 'Max Video Resolution',
	gps: 'GPS'
};

const BOOLEAN_KEYS = new Set([
	'digitalZoom',
	'raw',
	'manualFocus',
	'aperturePriority',
	'shutterPriority',
	'builtInFlash',
	'externalFlash',
	'videoCapture',
	'gps'
]);

/** The display label for a spec key, falling back to the key itself. */
export function displayName(key: string): string {
	return NAME_MAP[key] ?? key;
}

/**
 * Format a spec value for display. Booleans → Yes/No; megapixels → `${n}M`; optical zoom → `${n}x`;
 * focus ranges → `${n} cm`; zeros are suppressed (empty string). Empty/nullish → empty string.
 */
export function formatValue(key: string, value: unknown): string {
	if (value === null || value === undefined || value === '') return '';

	if (BOOLEAN_KEYS.has(key)) return value ? 'Yes' : 'No';

	switch (key) {
		case 'year':
			return value === 0 ? '' : String(value);
		case 'effectivePixels':
		case 'totalPixels':
			return value === 0 ? '' : `${(value as number) / 1000000}M`;
		case 'cropFactor':
			return value === 0 ? '' : String(value);
		case 'opticalZoom':
			return value === 0 ? '' : `${value}x`;
		case 'focusRange':
		case 'macroFocusRange':
			return value === 0 ? '' : `${value} cm`;
		default:
			return String(value);
	}
}

export interface CameraSpec {
	key: string;
	displayName: string;
	value: string;
}

/**
 * The camera's specs as display rows: every field except `id` and `image`, formatted, with empty
 * values dropped. Order follows the object's own key order (matches the React table).
 */
export function buildSpecs(camera: Camera): CameraSpec[] {
	return Object.keys(camera)
		.filter((key) => key !== 'id' && key !== 'image')
		.map((key) => ({
			key,
			displayName: displayName(key),
			value: formatValue(key, camera[key as keyof Camera])
		}))
		.filter((spec) => spec.value !== '');
}
