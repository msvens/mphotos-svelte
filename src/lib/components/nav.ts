import { Home, Photo, Folder, Camera, User, type IconSource } from 'svelte-hero-icons';

export interface NavItem {
	name: string;
	href: string;
	icon: IconSource;
}

export const navigation: NavItem[] = [
	{ name: 'Home', href: '/', icon: Home },
	{ name: 'Photo', href: '/photo', icon: Photo },
	{ name: 'Album', href: '/album', icon: Folder },
	{ name: 'Camera', href: '/camera', icon: Camera },
	{ name: 'Guest', href: '/guest', icon: User }
];

/**
 * Active-route test matching mphotos-ui: Home matches only the exact path `/`,
 * every other item matches when the current path starts with its href.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
	return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
