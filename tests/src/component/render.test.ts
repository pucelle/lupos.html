import {Observed, UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test render', () => {

	it('Render Static', async () => {
		let rendered = lupos.render(lupos.html`<div>123</div>`)
		rendered.appendTo(document.body)

		await UpdateQueue.untilAllComplete()
		expect(rendered.el.innerHTML).toBe(`<div>123</div>`)
	})


	it('Render Dynamic', async () => {
		let o: Observed<{value: number}> = {value: 1}

		let rendered = lupos.render(() => {
			return lupos.html`<div>${o.value}</div>`
		})

		rendered.appendTo(document.body)
		await UpdateQueue.untilAllComplete()
		expect(rendered.el.innerHTML).toBe(`<div>1</div>`)

		o.value = 2
		await UpdateQueue.untilAllComplete()
		expect(rendered.el.innerHTML).toBe(`<div>2</div>`)
	})
})