import {PerFrameTransitionEasingName, Transition, WebTransitionEasingName, getEasingFunction, makeMixer} from '../../../web/out'
import {describe, it, expect, vi} from 'vitest'


describe('Test transition', () => {
	
	it('getEasingFunction', () => {
		for (let name of ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] as WebTransitionEasingName[]) {
			let fn = getEasingFunction(name)
			expect(fn(0)).toEqual(0)
			expect(fn(1)).toEqual(1)
		}
	})

	it('getEasingFunction of custom easing names', () => {
		for (let name of ['ease-in-elastic', 'ease-out-elastic', 'ease-in-out-elastic', 'ease-in-bounce', 'ease-out-bounce', 'ease-in-out-bounce'] as PerFrameTransitionEasingName[]) {
			let fn = getEasingFunction(name)
			expect(fn(0)).toEqual(0)
			expect(fn(1)).toEqual(1)
		}
	})

	it('makeMixer', () => {

		class Mixable {
			value: number
			constructor(value: number) {
				this.value = value
			}
			mix(m: Mixable, rate: number) {
				return new Mixable(this.value * (rate - 1) + m.value * rate)
			}
		}

		expect(makeMixer(0, 1)(0.4)).toEqual(0.4)
		expect(makeMixer(1, 0)(0.4)).toEqual(0.6)
		//expect(makeMixer('#000', '#fff')(0.5)).toEqual('#808080')
		expect(makeMixer({a:0}, {a:1})(0.4)).toEqual({a:0.4})
		expect(makeMixer([0,1], [1,0])(0.4)).toEqual([0.4, 0.6])
		expect(makeMixer(new Mixable(0), new Mixable(1))(0.4)).toEqual(new Mixable(0.4))
	})

	it('updates reused transition properties and options', async () => {
		let first = vi.fn()
		let second = vi.fn()
		let makeTransition = Transition.define((_el, options: {
			duration: number
			perFrame: (progress: number) => void
		}) => options)
		let transition = new Transition(document.createElement('div'))

		await transition.enter(makeTransition({duration: 0, perFrame: first}))
		await transition.enter(makeTransition({duration: 0, perFrame: second}))

		expect(first).toHaveBeenCalled()
		expect(second).toHaveBeenCalled()

		let makeDefaultedTransition = Transition.define((_el, options: {
			duration?: number
			perFrame: (progress: number) => void
		}) => options)
		let pending = transition.enter(makeDefaultedTransition({perFrame: second}))
		await new Promise(resolve => setTimeout(resolve, 0))
		expect((transition as any).mixedTransitions[0].transition.options.duration).toBe(200)
		transition.finish()
		await pending
	})
})
