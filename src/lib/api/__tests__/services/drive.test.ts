import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { driveService } from '../../../api/services/drive';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

describe('driveService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
	});

	it('isAuthenticated returns auth status', async () => {
		vi.mocked(api.get).mockResolvedValue({ authenticated: true });
		expect(await driveService.isAuthenticated()).toBe(true);
		expect(api.get).toHaveBeenCalledWith('/api/drive/authenticated');
	});

	it('disconnectDrive calls disconnect endpoint', async () => {
		vi.mocked(api.get).mockResolvedValue({ authenticated: false });
		await driveService.disconnectDrive();
		expect(api.get).toHaveBeenCalledWith('/api/drive/disconnect');
	});

	it('checkDrive fetches drive files', async () => {
		vi.mocked(api.get).mockResolvedValue({ files: [] });
		await driveService.checkDrive();
		expect(api.get).toHaveBeenCalledWith('/api/drive/check');
	});

	it('scheduleAddPhotosJob posts to schedule endpoint', async () => {
		vi.mocked(api.post).mockResolvedValue({ id: 'j1', state: 'SCHEDULED' });
		const result = await driveService.scheduleAddPhotosJob();
		expect(api.post).toHaveBeenCalledWith('/api/drive/job/schedule');
		expect(result.id).toBe('j1');
	});

	it('getJobStatus fetches job by id', async () => {
		vi.mocked(api.get).mockResolvedValue({ id: 'j1', state: 'FINISHED', percent: 100 });
		const result = await driveService.getJobStatus('j1');
		expect(api.get).toHaveBeenCalledWith('/api/drive/job/j1');
		expect(result.state).toBe('FINISHED');
	});
});
