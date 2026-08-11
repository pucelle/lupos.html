import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration', () => {
	it('test multi child reference', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div><div>${this.text}<br>${this.text}</div></div>`
			}
		}

		let {compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
	})


	it('test reference after marker', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${this.renderContent()}<div>${this.text}</div></div>`
			}

			private renderContent() {
				return html`<div>${this.text}</div>`
			}
		}

		let {compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
	})

	
	it('test multi reference after marker', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${this.renderContent()}<div>${this.text}</div>${this.text}</div>`
			}

			private renderContent() {
				return html`<div>${this.text}</div>`
			}
		}

		let {compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
	})
})
