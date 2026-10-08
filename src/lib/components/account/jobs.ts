import { jobsService } from '$lib/api/services';
import { JobState, type Job, type JobFailure } from '$lib/api/types';

const ENDED = [JobState.FINISHED, JobState.ABORTED, JobState.CANCELLED];

/** Whether the job will change no more: finished, failed (aborted) or stopped (cancelled). */
export const hasEnded = (job: Job) => ENDED.includes(job.state);

/**
 * Poll an import job until it ends (finished, aborted or cancelled), reporting every status.
 *
 * A timeout chain rather than `setInterval`, so a slow status request never overlaps the next.
 * Resolves with the final job (check `state`); rejects if a status fetch fails.
 */
export function pollJob(
	id: string,
	onUpdate?: (job: Job) => void,
	intervalMs = 1000
): Promise<Job> {
	return new Promise((resolve, reject) => {
		const tick = async () => {
			try {
				const job = await jobsService.getJobStatus(id);
				onUpdate?.(job);
				if (hasEnded(job)) resolve(job);
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
