import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, ApiError, api, uploadFile } from '../client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: () => Promise.resolve(JSON.stringify(body))
	} as Response;
}

describe('apiRequest', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('extracts data field from successful response', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: { id: '123', name: 'test' } }));
		const result = await apiRequest<{ id: string; name: string }>('/api/photos/123');
		expect(result).toEqual({ id: '123', name: 'test' });
	});

	it('returns entire response when no data field', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ authenticated: true }));
		const result = await apiRequest<{ authenticated: boolean }>('/api/loggedin');
		expect(result).toEqual({ authenticated: true });
	});

	it('throws ApiError when response contains error field', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: { code: 404, message: 'Not found' } }));
		await expect(apiRequest('/api/photos/missing')).rejects.toThrow(ApiError);
		mockFetch.mockResolvedValue(jsonResponse({ error: { code: 404, message: 'Not found' } }));
		await expect(apiRequest('/api/photos/missing')).rejects.toMatchObject({
			status: 404,
			message: 'Not found'
		});
	});

	it('throws ApiError on non-ok HTTP status', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500
		} as Response);
		await expect(apiRequest('/api/photos')).rejects.toThrow(ApiError);
		await expect(apiRequest('/api/photos')).rejects.toMatchObject({ status: 500 });
	});

	it('throws on non-JSON response', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve('<html>not json</html>')
		} as Response);
		await expect(apiRequest('/api/photos')).rejects.toThrow('Response was not valid JSON');
	});

	it('sends GET request by default', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: [] }));
		await apiRequest('/api/photos');
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('sends JSON body with Content-Type header', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: { authenticated: true } }));
		await apiRequest('/api/login', { method: 'POST', body: { password: 'secret' } });
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'secret' })
			})
		);
	});

	it('does not set Content-Type for FormData body', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
		const formData = new FormData();
		formData.append('file', new Blob(['test']), 'test.jpg');
		await apiRequest('/api/upload', { method: 'POST', body: formData });
		const callArgs = mockFetch.mock.calls[0][1];
		expect(callArgs.headers).toBeUndefined();
		expect(callArgs.body).toBeInstanceOf(FormData);
	});

	it('builds correct URL with origin', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
		await apiRequest('/api/photos');
		const calledUrl = mockFetch.mock.calls[0][0];
		expect(calledUrl).toContain('/api/photos');
	});
});

describe('api convenience methods', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
	});

	it('api.get uses GET method', async () => {
		await api.get('/api/photos');
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('api.post uses POST method with body', async () => {
		await api.post('/api/login', { password: 'test' });
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ password: 'test' })
			})
		);
	});

	it('api.put uses PUT method with body', async () => {
		await api.put('/api/user', { name: 'test' });
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: 'PUT',
				body: JSON.stringify({ name: 'test' })
			})
		);
	});

	it('api.delete uses DELETE method', async () => {
		await api.delete('/api/photos/123');
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: 'DELETE' })
		);
	});
});

describe('uploadFile', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('uploads file as FormData POST', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
		const file = new File(['photo-data'], 'photo.jpg', { type: 'image/jpeg' });
		await uploadFile('/api/upload', file);
		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/upload');
		expect(options.method).toBe('POST');
		expect(options.body).toBeInstanceOf(FormData);
	});
});
