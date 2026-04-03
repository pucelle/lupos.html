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
		expect(div.style.cssText).toEqual('color: red; background: none;')
	})


	it(':style.name=${...}', () => {
		let div = document.createElement('div')
		div.style.cssText = 'color: red'
		let b = new lupos.StyleBinding(div)

		b.update({background: '#fff'})
		expect(div.style.cssText).toEqual('color: red; background: #fff;')

		b.update({background: 'none'})
		expect(div.style.cssText).toEqual('color: red; background: none;')
	})


	it(':style=${{...}}', () => {
		let div = document.createElement('div')
		div.style.cssText = 'color: red'
		let b = new lupos.StyleBinding(div)

		b.update({background: '#fff', flex: '1'})
		expect(div.style.cssText).toEqual('color: red; background: #fff; flex-grow: 1; flex-shrink: 1; flex-basis: 0%;')

		b.update({background: 'none'})
		expect(div.style.cssText).toEqual('color: red; background: none;')
	})
})