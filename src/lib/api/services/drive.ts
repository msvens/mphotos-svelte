import { api } from '../client';
import type { AuthUser, DriveCheck, Job } from '../types';

export const driveService = {
	async isAuthenticated(): Promise<boolean> {
		const result = await api.get<AuthUser>('/api/drive/authenticated');
		return result.authenticated;
	},

	async disconnectDrive(): Promise<AuthUser> {
		return api.get<AuthUser>('/api/drive/disconnect');
	},

	async checkDrive(): Promise<DriveCheck> {
		return api.get<DriveCheck>('/api/drive/check');
	},

	async scheduleAddPhotosJob(): Promise<Job> {
		return api.post<Job>('/api/drive/job/schedule');
	},

	// Videos sync on their own server worker, so a transcode never blocks an image import.
	async scheduleAddVideosJob(): Promise<Job> {
		return api.post<Job>('/api/drive/video/job/schedule');
	},

	async getJobStatus(jobId: string): Promise<Job> {
		return api.get<Job>(`/api/drive/job/${jobId}`);
	}
};
