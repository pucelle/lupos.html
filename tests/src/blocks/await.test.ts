import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Await Block', () => {
	it('Await Block', async () => {
		let render = (promise: Promise<any>) => {
			return lupos.html`
				<lu:await ${promise}>Pending</lu:await>
			`
		}

		let container = document.createElement('div')
		let slot = new lupos.TemplateSlot<null>(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)
		slot.afterConnectCallback(lupos.PartCallbackParameterMask.AsDirectNode)

		let resolve: (value: any) => void
		let promise = new Promise((r) => {
			resolve = r
		})

		slot.update(render(promise))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')

		resolve!(lupos.html`Then`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Then')
	})
})
