import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Await Block', () => {
	it('Await Block', async () => {
		let render = (promise: Promise<any>) => {
			return lupos.html`
				<lu:await ${promise}>Pending</lu:await>
				<lu:then>Then</lu:then>
				<lu:catch>Catch</lu:catch>
			`
		}

		let container = document.createElement('div')
		let slot = new lupos.TemplateSlot<null>(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)

		let resolve: (value: any) => void
		let promise = new Promise((r) => {
			resolve = r
		})

		slot.update(render(promise))
		await UpdateQueue.untilAllComplete()
		expect(container.textContent).toEqual('Pending')

		resolve!(null)
		await Promise.resolve()
		await UpdateQueue.untilAllComplete()
		expect(container.textContent).toEqual('Then')

		let reject: (reason: any) => void
		promise = new Promise((_r, r) => {
			reject = r
		})

		slot.update(render(promise))
		await UpdateQueue.untilAllComplete()
		expect(container.textContent).toEqual('Pending')

		reject!(null)
		await Promise.resolve()
		await UpdateQueue.untilAllComplete()
		expect(container.textContent).toEqual('Catch')
	})
})