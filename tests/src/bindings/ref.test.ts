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
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

		expect(c.ref).toBeInstanceOf(HTMLElement)

		c.prop = false
		await UpdateQueue.untilComplete()
		expect(c.ref).toEqual(null)

		c.prop = true
		await UpdateQueue.untilComplete()
		expect(c.ref).toBeInstanceOf(HTMLElement)
	})

	it('restores a cached component ref after switching away and back', async () => {
		class Parent extends lupos.Component {
			ref: Child | null = null
			show: boolean = true

			protected render() {
				return lupos.html`<lu:cache>${this.show ? this.renderChild() : this.renderOther()}</lu:cache>`
			}

			private renderChild() {
				return lupos.html`<Child :ref=${this.ref} />`
			}

			private renderOther() {
				return lupos.html`<div>Other</div>`
			}
		}

		class Child extends lupos.Component {}

		let parent = new Parent()
		parent.appendTo(document.body)
		await UpdateQueue.untilComplete()
		let child = parent.ref
		expect(child).toBeInstanceOf(Child)

		parent.show = false
		await UpdateQueue.untilComplete()
		expect(parent.ref).toBeNull()

		parent.show = true
		await UpdateQueue.untilComplete()
		expect(parent.ref).toBe(child)
	})
})
