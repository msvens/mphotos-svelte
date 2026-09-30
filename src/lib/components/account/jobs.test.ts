import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { driveService } from '$lib/api/services';
import { JobState, type Job } from '$lib/api/types';
import { failureSummary, hasHdrFailure, pollJob } from './jobs';

vi.mock('$lib/api/services', () => ({
	driveService: { getJobStatus: vi.fn() }
}));

const job = (state: JobState, over: Partial<Job> = {}): Job => ({
	id: 'j1',
	kind: 'video',
	state,
	percent: 0,
	numFiles: 1,
	numProcessed: 0,
	numAdded: 0,
	numSkipped: 0,
	numFailed: 0,
	...over
});

beforeEach(() => {
	vi.useFakeTimers();
	vi.mocked(driveService.getJobStatus).mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('pollJob', () => {
	it('reports each status and resolves when the job finishes', async () => {
		vi.mocked(driveService.getJobStatus)
			.mockResolvedValueOnce(job(JobState.STARTED))
			.mockResolvedValueOnce(job(JobState.FINISHED, { numAdded: 1 }));
		const onUpdate = vi.fn();

		const done = pollJob('j1', onUpdate, 500);
		await vi.advanceTimersByTimeAsync(1000);

		await expect(done).resolves.toMatchObject({ state: JobState.FINISHED, numAdded: 1 });
		expect(driveService.getJobStatus).toHaveBeenCalledTimes(2);
		expect(driveService.getJobStatus).toHaveBeenCalledWith('j1');
		expect(onUpdate).toHaveBeenCalledTimes(2);
	});

	it('resolves (not rejects) on an aborted job, so the caller can read its error', async () => {
		vi.mocked(driveService.getJobStatus).mockResolvedValueOnce(
			job(JobState.ABORTED, { error: { code: 500, message: 'boom' } })
		);

		const done = pollJob('j1', undefined, 500);
		await vi.advanceTimersByTimeAsync(500);

		await expect(done).resolves.toMatchObject({ state: JobState.ABORTED });
	});

	it('stops polling and rejects when a status fetch fails', async () => {
		vi.mocked(driveService.getJobStatus).mockRejectedValueOnce(new Error('offline'));

		const done = pollJob('j1', undefined, 500);
		const assertion = expect(done).rejects.toThrow('offline');
		await vi.advanceTimersByTimeAsync(2000);

		await assertion;
		expect(driveService.getJobStatus).toHaveBeenCalledTimes(1);
	});
});

describe('failureSummary', () => {
	it('names each file with a readable reason', () => {
		expect(
			failureSummary([
				{ name: 'a.mov', category: 'hdr' },
				{ name: 'b.mp4', category: 'truncated' }
			])
		).toBe('a.mov (HDR video), b.mp4 (truncated file)');
	});

	it('falls back to the raw category when it is unknown', () => {
		expect(failureSummary([{ name: 'c.avi', category: 'mystery' }])).toBe('c.avi (mystery)');
	});
});

describe('hasHdrFailure', () => {
	it('detects an HDR failure', () => {
		expect(hasHdrFailure([{ name: 'a.mov', category: 'hdr' }])).toBe(true);
		expect(hasHdrFailure([{ name: 'a.mov', category: 'truncated' }])).toBe(false);
	});
});
