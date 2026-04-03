import { defineConfig } from 'vitest/config'
import path from 'node:path'


export default defineConfig({
	test: {
		environment: 'happy-dom',
		include: ['tests/out/**/*.test.js'],
	},
	resolve: {
		alias: {
			'lupos.html': path.resolve(__dirname, './web/out'),
		},
	},
})