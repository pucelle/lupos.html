import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test rest slot', () => {

	it('Rest <slot>', async () => {
		class Parent extends lupos.Component {
			protected render() {
				return lupos.html`<Child><div>Slot Content</div></Child>`
			}
		}

		class Child extends lupos.Component {

			protected render() {
				return lupos.html`<slot />`
			}
		}

		let parent = new Parent()
		parent.appendTo(document.body)
		await UpdateQueue.untilAllComplete()
		expect(parent.el.querySelector('slot')?.textContent).toBe('Slot Content')
	})
})