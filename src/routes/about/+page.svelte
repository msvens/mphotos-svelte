<script lang="ts">
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';

	const link = 'text-blue-600 hover:underline dark:text-blue-400';
</script>

<PageSpacing />

<div class="mx-auto max-w-3xl px-4 py-8">
	<div class="mx-auto mb-12 w-[200px]">
		<Logo />
	</div>

	<p class="mb-4 text-base leading-relaxed">
		Mellowtech Photos is my personal photoblog. It also serves as the homepage for mellowtech (<a
			href="#mellowtech"
			class={link}>see below</a
		>). There are a lot of photo blogs out there - instagram, flickr, photobucket, etc. None,
		however did what I exactly wanted. Namely to
	</p>

	<ul class="mb-6 list-disc space-y-2 pl-6 text-lg">
		<li>Take full advantage of exif information stored typically in your jpegs</li>
		<li>All editing (including meta information) done in lightroom</li>
		<li>Offer a tight integration with Google Drive</li>
	</ul>

	<p class="mb-4 text-base leading-relaxed">
		You can also find my full resume at
		<a href="https://resume.msvens.com/" target="_blank" rel="noopener noreferrer" class={link}
			>resume.msvens.com</a
		>.
	</p>

	<h2 class="mt-8 mb-4 text-2xl font-semibold">Technical Detail</h2>

	<p class="mb-4 text-base leading-relaxed">
		This website uses Go for the backend and Svelte/SvelteKit as its frontend. You can find the code
		in the following projects
	</p>

	<ul class="mb-6 list-disc space-y-2 pl-6 text-lg">
		<li><a href="https://github.com/msvens/mphotos" class={link}>mphotos</a> - backend service</li>
		<li>
			<a href="https://github.com/msvens/mphotos-svelte" class={link}>mphotos-svelte</a> - SvelteKit frontend
		</li>
		<li>
			<a href="https://github.com/msvens/mdrive" class={link}>mdrive</a> - simplified google drive access
		</li>
		<li>
			<a href="https://github.com/msvens/mexif" class={link}>mexif</a> - extract exif information from
			images
		</li>
	</ul>

	<p class="mb-4 text-base leading-relaxed">The frontend is built using:</p>

	<ul class="mb-6 list-disc space-y-2 pl-6 text-lg">
		<li><a href="https://kit.svelte.dev" class={link}>SvelteKit</a> with a static adapter</li>
		<li><a href="https://svelte.dev" class={link}>Svelte 5</a> (runes)</li>
		<li><a href="https://www.typescriptlang.org" class={link}>TypeScript</a></li>
		<li><a href="https://tailwindcss.com" class={link}>Tailwind CSS v4</a></li>
		<li><a href="https://heroicons.com" class={link}>Heroicons</a></li>
	</ul>

	<p class="mb-4 text-base leading-relaxed">
		A big thanks to the following libraries and tools that made this project possible:
	</p>

	<ul class="mb-6 list-disc space-y-2 pl-6 text-lg">
		<li><a href="https://exiftool.org" class={link}>exiftool</a></li>
		<li>
			<a
				href="https://libvips.github.io/libvips/API/current/Using-vipsthumbnail.md.html"
				class={link}>libvips</a
			>
		</li>
		<li><a href="https://github.com/gorilla/sessions" class={link}>gorilla sessions</a></li>
	</ul>

	<h2 id="mellowtech" class="mt-8 mb-4 text-2xl font-semibold">Mellowtech</h2>

	<p class="mb-4 text-base leading-relaxed">
		mellowtech came into existence back in 2002 when Martin Svensson and Rickard Cöster (then 2 phd
		studends) decided to start a software company. A great deal of time was spent on finding a good
		name, in the end we ended up with mellow - we thought it captured what we were about. A lot of
		relaxing and at the same time producing solid (actually another name we had in mind) and mature
		code. As with many other grand ideas running a company while doing your phd did not turn out to
		be the best of ideas, especially since we mostly wanted to create cool stuff.
	</p>

	<p class="mb-4 text-base leading-relaxed">
		In the end one the company died but the idea of mellowtech prevailed. It has been a playground
		for fiddling with things such as, disc based search and sort, key-value stores, social graphs,
		oauth & openid and blog sofware. Some of it has lived for a very long time while other stuff
		have been developed recently.
	</p>
</div>
