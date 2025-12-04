import {DOMEvents, promiseWithResolves, UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect, vi} from 'vitest'


describe('Test :transition', () => {

	// Jest env has no web animation API.
	const perFrameFade = lupos.Transition.define(function(el: HTMLElement, options: lupos.TransitionOptions = {}) {
		return {
			...options,
			perFrame: (progress: number) => {
				el.style.opacity = progress + ''
			},
		}
	})


	// Enter transition from 0 to 1
	async function expectPlayingEnterTransition(div: HTMLElement) {
		expect(Number(div.style.opacity)).toBe(0)

		await sleep(100)
		expect(Number(div.style.opacity)).toBeGreaterThan(0)
		expect(Number(div.style.opacity)).toBeLessThan(1)

		await sleep(150)
		expect(Number(div.style.opacity)).toBe(1)
	}


	// Leave transition from 1 to 0
	async function expectPlayingLeaveTransition(div: HTMLElement) {
		expect(Number(div.style.opacity)).toBe(1)

		await sleep(100)
		expect(Number(div.style.opacity)).toBeGreaterThan(0)
		expect(Number(div.style.opacity)).toBeLessThan(1)

		await sleep(150)
		expect(Number(div.style.opacity)).toBe(0)
	}


	async function expectNotPlayingTransition(div: HTMLElement) {
		expect(div.style.opacity).toBe('')
		await sleep(100)
		expect(div.style.opacity).toBe('')
	}


	it(':transition=${...}', async () => {
		class Com extends lupos.Component {

			prop: boolean = false

			protected render() {
				return this.prop ? lupos.html`<div :transition.immediate=${perFrameFade()}>Transition</div>` : null
			}
		}


		let com = new Com()
		com.appendTo(document.body)
		await UpdateQueue.untilAllComplete()
		expect(com.el.firstElementChild).toBe(null)


		com.prop = true
		await UpdateQueue.untilAllComplete()

		let div = com.el.firstElementChild as HTMLElement
		let fn2 = vi.fn()
		let fn3 = vi.fn()
		let fn4 = vi.fn()
		DOMEvents.on(div, 'transition-enter-ended', fn2)
		DOMEvents.on(div, 'transition-leave-started', fn3)
		DOMEvents.on(div, 'transition-leave-ended', fn4)

		// Enter transition from 0 to 1
		await expectPlayingEnterTransition(div)
		expect(fn2).toHaveBeenCalledTimes(1)

		// Leave transition started
		com.prop = false
		await sleep(10)
		expect(fn3).toHaveBeenCalledTimes(1)

		// Leave transition from 1 to 0
		await expectPlayingLeaveTransition(div)

		expect(com.el.firstElementChild).toBe(null)
		expect(fn4).toHaveBeenCalledTimes(1)
	})


	it('No transition for not directly moving node', async () => {
		class Com extends lupos.Component {

			prop: boolean = true
			div!: HTMLElement

			protected render() {
				return this.prop
					? lupos.html`
						<div>
							<div :ref=${this.div} :transition.immediate=${perFrameFade()}>Transition</div>
						</div>
					`
					: null
			}
		}

		let com = new Com()
		com.appendTo(document.body)
		await UpdateQueue.untilAllComplete()
		let div = com.div

		// No enter transition from 0 to 1
		await expectNotPlayingTransition(div)

		// Leave transition started
		com.prop = false
		await UpdateQueue.untilAllComplete()

		// No leave transition from 1 to 0
		await expectNotPlayingTransition(div)
	})


	it('Have transition for global modifier', async () => {
		class Com extends lupos.Component {

			prop: boolean = true
			div!: HTMLElement

			protected render() {
				return this.prop
					? lupos.html`
						<div>
							<div :ref=${this.div} :transition.immediate.global=${perFrameFade()}>Transition</div>
						</div>
					`
					: null
			}
		}


		let com = new Com()
		com.appendTo(document.body)
		await UpdateQueue.untilAllComplete()

		let div = com.div

		// Enter transition from 0 to 1
		await expectPlayingEnterTransition(div)

		// Leave transition started
		com.prop = false
		await UpdateQueue.untilAllComplete()

		// Leave transition from 1 to 0
		await expectPlayingLeaveTransition(div)
	})


	it('Have transition for component itself', async () => {
		class Com extends lupos.Component {

			prop: boolean = false
			child!: Child

			protected render() {
				return this.prop ? lupos.html`<Child :ref=${this.child} />` : null
			}
		}

		class Child extends lupos.Component {
			protected render() {
				return lupos.html`
					<template :transition.immediate=${perFrameFade()}>Transition</template>
				`
			}
		}


		let com = new Com()
		com.appendTo(document.body)
		await UpdateQueue.untilAllComplete()

		// Show Child
		com.prop = true
		await UpdateQueue.untilAllComplete()
		let div = com.child.el

		// Enter transition from 0 to 1
		await expectPlayingEnterTransition(div)

		// Leave transition started
		com.prop = false
		await UpdateQueue.untilAllComplete()

		// Leave transition from 1 to 0
		await expectPlayingLeaveTransition(div)
	})
})


/** Returns a promise which will be resolved after counting timeout for `ms` milliseconds. */
function sleep(ms: number = 0) {
	let {promise, resolve} = promiseWithResolves()
	setTimeout(resolve, ms)
	
	return promise
}
