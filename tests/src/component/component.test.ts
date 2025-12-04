import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, vi, expect} from 'vitest'


describe('Test Component', () => {

	it('Component Apis', async () => {
		class Parent extends lupos.Component {

			static style() {
				return lupos.css`.className{color: red;}`
			}

			protected render() {
				return lupos.html`<Child />`
			}
		}

		class Child extends lupos.Component {}


		let parent = new Parent()
		let fn1 = vi.fn()
		let fn2 = vi.fn()
		let fn3 = vi.fn()

		parent.on('updated', fn1)
		parent.on('connected', fn2)
		parent.on('will-disconnect', fn3)
		expect(parent.connected).toBe(false)

		parent.appendTo(document.body)
		await UpdateQueue.untilAllComplete()
		let child = Child.fromClosest(parent.el.firstElementChild!)!

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)

		expect(lupos.Component.from(parent.el)).toBe(parent)
		expect(lupos.Component.from(child.el)).toBe(child)

		expect(lupos.Component.fromClosest(child.el)).toBe(child)
		expect(Child.fromClosest(child.el)).toBe(child)
		expect(Parent.fromClosest(child.el)).toBe(parent)

		expect(parent.connected).toBe(true)

		// Can't pass
		//expect(document.head.querySelector('style')?.textContent).toBe('.className{color: red;}')

		parent.remove()
		expect(parent.connected).toBe(false)
		expect(fn3).toHaveBeenCalledTimes(1)
	})
})