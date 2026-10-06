import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { isSupported, md5File } from './localScan';

const file = (name: string, type: string) => new File(['x'], name, { type });

describe('md5File', () => {
	it('hashes an empty file without reporting bytes', async () => {
		const onBytes = vi.fn();
		expect(await md5File(new File([], 'empty.jpg'), onBytes)).toBe(
			'd41d8cd98f00b204e9800998ecf8427e'
		);
		expect(onBytes).not.toHaveBeenCalled();
	});

	it('produces lowercase hex', async () => {
		expect(await md5File(new File(['abc'], 'a.jpg'))).toBe('900150983cd24fb0d6963f7d28e17f72');
	});

	it('gives the same digest when read in chunks', async () => {
		const onBytes = vi.fn();
		expect(await md5File(new File(['abc'], 'a.jpg'), onBytes, 1)).toBe(
			'900150983cd24fb0d6963f7d28e17f72'
		);
		expect(onBytes.mock.calls).toEqual([[1], [1], [1]]);
	});

	it('matches node md5 across uneven chunk boundaries', async () => {
		const bytes = new Uint8Array(1000).map((_, i) => (i * 31 + 7) % 256);
		let total = 0;
		const digest = await md5File(new File([bytes], 'b.jpg'), (n) => (total += n), 7);
		expect(digest).toBe(createHash('md5').update(bytes).digest('hex'));
		expect(total).toBe(1000);
	});
});

describe('isSupported', () => {
	it.each(['image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'image/bmp'])(
		'accepts %s',
		(type) => {
			expect(isSupported(file('a', type), false)).toBe(true);
		}
	);

	it.each(['image/heic', 'image/webp', 'text/plain', ''])('rejects %j', (type) => {
		expect(isSupported(file('a', type), true)).toBe(false);
	});

	it('accepts video only when the server can transcode it', () => {
		expect(isSupported(file('a.mov', 'video/quicktime'), true)).toBe(true);
		expect(isSupported(file('a.mov', 'video/quicktime'), false)).toBe(false);
	});

	it('rejects dotfiles such as macOS metadata twins', () => {
		expect(isSupported(file('._IMG_0001.jpg', 'image/jpeg'), false)).toBe(false);
	});
});
