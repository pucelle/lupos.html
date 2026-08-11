import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test :html', () => {
	it(':html=${...}', () => {
		let div = document.createElement('div')
		let b = new lupos.HTMLBinding(div)

		b.update('<div>123</div>')
		expect(div.innerHTML).toEqual('<div>123</div>')

		b.update('<script ></script>')
		expect(div.innerHTML).toEqual('')

		b.update('<div onclick="alert(123)">123</div>')
		expect(div.innerHTML).toEqual('<div>123</div>')

		b.update('<img ONERROR=alert(123)><script type="module">alert(123)</script>')
		expect(div.innerHTML).toEqual('<img>')
	})
})
