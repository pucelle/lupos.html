import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test :ref', () => {
	it(':ref component', async () => {
		class Parent extends lupos.Component {
			ref!: Child
			protected render() {
				return lupos.html`<Child :ref=${this.ref} />`
			}
		}

		class Child extends lupos.Component {}


		let p = new Parent()
		p.appendTo(document.body)
		await UpdateQueue.untilAllComplete()

		expect(p.ref).toBeInstanceOf(Child)
	})


	it(':ref element & toggling', async () => {
		class Com extends lupos.Component {
			ref!: HTMLElement | null
			prop: boolean = true

			protected render() {
				return this.prop ? lupos.html`<div :ref=${this.ref} />` : null
			}
		}


		let c = new Com()
		c.appendTo(document.body)
		await UpdateQueue.untilAllComplete()

		expect(c.ref).toBeInstanceOf(HTMLElement)

		c.prop = false
		await UpdateQueue.untilAllComplete()
		expect(c.ref).toEqual(null)

		c.prop = true
		await UpdateQueue.untilAllComplete()
		expect(c.ref).toBeInstanceOf(HTMLElement)
	})
})