import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for template', () => {
	it('hydrates inner properties', async () => {
		class Test extends Component {
			prop: string = 'abc'
			override render() {
				return html`<div prop=${this.prop}>Text</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.prop = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.getAttribute('prop')).toBe('def')
	})


	it('hydrates text', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${this.text}</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.textContent).toBe('def')
	})

	
	it('hydrates slot content', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${this.renderContent()}</div>`
			}

			private renderContent() {
				return html`<div>${this.text}</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('def')
	})


	it('hydrates deep slot content', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${this.renderContent()}</div>`
			}

			private renderContent() {
				return html`<div>${this.renderDeepContent()}</div>`
			}

			private renderDeepContent() {
				return html`<div>${this.text}</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.firstElementChild!.textContent).toBe('def')
	})


	it('hydrates list type slot content', async () => {
		class Test extends Component {
			text: string = 'abc'
			override render() {
				return html`<div>${[this.renderContent(), this.renderContent()]}</div>`
			}

			private renderContent() {
				return html`<div>${this.text}</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('def')
		expect(com.el.firstElementChild!.lastElementChild!.textContent).toBe('def')
	})


	it('hydrates dynamic type slot content', async () => {
		class Test extends Component {
			type: number = 0
			text: string = 'abc'
			override render() {
				return html`<div>${this.type === 0 ? this.renderContent() : this.text}</div>`
			}

			private renderContent() {
				return html`<div>${this.text}</div>`
			}
		}

		class Test1 extends Test {
			override type: number = 0
		}


		let {com, compare} = await hydrateCom(Test)
		com.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('def')


		let {com: com1, compare: compare1} = await hydrateCom(Test1)
		com1.text = 'def'
		await UpdateQueue.untilAllComplete()

		compare1()
		expect(com1.el.firstElementChild!.firstElementChild!.textContent).toBe('def')
	})
})
