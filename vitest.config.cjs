const {defineConfig} = require('vitest/config')
const path = require('node:path')


module.exports = defineConfig({
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
