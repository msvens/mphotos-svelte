import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import GuestAvatar from './GuestAvatar.svelte';

// Uses the real guestsService.getAvatarUrl (a pure URL builder) — no service mock needed.
describe('GuestAvatar', () => {
	it('renders the avatar image when the guest has one', () => {
		const { container } = render(GuestAvatar, {
			props: { guestId: 'g1', avatar: '.jpg', name: 'Ada', size: 48 }
		});
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img).toHaveAttribute('src', '/api/guest/avatar/g1/48');
		expect(img).toHaveAttribute('alt', 'Ada');
	});

	it('appends a cache-bust version when given', () => {
		const { container } = render(GuestAvatar, {
			props: { guestId: 'g1', avatar: '.jpg', size: 192, version: 3 }
		});
		expect(container.querySelector('img')).toHaveAttribute('src', '/api/guest/avatar/g1/192?v=3');
	});

	it('renders nothing when the guest has no avatar', () => {
		const { container } = render(GuestAvatar, { props: { guestId: 'g1', avatar: '' } });
		expect(container.querySelector('img')).toBeNull();
	});

	it('renders nothing without a guestId', () => {
		const { container } = render(GuestAvatar, { props: { avatar: '.jpg' } });
		expect(container.querySelector('img')).toBeNull();
	});

	it('hides the image on a load error, with no placeholder', async () => {
		const { container } = render(GuestAvatar, {
			props: { guestId: 'g1', avatar: '.jpg', name: 'Ada' }
		});
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		await fireEvent.error(img!);
		expect(container.querySelector('img')).toBeNull();
	});
});
