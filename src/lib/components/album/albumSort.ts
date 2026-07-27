import { PhotoOrder } from '$lib/api/types';
import type { SelectOption } from '$lib/components/ui/Select.svelte';

// Display order matches the React app: None, Original Date, Upload Date, Manual —
// deliberately not numeric order (UploadDate = 1, OriginalDate = 2).
export const SORT_OPTIONS: SelectOption[] = [
	{ value: String(PhotoOrder.None), label: 'None' },
	{ value: String(PhotoOrder.OriginalDate), label: 'Original Date' },
	{ value: String(PhotoOrder.UploadDate), label: 'Upload Date' },
	{ value: String(PhotoOrder.ManualOrder), label: 'Manual' }
];

const TEXTAREA_CLASS =
	'w-full rounded border border-gray-300 bg-transparent px-3 py-2 text-gray-900 ' +
	'placeholder:text-gray-600 hover:border-gray-900 focus:border-blue-500 focus:outline-none ' +
	'dark:border-gray-600 dark:text-white dark:hover:border-white';

export { TEXTAREA_CLASS };
