import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test :style', () => {
	it(':style=${...}', () => {
		let div = document.createElement('div')
		div.style.cssText = 'color: red'
		let b = new lupos.StyleBinding(div)

		b.update('background: #fff')
		expect(div.style.cssText).toEqual('color: red; background: #fff;')

		b.update('background: none')
		expect(div.style.getPropertyValue('background')).toContain('none')

		b.update('background-image: url("https://example.com/a:b.png")')
		expect(div.style.backgroundImage).toContain('https://example.com/a:b.png')
	})


	it(':style.name=${...}', () => {
		let div = document.createElement('div')
		div.style.cssText = 'color: red'
		let b = new lupos.StyleBinding(div)

		b.update({background: '#fff'})
		expect(div.style.cssText).toEqual('color: red; background: #fff;')

		b.update({background: 'none'})
		expect(div.style.getPropertyValue('background')).toContain('none')
	})


	it(':style=${{...}}', () => {
		let div = document.createElement('div')
		div.style.cssText = 'color: red'
		let b = new lupos.StyleBinding(div)

		b.update({background: '#fff', flex: '1'})
		expect(div.style.cssText).toEqual('color: red; background: #fff; flex-grow: 1; flex-shrink: 1; flex-basis: 0%;')

		b.update({background: 'none'})
		expect(div.style.getPropertyValue('background')).toContain('none')
	})


	it('accepts objects without Object.prototype', () => {
		let div = document.createElement('div')
		let b = new lupos.StyleBinding(div)
		let style = Object.assign(Object.create(null), {color: 'red'})

		b.update(style)
		b.update(Object.create(null))
		expect(div.style.color).toBe('')
	})
})
