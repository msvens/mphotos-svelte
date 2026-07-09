import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS, createApiUrl } from '../config';

describe('API_ENDPOINTS', () => {
	it('has correct static endpoints', () => {
		expect(API_ENDPOINTS.login).toBe('/api/login');
		expect(API_ENDPOINTS.logout).toBe('/api/logout');
		expect(API_ENDPOINTS.loggedIn).toBe('/api/loggedin');
		expect(API_ENDPOINTS.user).toBe('/api/user');
		expect(API_ENDPOINTS.photos).toBe('/api/photos');
		expect(API_ENDPOINTS.albums).toBe('/api/albums');
		expect(API_ENDPOINTS.cameras).toBe('/api/cameras');
		expect(API_ENDPOINTS.guest).toBe('/api/guest');
		expect(API_ENDPOINTS.comments).toBe('/api/comments');
	});

	it('builds correct parameterized photo endpoints', () => {
		expect(API_ENDPOINTS.photo('abc123')).toBe('/api/photos/abc123');
		expect(API_ENDPOINTS.photoFile('abc123')).toBe('/api/images/abc123.jpg');
		expect(API_ENDPOINTS.photoThumb('abc123')).toBe('/api/thumbs/abc123.jpg');
		expect(API_ENDPOINTS.photoLandscape('abc123')).toBe('/api/landscapes/abc123.jpg');
		expect(API_ENDPOINTS.photoPortrait('abc123')).toBe('/api/portraits/abc123.jpg');
		expect(API_ENDPOINTS.photoSquare('abc123')).toBe('/api/squares/abc123.jpg');
		expect(API_ENDPOINTS.photoResize('abc123')).toBe('/api/resizes/abc123.jpg');
	});

	it('builds correct parameterized album endpoints', () => {
		expect(API_ENDPOINTS.album('a1')).toBe('/api/albums/a1');
		expect(API_ENDPOINTS.albumPhotos('a1')).toBe('/api/albums/a1/photos');
		expect(API_ENDPOINTS.addAlbumPhotos('a1')).toBe('/api/albums/a1/photos/add');
		expect(API_ENDPOINTS.deleteAlbumPhotos('a1')).toBe('/api/albums/a1/photos/delete');
	});

	it('builds correct parameterized camera endpoints', () => {
		expect(API_ENDPOINTS.camera('nikon-z6')).toBe('/api/cameras/nikon-z6');
		expect(API_ENDPOINTS.cameraImage('nikon-z6')).toBe('/api/cameras/nikon-z6/image');
	});

	it('builds correct parameterized comment and like endpoints', () => {
		expect(API_ENDPOINTS.photoComments('p1')).toBe('/api/comments/p1');
		expect(API_ENDPOINTS.photoLikes('p1')).toBe('/api/likes/p1');
		expect(API_ENDPOINTS.likePhoto('p1')).toBe('/api/likes/p1/like');
		expect(API_ENDPOINTS.unlikePhoto('p1')).toBe('/api/likes/p1/unlike');
		expect(API_ENDPOINTS.guestLikePhoto('p1')).toBe('/api/guest/likes/p1');
	});
});

describe('createApiUrl', () => {
	it('builds absolute URL from endpoint', () => {
		const url = createApiUrl('/api/photos');
		expect(url).toContain('/api/photos');
		// jsdom provides window.location.origin as http://localhost
		expect(url).toMatch(/^http:\/\/localhost/);
	});

	it('appends query params', () => {
		const url = createApiUrl('/api/photos', {
			params: { limit: '10', offset: '5' }
		});
		expect(url).toContain('limit=10');
		expect(url).toContain('offset=5');
	});

	it('works without config', () => {
		const url = createApiUrl('/api/user');
		expect(url).toContain('/api/user');
	});
});
