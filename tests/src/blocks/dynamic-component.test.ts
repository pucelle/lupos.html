import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Dynamic Component Block', () => {
	it('Dynamic Child Component', async () => {
		class Parent extends lupos.Component {

			ChildCom: typeof Child1 | typeof Child2 = Child1

			protected render() {
				return lupos.html`
					<${this.ChildCom} :class="${'className'}">
						Child Component Content
					</>
				`
			}
		}

		class Child1 extends lupos.Component {
			protected render() {
				return lupos.html`<slot />`
			}
		}
		class Child2 extends lupos.Component {
			protected render() {
				return lupos.html`<slot />`
			}
		}

		let parent = new Parent()
		parent.appendTo(document.body)
		await UpdateQueue.untilAllComplete()

		let child1 = Child1.from(parent.el.firstElementChild!)!
		expect(child1).toBeInstanceOf(Child1)
		expect(child1.connected).toBe(true)
		expect(parent.el.textContent).toBe('Child Component Content')

		parent.ChildCom = Child2
		await UpdateQueue.untilAllComplete()
		expect(child1.connected).toBe(false)
		expect(Child2.from(parent.el.firstElementChild!)).toBeInstanceOf(Child2)
		expect(parent.el.textContent).toBe('Child Component Content')
	})
})