import {UpdateQueue} from 'lupos'
import {Component, html} from '../../../web/out'
import {describe, it, expect} from 'vitest'
import {hydrateCom} from './utils'


describe('Hydration for component', () => {
	it('hydrates component properties', async () => {
		class Test extends Component {
			prop: string = 'abc'
			override render() {
				return html`<template prop=${this.prop}>Text</template>`
			}
		}

		let {com, compare} = await hydrateCom(Test)
		com.prop = 'def'
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.getAttribute('prop')).toBe('def')
	})


	it('hydrates child component', async () => {
		class Test extends Component {
			override render() {
				return html`<TestChild></TestChild>`
			}
		}

		class TestChild extends Component {
			override render() {
				return html`Child`
			}
		}

		let {compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
	})


	it('hydrates child component with tagName specified', async () => {
		class Test extends Component {
			override render() {
				return html`<TestChild tagName="span"></TestChild>`
			}
		}

		class TestChild extends Component {
			override render() {
				return html`Child`
			}
		}

		let {compare} = await hydrateCom(Test)
		await UpdateQueue.untilComplete()
		compare()
	})


	it('rebuilds only the sidebar contents when its rest-slot marker is stale', async () => {
		class Sidebar extends Component {
			declare static tagName: 'nav'
		}

		class Page extends Component {
			label = 'Stories'

			protected render() {
				return html`<Sidebar><ul><li>${this.label}</li></ul></Sidebar><main>Article</main>`
			}
		}

		let sidebar: Element
		let article: Element

		let {com} = await hydrateCom(Page, Page, el => {
			sidebar = el.querySelector('nav')!
			article = el.querySelector('main')!
			expect(sidebar.firstChild!.nodeType).toBe(Node.COMMENT_NODE)
			sidebar.firstChild!.textContent = 'old-marker'
		})

		com.label = 'Updated stories'
		await UpdateQueue.untilComplete()

		expect(com.el.querySelector('nav')).toBe(sidebar!)
		expect(com.el.querySelector('main')).toBe(article!)
		expect(sidebar!.querySelectorAll('ul')).toHaveLength(1)
		expect(sidebar!.textContent).toBe('Updated stories')
	})


	it('hydrates <slot>', async () => {
		class Parent extends Component {
			protected render() {
				return html`<Child>rest slot content</Child>`
			}
		}
		
		class Child extends Component {
			protected render() {
				return html`<div><slot /></div>`
			}
		}

		let {com, compare} = await hydrateCom(Parent)
		await UpdateQueue.untilComplete()

		compare()
		expect(com.el.firstElementChild!.firstElementChild!.textContent).toBe('rest slot content')
	})
})
