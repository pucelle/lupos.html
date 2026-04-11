import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for :class', () => {
	it('hydrates `:class.active`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :class.active=${this.active}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.classList.contains('active')).toBeFalsy()
	})

	it('hydrates `:class=string`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :class=${this.active ? 'active': ''}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.classList.contains('active')).toBeFalsy()
	})

	it('hydrates `:class=list`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :class=${this.active ? ['active'] : []}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.classList.contains('active')).toBeFalsy()
	})

	it('hydrates `:class=object`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :class=${{'active': this.active}}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.classList.contains('active')).toBeFalsy()
	})
})


describe('Hydration for :style', () => {
	it('hydrates `:style=string`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :style.background=${this.active ? 'red' : null}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.getAttribute('style')?.includes('background')).toBeFalsy()
	})

	it('hydrates `:class=object`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div :style=${this.active ? {background: 'red'}: {}}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.getAttribute('style')?.includes('background')).toBeFalsy()
	})
})


describe('Hydration for ?attr', () => {
	it('hydrates `?attr`', async () => {
		class Test extends Component {
			active: boolean = true
			protected render() {
				return html`<div ?attr=${this.active}></div>`
			}
		}

		class TestInActive extends Test {
			active: boolean = false
		}
		
		let {com, compare} = await hydrateCom(Test, TestInActive)
		await UpdateQueue.untilAllComplete()

		compare()
		expect(com.el.firstElementChild!.hasAttribute('attr')).toBeFalsy()
	})
})