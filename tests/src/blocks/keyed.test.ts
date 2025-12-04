import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Keyed Block', () => {
	it('Keyed Block', async () => {
		let render = (value: number) => {
			return lupos.html`
				<lu:keyed ${value}><div>${value}</div></lu:if>
			`
		}

		let container = document.createElement('div')
		let slot = new lupos.TemplateSlot<null>(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)

		slot.update(render(1))
		await UpdateQueue.untilAllComplete()
		expect(container.textContent).toEqual('1')
		let keyedDiv = container.firstElementChild

		slot.update(render(1))
		await UpdateQueue.untilAllComplete()
		expect(container.firstElementChild).toEqual(keyedDiv)

		slot.update(render(2))
		await UpdateQueue.untilAllComplete()
		expect(container.firstElementChild === keyedDiv).toBe(false)
	})
})