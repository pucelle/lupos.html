import {css, Component, html, defineCustomElement, RenderResult} from '../../../web/out'
import {SSR} from '../../../ssr/out'
import {describe, it, expect} from 'vitest'


class SSRTest extends Component {

	static style = css`.ssr-test{color: red;}`

	protected render(): RenderResult {
		return html`<template class="ssr-test">SSR</template>`
	}
}

defineCustomElement('ssr-test', SSRTest)


export function cleanHTML(code: string) {
	return code.replace(/ iid="\d+"/g, '').replace(/ com=".+?"/g, '')
}


describe('SSR', () => {
	it('ssr render', async () => {
		let ssr = new SSR('/')
		let rendered = (await ssr.render(html`<SSRTest>`))
		expect(cleanHTML(rendered)).toBe('<div class="ssr-test" com>SSR</div>')
	})

	it('ssr render component', async () => {
		let ssr = new SSR('/')
		let rendered = await ssr.renderComponent(SSRTest, 'ssr-test')
		expect(cleanHTML(rendered)).toBe('<ssr-test ssr class="ssr-test" com>SSR</ssr-test>')
	})

	it('ssr render style', async () => {
		let ssr = new SSR('/')
		let rendered = await ssr.renderStyles()
		expect(rendered).toBe('.ssr-test{color: red;}')
	})
})
