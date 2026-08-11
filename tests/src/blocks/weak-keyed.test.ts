import {SlotPosition, SlotPositionType, TemplateSlot, WeakCacheableKeyedBlock} from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Weak Cacheable Keyed Block', () => {
	it('stores cached templates in a WeakMap', () => {
		let container = document.createElement('div')
		let slot = new TemplateSlot(new SlotPosition(SlotPositionType.AfterContent, container))
		let block = new WeakCacheableKeyedBlock(slot)

		expect((block as any).templates).toBeInstanceOf(WeakMap)
	})
})
