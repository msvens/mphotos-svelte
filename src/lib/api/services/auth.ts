import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface AuthUser {
	authenticated: boolean;
}

export interface LoginRequest {
	password: string;
}

export type AuthMethod = 'password' | 'google';

export interface AuthMethodResponse {
	method: AuthMethod;
}

export interface AuthService {
	login(password: string): Promise<AuthUser>;
	logout(): Promise<AuthUser>;
	isLoggedIn(): Promise<boolean>;
	getAuthMethod(): Promise<AuthMethod>;
}

export const authService: AuthService = {
	async login(password: string): Promise<AuthUser> {
		const response = await api.post<AuthUser>(API_ENDPOINTS.login, { password });
		return response;
	},

	async logout(): Promise<AuthUser> {
		// Match the old implementation exactly - return AuthUser and handle response
		const response = await api.get<AuthUser>(API_ENDPOINTS.logout);
		return response;
	},

	async isLoggedIn(): Promise<boolean> {
		try {
			const response = await api.get<AuthUser>(API_ENDPOINTS.loggedIn);
			return response.authenticated;
		} catch {
			return false;
		}
	},

	async getAuthMethod(): Promise<AuthMethod> {
		const response = await api.get<AuthMethodResponse>(API_ENDPOINTS.authMethod);
		return response.method;
	}
};
