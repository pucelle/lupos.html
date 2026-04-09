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
		await UpdateQueue.untilAllComplete()

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
		await UpdateQueue.untilAllComplete()
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
		await UpdateQueue.untilAllComplete()
		compare()
	})
})
