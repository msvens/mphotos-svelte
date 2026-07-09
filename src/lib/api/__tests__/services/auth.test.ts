import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { authService } from '../../../api/services/auth';
import { API_ENDPOINTS } from '../../../api/config';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

describe('authService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
	});

	describe('login', () => {
		it('posts password to login endpoint', async () => {
			vi.mocked(api.post).mockResolvedValue({ authenticated: true });
			const result = await authService.login('secret');
			expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.login, { password: 'secret' });
			expect(result).toEqual({ authenticated: true });
		});

		it('propagates errors on failed login', async () => {
			vi.mocked(api.post).mockRejectedValue(new Error('Unauthorized'));
			await expect(authService.login('wrong')).rejects.toThrow('Unauthorized');
		});
	});

	describe('logout', () => {
		it('calls logout endpoint', async () => {
			vi.mocked(api.get).mockResolvedValue({ authenticated: false });
			const result = await authService.logout();
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.logout);
			expect(result).toEqual({ authenticated: false });
		});
	});

	describe('isLoggedIn', () => {
		it('returns true when authenticated', async () => {
			vi.mocked(api.get).mockResolvedValue({ authenticated: true });
			const result = await authService.isLoggedIn();
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.loggedIn);
			expect(result).toBe(true);
		});

		it('returns false when not authenticated', async () => {
			vi.mocked(api.get).mockResolvedValue({ authenticated: false });
			expect(await authService.isLoggedIn()).toBe(false);
		});

		it('returns false on error', async () => {
			vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
			expect(await authService.isLoggedIn()).toBe(false);
		});
	});

	describe('getAuthMethod', () => {
		it('returns "password" when API responds with password method', async () => {
			vi.mocked(api.get).mockResolvedValue({ method: 'password' });
			const result = await authService.getAuthMethod();
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.authMethod);
			expect(result).toBe('password');
		});

		it('returns "google" when API responds with google method', async () => {
			vi.mocked(api.get).mockResolvedValue({ method: 'google' });
			const result = await authService.getAuthMethod();
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.authMethod);
			expect(result).toBe('google');
		});

		it('propagates errors when the endpoint fails', async () => {
			vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
			await expect(authService.getAuthMethod()).rejects.toThrow('Network error');
		});
	});
});
