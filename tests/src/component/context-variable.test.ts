import {setContext, UpdateQueue, useContext} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Context Variable', () => {

	it('useContext & setContext', async () => {
		class Parent extends lupos.Component {

			@setContext
			prop: number = 1

			protected render() {
				return lupos.html`<Child />`
			}
		}

		class Child extends lupos.Component {

			@useContext prop!: number
		}


		let parent = new Parent()
		parent.appendTo(document.body)

		await UpdateQueue.untilAllComplete()
		let child = Child.fromClosest(parent.el.firstElementChild!)!
		expect(child.prop).toBe(1)

		parent.prop = 2
		expect(child.prop).toBe(2)

		parent.remove()
		await UpdateQueue.untilAllComplete()
		expect(child.prop).toBe(undefined)
	})
})
