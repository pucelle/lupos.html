import {UpdateQueue} from 'lupos'
import {addStyle} from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test component styles', () => {
	it('schedules styles added after an earlier flush', async () => {
		let first = `.late-style-first-${Date.now()}{color:red}`
		let second = `.late-style-second-${Date.now()}{color:blue}`

		addStyle(first as any)
		await UpdateQueue.untilComplete()
		addStyle(second as any)
		await UpdateQueue.untilComplete()

		expect([...document.head.querySelectorAll('style')].some(el => el.textContent === first)).toBe(true)
		expect([...document.head.querySelectorAll('style')].some(el => el.textContent === second)).toBe(true)
	})
})
