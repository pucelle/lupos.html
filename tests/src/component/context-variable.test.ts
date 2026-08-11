import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Context Variable', () => {
	it('returns the value on the first uncached lookup', () => {
		let parentEl = document.createElement('div')
		let childEl = document.createElement('div')
		parentEl.append(childEl)

		let parent = new lupos.Component(parentEl) as lupos.Component & {prop: number}
		let child = new lupos.Component(childEl)
		parent.prop = 1
		lupos.Component.setContextVariable(parent, 'prop')

		expect(lupos.Component.getContextVariableDeclared(child, 'prop')).toBe(1)
	})

	it('reads updated values through a cached provider', () => {
		let parentEl = document.createElement('div')
		let childEl = document.createElement('div')
		parentEl.append(childEl)

		let parent = new lupos.Component(parentEl) as lupos.Component & {prop: number}
		let child = new lupos.Component(childEl)
		parent.prop = 1
		lupos.Component.setContextVariable(parent, 'prop')

		expect(lupos.Component.getContextVariableDeclared(child, 'prop')).toBe(1)
		parent.prop = 2
		expect(lupos.Component.getContextVariableDeclared(child, 'prop')).toBe(2)
	})
})
