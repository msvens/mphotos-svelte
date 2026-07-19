import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { camerasService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera } from '$lib/api/types';
import UpdateCameraDialog from './UpdateCameraDialog.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	camerasService: { updateCamera: vi.fn() }
}));

function makeCamera(over: Partial<Camera> = {}): Camera {
	return {
		id: 'nikon-z6',
		model: 'Z6',
		make: 'Nikon',
		year: 2018,
		iso: '100',
		gps: false,
		image: 'x',
		...over
	} as Camera;
}

function ownerState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	return s;
}

function open(props: Record<string, unknown> = {}) {
	const onClose = vi.fn();
	const onUpdate = vi.fn();
	const result = renderWithApp(UpdateCameraDialog, {
		state: ownerState(),
		props: { camera: makeCamera(), open: true, onClose, onUpdate, ...props }
	});
	return { ...result, onClose, onUpdate };
}

beforeEach(() => {
	vi.mocked(camerasService.updateCamera).mockReset().mockResolvedValue(makeCamera());
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('UpdateCameraDialog', () => {
	it('shows make and model read-only, not as editable fields', () => {
		open();
		expect(screen.getByText('Nikon')).toBeInTheDocument();
		expect(screen.getByText('Z6')).toBeInTheDocument();
		expect(screen.queryByLabelText('Make')).toBeNull();
		expect(screen.queryByLabelText('Model')).toBeNull();
	});

	it('renders booleans as selects and strings/numbers as text fields', () => {
		open();
		expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0); // gps
		expect(screen.getByLabelText('Year')).toBeInTheDocument();
		expect(screen.getByLabelText('ISO')).toBeInTheDocument();
	});

	it('coerces numeric fields and submits', async () => {
		const { onUpdate } = open();

		await fireEvent.input(screen.getByLabelText('Year'), { target: { value: '2020' } });
		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		await vi.waitFor(() => expect(camerasService.updateCamera).toHaveBeenCalled());
		const [id, body] = vi.mocked(camerasService.updateCamera).mock.calls[0];
		expect(id).toBe('nikon-z6');
		expect(body.year).toBe(2020); // number, not the string '2020'
		expect(onUpdate).toHaveBeenCalled();
	});

	it('toasts on failure', async () => {
		vi.mocked(camerasService.updateCamera).mockRejectedValue(new Error('boom'));
		const { toast } = open();

		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
	});
});
