import { driveService } from '$lib/api/services';
import { JobState, type Job, type JobFailure } from '$lib/api/types';

/**
 * Poll an import job until it finishes or aborts, reporting every status along the way.
 *
 * A timeout chain rather than `setInterval`, so a slow status request never overlaps the next.
 * Resolves with the final job (check `state` for ABORTED); rejects if a status fetch fails.
 */
export function pollJob(
	id: string,
	onUpdate?: (job: Job) => void,
	intervalMs = 1000
): Promise<Job> {
	return new Promise((resolve, reject) => {
		const tick = async () => {
			try {
				const job = await driveService.getJobStatus(id);
				onUpdate?.(job);
				if (job.state === JobState.FINISHED || job.state === JobState.ABORTED) resolve(job);
				else setTimeout(tick, intervalMs);
			} catch (e) {
				reject(e);
			}
		};
		setTimeout(tick, intervalMs);
	});
}

// Server categories (plus the client-side `too-large` for an HTTP 413), in words.
const CATEGORY_LABELS: Record<string, string> = {
	hdr: 'HDR video',
	truncated: 'truncated file',
	'no-video-stream': 'no video stream',
	'not-video': 'not a video',
	'tool-error': 'transcoder error',
	'too-large': 'too large',
	error: 'error'
};

/** `"a.mov (HDR video), b.mp4 (truncated file)"` — which files failed, and why. */
export function failureSummary(failures: JobFailure[]): string {
	return failures.map((f) => `${f.name} (${CATEGORY_LABELS[f.category] ?? f.category})`).join(', ');
}

/** Phones record HDR (10-bit HLG/PQ) by default, which the transcoder rejects. */
export const HDR_HINT = "Turn off HDR video in the phone's camera settings and re-export.";

export const hasHdrFailure = (failures: JobFailure[]) => failures.some((f) => f.category === 'hdr');
