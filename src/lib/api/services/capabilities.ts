import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Capabilities } from '../types';

export const capabilitiesService = {
	/** Public and Drive-independent: what the server can do (e.g. transcode video). */
	async getCapabilities(): Promise<Capabilities> {
		return api.get<Capabilities>(API_ENDPOINTS.capabilities);
	}
};
