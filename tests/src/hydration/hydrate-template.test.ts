import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for template', () => {
	it.each(['', '1. '])('restores adjacent text with prefix "%s" and reuses the following component', async prefix => {
		class Figure extends Component {
			override render() {
				return html`<figcaption>Map</figcaption>`
			}
		}

		class Story extends Component {
			prefix: string = prefix
			space: string = ' '

			override render() {
				let pieces = [html`${this.space}`, html`<Figure tagName="figure" />`]
				return html`<div>${this.prefix}${pieces}</div>`
			}
		}

		let original!: HTMLElement
		let {com} = await hydrateCom(Story, Story, el => {
			original = el.querySelector('figure')!
		})

		expect(com.el.querySelectorAll('figure')).toHaveLength(1)
		expect(com.el.querySelector('figure')).toBe(original)
		expect(com.el.textContent).toBe(prefix + ' Map')

		com.prefix = '2. '
		com.space = ' / '
		await UpdateQueue.untilComplete()

		expect(com.el.textContent).toBe('2.  / Map')
		expect(com.el.querySelector('figure')).toBe(original)
	})

	it('restores an empty leading text binding before an existing root element', async () => {
		class Story extends Component {
			prefix: string = ''

			override render() {
				return html`<section>${this.renderContent()}</section>`
			}

			private renderContent() {
				return html`${this.prefix}<figure>Map</figure>`
			}
		}

		let original!: HTMLElement
		let {com} = await hydrateCom(Story, Story, el => {
			original = el.querySelector('figure')!
		})

		com.prefix = 'Step: '
		await UpdateQueue.untilComplete()

		expect(com.el.textContent).toBe('Step: Map')
		expect(com.el.querySelectorAll('figure')).toHaveLength(1)
		expect(com.el.querySelector('figure')).toBe(original)
	})


	it('hydrates inner properties', async () => {
		class Test extends Component {
			prop: string = 'abc'
			override render() {
				return html`<div prop=${this.prop}>Text</div>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.prop = 'def'
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

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
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('def')


		let {com: com1, compare: compare1} = await hydrateCom(Test1)
		com1.text = 'def'
		await UpdateQueue.untilComplete()

		compare1()
		expect(com1.el.firstElementChild!.firstElementChild!.textContent).toBe('def')
	})
})
