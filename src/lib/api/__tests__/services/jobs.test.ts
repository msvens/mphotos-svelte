import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { jobsService } from '../../../api/services/jobs';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

describe('jobsService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.put).mockReset();
	});

	it('getJobStatus fetches the job by id', async () => {
		vi.mocked(api.get).mockResolvedValue({ id: 'j1', state: 'FINISHED' });
		const result = await jobsService.getJobStatus('j1');
		expect(api.get).toHaveBeenCalledWith('/api/jobs/j1');
		expect(result.state).toBe('FINISHED');
	});

	it('cancelJob puts to the cancel endpoint', async () => {
		vi.mocked(api.put).mockResolvedValue({ id: 'j1', state: 'STARTED' });
		await jobsService.cancelJob('j1');
		expect(api.put).toHaveBeenCalledWith('/api/jobs/j1/cancel');
	});
});
