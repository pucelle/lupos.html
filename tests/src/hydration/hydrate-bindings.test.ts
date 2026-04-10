import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for named slot', () => {
	it('hydrates :slot', async () => {
		class Parent extends Component {
			protected render() {
				return html`<Child><div :slot="slotName">named slot content</div></Child>`
			}
		}
		
		class Child extends Component {
			protected render() {
				return html`<slot name="slotName" />`
			}
		}

		let {com, compare} = await hydrateCom(Parent)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('named slot content')
	})
})
