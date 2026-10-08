import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Job } from '../types';

/** Import jobs, whatever started them: a Drive sync or a local video upload. */
export const jobsService = {
	async getJobStatus(jobId: string): Promise<Job> {
		return api.get<Job>(API_ENDPOINTS.job(jobId));
	},

	/**
	 * Ask the server to stop a queued or running job. The returned snapshot may still read
	 * SCHEDULED/STARTED; keep polling until it reads CANCELLED.
	 */
	async cancelJob(jobId: string): Promise<Job> {
		return api.put<Job>(API_ENDPOINTS.jobCancel(jobId));
	}
};
