import { api } from '../client';
import type { AuthUser, DriveFiles, Job } from '../types';

export const driveService = {
	async isAuthenticated(): Promise<boolean> {
		const result = await api.get<AuthUser>('/api/drive/authenticated');
		return result.authenticated;
	},

	async disconnectDrive(): Promise<AuthUser> {
		return api.get<AuthUser>('/api/drive/disconnect');
	},

	async checkDrive(): Promise<DriveFiles> {
		return api.get<DriveFiles>('/api/drive/check');
	},

	async scheduleAddPhotosJob(): Promise<Job> {
		return api.post<Job>('/api/drive/job/schedule');
	},

	async getJobStatus(jobId: string): Promise<Job> {
		return api.get<Job>(`/api/drive/job/${jobId}`);
	}
};
