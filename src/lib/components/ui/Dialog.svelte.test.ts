import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Dialog from './Dialog.svelte';

function textSnippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
}

function buttonsSnippet(...labels: string[]) {
	return createRawSnippet(() => ({
		render: () => `<span>${labels.map((l) => `<button>${l}</button>`).join('')}</span>`
	}));
}

describe('Dialog', () => {
	it('renders nothing when closed', () => {
		render(Dialog, { props: { open: false, onClose: vi.fn(), title: 'Gone' } });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('renders title, text and children when open', () => {
		render(Dialog, {
			props: {
				open: true,
				onClose: vi.fn(),
				title: 'Delete All Photos?',
				text: 'This cannot be undone',
				children: textSnippet('body content')
			}
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Delete All Photos?' })).toBeInTheDocument();
		expect(screen.getByText('This cannot be undone')).toBeInTheDocument();
		expect(screen.getByText('body content')).toBeInTheDocument();
	});

	it('labels the dialog with its title', () => {
		render(Dialog, { props: { open: true, onClose: vi.fn(), title: 'Titled' } });
		expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'dialog-title');
	});

	it('closes on backdrop click', async () => {
		const onClose = vi.fn();
		render(Dialog, { props: { open: true, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

		expect(onClose).toHaveBeenCalled();
	});

	it('closes on Escape', async () => {
		const onClose = vi.fn();
		render(Dialog, { props: { open: true, onClose } });

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalled();
	});

	it('ignores Escape when already closed', async () => {
		const onClose = vi.fn();
		render(Dialog, { props: { open: false, onClose } });

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).not.toHaveBeenCalled();
	});

	describe('default footer', () => {
		it('shows only a cancel button when there is no onOk', () => {
			render(Dialog, { props: { open: true, onClose: vi.fn() } });

			expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
		});

		it('runs onOk then closes', async () => {
			const calls: string[] = [];
			const onOk = vi.fn(() => {
				calls.push('ok');
			});
			const onClose = vi.fn(() => {
				calls.push('close');
			});
			render(Dialog, { props: { open: true, onClose, onOk } });

			await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

			expect(calls).toEqual(['ok', 'close']);
		});

		it('does not close after onOk when closeOnOk is false', async () => {
			const onClose = vi.fn();
			render(Dialog, { props: { open: true, onClose, onOk: vi.fn(), closeOnOk: false } });

			await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

			expect(onClose).not.toHaveBeenCalled();
		});

		it('honours custom button labels', () => {
			render(Dialog, {
				props: {
					open: true,
					onClose: vi.fn(),
					onOk: vi.fn(),
					closeText: 'NEVERMIND',
					okText: 'DO IT'
				}
			});

			expect(screen.getByRole('button', { name: 'NEVERMIND' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'DO IT' })).toBeInTheDocument();
		});
	});

	it('actions snippet replaces the default footer entirely', () => {
		render(Dialog, {
			props: {
				open: true,
				onClose: vi.fn(),
				children: textSnippet('body'),
				actions: buttonsSnippet('CANCEL', 'DELETE ALL')
			}
		});

		// Regression guard: the React original renders its footer unconditionally, so a
		// caller supplying its own buttons ends up with two CANCELs.
		expect(screen.getAllByRole('button', { name: 'CANCEL' })).toHaveLength(1);
		expect(screen.getByRole('button', { name: 'DELETE ALL' })).toBeInTheDocument();
	});
});
