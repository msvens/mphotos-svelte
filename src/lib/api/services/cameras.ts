import type { Camera } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export type CameraImageSize = '48' | '192' | '512' | 'original';

export interface CamerasService {
	getCameras(): Promise<Camera[]>;
	getCamera(name: string): Promise<Camera>;
	createCamera(camera: Partial<Camera>): Promise<Camera>;
	updateCamera(name: string, camera: Partial<Camera>): Promise<Camera>;
	deleteCamera(name: string): Promise<void>;
	uploadCameraImage(name: string, file: File): Promise<Camera>;
	updateCameraImageUrl(name: string, url: string): Promise<Camera>;
	getCameraImageUrl(camera: Camera, size?: CameraImageSize): string;
}

export const camerasService: CamerasService = {
	async getCameras() {
		return api.get<Camera[]>(API_ENDPOINTS.cameras);
	},

	async getCamera(name: string) {
		return api.get<Camera>(API_ENDPOINTS.camera(name));
	},

	async createCamera(camera: Partial<Camera>) {
		return api.post<Camera>(API_ENDPOINTS.cameras, camera);
	},

	async updateCamera(name: string, camera: Partial<Camera>) {
		return api.put<Camera>(API_ENDPOINTS.camera(name), camera);
	},

	async deleteCamera(name: string) {
		return api.delete(API_ENDPOINTS.camera(name));
	},

	async uploadCameraImage(name: string, file: File) {
		const formData = new FormData();
		formData.append('cameraImage', file, file.name);
		return api.post<Camera>(API_ENDPOINTS.cameraImage(name), formData);
	},

	async updateCameraImageUrl(name: string, url: string) {
		return api.put<Camera>(API_ENDPOINTS.cameraImage(name), { url });
	},

	getCameraImageUrl(camera: Camera, size: CameraImageSize = 'original') {
		if (camera.image === '') {
			return '/camera-outline.png';
		}
		if (size === 'original') {
			return API_ENDPOINTS.cameraImage(camera.id);
		}
		return `${API_ENDPOINTS.cameraImage(camera.id)}/${size}`;
	}
};
