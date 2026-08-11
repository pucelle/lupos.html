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
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild).toBe(null)

		com.prop = true
		com.text = 'text1'
		await UpdateQueue.untilComplete()
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
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('text1')

		com.prop = false
		await UpdateQueue.untilComplete()
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
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('text1')

		com.prop = false
		await UpdateQueue.untilComplete()
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
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild?.textContent).toBe('true')

		com.prop = false
		await UpdateQueue.untilComplete()
		expect(com.el.firstElementChild?.textContent).toBe('false')
	})
})


describe('Hydration for <lu:await>', () => {
	it('Hydrate <lu:await>', async () => {
		class Test extends Component {
			promise: Promise<any> = Promise.resolve(html`Then`)
			render() {
				return html`
					<lu:await ${this.promise}>Pending</lu:await>
				`
			}
		}

		let {com} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()

		// Pending text is replaced by the resolved content.
		expect(com.el.textContent).toBe('Then')
	})
})


describe('Hydration for <lu:await>', () => {
	it('Hydrate <lu:await>', async () => {
		class Test extends Component {
			promise: Promise<any> = Promise.resolve(null)
			render() {
				return html`
					<lu:await ${this.promise}>Pending</lu:await>
				`
			}
		}

		let {com} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()

		expect(com.el.textContent).toBe('')
	})
})


describe('Hydration for <lu:keyed>', () => {
	it('Hydrates <lu:keyed>', async () => {
		class Test extends Component {
			text: string = 'text'
			render() {
				return html`
					<lu:keyed ${this.text}><div>${this.text}</div></lu:keyed>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
		expect(com.el.textContent).toBe('text')

		com.text = 'text1'
		await UpdateQueue.untilComplete()
		expect(compare).toThrow('Node mismatch')
		expect(com.el.textContent).toBe('text1')
	})
})



describe('Hydration for <lu:switch>', () => {
	it('Hydrates <lu:switch>', async () => {
		class Test extends Component {
			text: string = '1'
			render() {
				return html`
					<lu:switch ${this.text}>
						<lu:case ${'1'}>${this.text}</lu:case>
						<lu:case ${'2'}>${this.text}</lu:case>
						<lu:default>${this.text}</lu:default>
					</lu:switch>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
		expect(com.el.textContent).toBe('1')

		com.text = '2'
		await UpdateQueue.untilComplete()
		expect(compare).toThrow('Node mismatch')
		expect(com.el.textContent).toBe('2')

		com.text = '3'
		await UpdateQueue.untilComplete()
		expect(compare).toThrow('Node mismatch')
		expect(com.el.textContent).toBe('3')
	})
})


describe('Hydration for <lu:for>', () => {
	it('Hydrates <lu:for>', async () => {
		class Test extends Component {
			list: string[] = ['1', '2']
			render() {
				return html`
					<lu:for ${this.list}>${(item: string) => html`
						<div>${item}</div>
					`}</lu:for>
				`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
		expect(com.el.textContent).toBe('12')

		com.list = ['1', '2', '3']
		await UpdateQueue.untilComplete()
		expect(com.el.textContent).toBe('123')
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
		await UpdateQueue.untilComplete()

		compare()
		expect((com.el.firstElementChild! as HTMLTemplateElement).content.firstChild!.textContent).toBe('text1')
	})
})


describe('Hydration for dynamic component', () => {
	it('hydrates dynamic child component', async () => {
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
				return html`Child 1`
			}
		}
		class Child2 extends Component {
			protected render() {
				return html`Child 2`
			}
		}

		let {com: parent, compare} = await hydrateCom(Parent)
		await UpdateQueue.untilComplete()
		compare()

		expect(Child1.from(parent.el.firstElementChild!)!).toBeInstanceOf(Child1)
		expect(parent.el.textContent).toBe('Child 1')

		parent.ChildCom = Child2
		await UpdateQueue.untilComplete()
		expect(Child2.from(parent.el.firstElementChild!)).toBeInstanceOf(Child2)
		expect(parent.el.textContent).toBe('Child 2')
	})


	it('hydrates dynamic child component with slot content', async () => {
		class Parent extends Component {

			ChildCom: typeof Child1 | typeof Child2 = Child1

			protected render() {
				return html`
					<${this.ChildCom} :class="${'className'}">
						child component content
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
		await UpdateQueue.untilComplete()
		compare()

		expect(Child1.from(parent.el.firstElementChild!)!).toBeInstanceOf(Child1)
		expect(parent.el.textContent).toBe('child component content')

		parent.ChildCom = Child2
		await UpdateQueue.untilComplete()
		expect(Child2.from(parent.el.firstElementChild!)).toBeInstanceOf(Child2)
		expect(parent.el.textContent).toBe('child component content')
	})
})
