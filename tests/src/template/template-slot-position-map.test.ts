import * as lupos from '../../../web/out'
import {SlotPositionMap} from '../../../web/out/template/slot-position-map'
import {describe, it, expect} from 'vitest'


describe('Test SlotPositionMap', () => {

	function createFakePosition(): lupos.SlotPosition<any> {
		return new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, new Text())
	}

	function createFakeTemplate() {
		return new lupos.Template({el: document.createElement('template'), position: createFakePosition()}, null, null)
	}

	it('SlotPositionMap', async () => {
		let m = new SlotPositionMap()

		let t1 = createFakeTemplate()
		let t2 = createFakeTemplate()
		let p = createFakePosition()

		m.addPosition(t1, p)
		expect(m.getPosition(t1)).toBe(p)

		m.addPosition(t2, p)
		expect(m.getPosition(t1)).toBe(t2.startInnerPosition)
		expect(m.getPosition(t2)).toBe(p)

		m.deletePosition(t2, p)
		expect(m.getPosition(t1)).toBe(p)
		expect(m.getPosition(t2)).toBe(undefined)
	})
})
