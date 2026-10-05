import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';

const pathBrowserShim = fileURLToPath(
	new URL('./node_modules/path-browserify/index.js', import.meta.url)
);
const basePath = process.env.BASE_PATH ?? '';

if (basePath !== '' && (!basePath.startsWith('/') || basePath.endsWith('/'))) {
	throw new Error('BASE_PATH must be empty or start with / and not end with /.');
}

export default defineConfig({
	// Deep Agents' browser bundle currently contains one transitive Node-style
	// environment lookup. Replace only process.env; do not emulate a Node runtime.
	define: {
		'process.env': '{}',
		// Picomatch's browser path matcher needs a POSIX platform, not a Node
		// process global. The agent's virtual canvas paths always use '/'.
		'process.platform': '"browser"'
	},
	resolve: {
		alias: [
			{
				find: /^util$/,
				replacement: fileURLToPath(new URL('./node_modules/util/util.js', import.meta.url))
			},
			{
				find: /^node:fs\/promises$/,
				replacement: fileURLToPath(
					new URL('./src/lib/studio/browser-filesystem.ts', import.meta.url)
				)
			},
			{ find: /^path$/, replacement: pathBrowserShim },
			{ find: /^node:path$/, replacement: pathBrowserShim }
		]
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			paths: {
				base: basePath as '' | `/${string}`
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
