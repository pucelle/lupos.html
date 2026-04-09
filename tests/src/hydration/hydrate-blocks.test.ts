import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for <lu:if>', () => {
	it('hydrates <lu:if> when false', async () => {
		class Test extends Component {
			prop: boolean = false
			text: string = 'text'

			override render() {
				return html`
					<lu:if ${this.prop}>
						<div>${this.text}</div>
					</lu:if>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild).toBe(null)

		com.prop = true
		com.text = 'text1'
		await UpdateQueue.untilAllComplete()
		expect(com.el.firstElementChild?.textContent).toBe('text1')
	})

	it('hydrates <lu:if> when true', async () => {
		class Test extends Component {
			prop: boolean = true
			text: string = 'text'

			override render() {
				return html`
					<lu:if ${this.prop}>
						<div>${this.text}</div>
					</lu:if>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'text1'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('text1')

		com.prop = false
		await UpdateQueue.untilAllComplete()
		expect(com.el.firstElementChild).toBe(null)
	})

	it('hydrates <lu:if cache>', async () => {
		class Test extends Component {
			prop: boolean = true
			text: string = 'text'

			override render() {
				return html`
					<lu:if ${this.prop} cache>
						<div>${this.text}</div>
					</lu:if>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'text1'
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('text1')

		com.prop = false
		await UpdateQueue.untilAllComplete()
		expect(com.el.firstElementChild).toBe(null)
	})


	it('hydrates <lu:if> with <lu:else>', async () => {
		class Test extends Component {
			prop: boolean = true

			override render() {
				return html`
					<lu:if ${this.prop}>
						<div>true</div>
					</lu:if>
					<lu:else>
						<div>false</div>
					</lu:else>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('true')

		com.prop = false
		await UpdateQueue.untilAllComplete()
		expect(com.el.firstElementChild?.textContent).toBe('false')
	})
})


describe('Hydration for <lu:await>', () => {
	it('Hydrate <lu:await>', async () => {
		class Test extends Component {
			promise: Promise<any> = Promise.resolve()
			render() {
				return html`
					<lu:await ${this.promise}>Pending</lu:await>
					<lu:then>Then</lu:then>
					<lu:catch>Catch</lu:catch>
				`
			}
		}

		let {com} = await hydrateCom(Test)
		await UpdateQueue.untilAllComplete()

		// Can't correctly compare here because Pending text node will be replaced.
		//compare()
		expect(com.el.textContent).toBe('Then')
	})
})


describe('Hydration for <lu:await>', () => {
	it('Hydrate <lu:await>', async () => {
		class Test extends Component {
			promise: Promise<any> = Promise.resolve()
			render() {
				return html`
					<lu:await ${this.promise}>Pending</lu:await>
					<lu:then>Then</lu:then>
					<lu:catch>Catch</lu:catch>
				`
			}
		}

		let {com} = await hydrateCom(Test)
		await UpdateQueue.untilAllComplete()

		// Can't correctly compare here because Pending text node will be replaced.
		//compare()
		expect(com.el.textContent).toBe('Then')
	})
})


describe('Hydration for dynamic component', () => {
	it.only('hydrates dynamic child component', async () => {
		class Parent extends Component {

			ChildCom: typeof Child1 | typeof Child2 = Child1

			protected render() {
				return html`
					<${this.ChildCom} :class="${'className'}"></>
				`
			}
		}

		class Child1 extends Component {
			protected render() {
				return html`Child1`
			}
		}
		class Child2 extends Component {
			protected render() {
				return html`Child2`
			}
		}

		let {com: parent, compare} = await hydrateCom(Parent)
		await UpdateQueue.untilAllComplete()
		compare()

		expect(Child1.from(parent.el.firstElementChild!)!).toBeInstanceOf(Child1)
		expect(parent.el.textContent).toBe('Child Component Content')

		parent.ChildCom = Child2
		await UpdateQueue.untilAllComplete()
		expect(Child2.from(parent.el.firstElementChild!)).toBeInstanceOf(Child2)
		expect(parent.el.textContent).toBe('Child Component Content')
	})


	it('hydrates dynamic child component with slot content', async () => {
		class Parent extends Component {

			ChildCom: typeof Child1 | typeof Child2 = Child1

			protected render() {
				return html`
					<${this.ChildCom} :class="${'className'}">
						Child Component Content
					</>
				`
			}
		}

		class Child1 extends Component {
			protected render() {
				return html`<slot />`
			}
		}
		class Child2 extends Component {
			protected render() {
				return html`<slot />`
			}
		}

		let {com: parent, compare} = await hydrateCom(Parent)
		await UpdateQueue.untilAllComplete()
		compare()

		expect(Child1.from(parent.el.firstElementChild!)!).toBeInstanceOf(Child1)
		expect(parent.el.textContent).toBe('Child Component Content')

		parent.ChildCom = Child2
		await UpdateQueue.untilAllComplete()
		expect(Child2.from(parent.el.firstElementChild!)).toBeInstanceOf(Child2)
		expect(parent.el.textContent).toBe('Child Component Content')
	})
})


describe('Hydration for <lu:portal>', () => {
	it('hydrates lu:portal', async () => {
		class Test extends Component {
			text: string = 'text'

			override render() {
				return html`
					<lu:portal>
						${this.text}
					</lu:portal>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.text = 'text1'
		await UpdateQueue.untilAllComplete()

		compare()
		expect((com.el.firstElementChild! as HTMLTemplateElement).content.firstChild!.textContent).toBe('text1')
	})
})
