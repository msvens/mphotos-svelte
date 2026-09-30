import { describe, it, expect, vi } from 'vitest';
import { api } from '../../../api/client';
import { capabilitiesService } from '../../../api/services/capabilities';

vi.mock('../../../api/client', () => ({
	api: { get: vi.fn() }
}));

describe('capabilitiesService', () => {
	it('getCapabilities fetches the capabilities endpoint', async () => {
		vi.mocked(api.get).mockResolvedValue({ videoEnabled: true });
		expect(await capabilitiesService.getCapabilities()).toEqual({ videoEnabled: true });
		expect(api.get).toHaveBeenCalledWith('/api/capabilities');
	});
});
