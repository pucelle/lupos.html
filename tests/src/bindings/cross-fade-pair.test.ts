import {
	crossFadePair,
	getCrossFadeElementForPhase,
} from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test :crossFadePair', () => {
	it('supports falsy keys and removes the pair for null', () => {
		let el = document.createElement('div')
		let binding = new crossFadePair(el)

		binding.update(0)
		binding.afterConnectCallback()
		expect(getCrossFadeElementForPhase(0, 'any')).toBe(el)

		binding.update(null)
		expect(getCrossFadeElementForPhase(0, 'any')).toBeUndefined()
		expect(getCrossFadeElementForPhase(null, 'any')).toBeUndefined()
	})
})
