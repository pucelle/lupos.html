import {UpdateQueue} from 'lupos'
import * as linkedom from 'linkedom'
import {connectCustomElement, flushComponentStyles, render, RenderResult, resetInSSR} from '../../web/out'


/** 
 * Must unique each time.
 * Several `DOMForSSR` should not exist at same time.
 */
export class SSR {

	readonly path: string
	readonly window: Window
	readonly document: Document

	constructor(path: string) {
		this.path = path
		this.window = this.initWindow()
		this.document = this.window.document

		// Flush styles after context initialized.
		flushComponentStyles()

		// Set `inSSR` to `true`.
		resetInSSR(true)
	}

	private initWindow(): Window {
		let parseHTML = linkedom.parseHTML as any

		let {window: win} = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>', {
			location: {href: 'https://lupos.html' + this.path}
		})

		let global = globalThis as any

		global.window = win
		global.document = win.document

		if (global.navigator) {
			Object.defineProperty(window, 'navigator', {
				value: win.navigator,
				configurable: true,
			})
		}
		else {
			global.navigator = win.navigator
		}

		global.location = win.location
		global.customElements = win.customElements

		global.HTMLElement = win.HTMLElement
		global.Node = win.Node

		global.requestAnimationFrame = function(callback: (timestamp: number) => void) {
			callback(0)
			return 0
		}

		global.cancelAnimationFrame = function(_id: number) {}

		return win
	}

	/** Mainly for testing. */
	async renderToString(toRender: RenderResult): Promise<string> {
		let rendered = render(toRender)
		rendered.connectManually()
		await UpdateQueue.untilAllComplete()
		return rendered.el.innerHTML
	}

	async toString(): Promise<string> {
		this.connectCustomElements()
		await UpdateQueue.untilAllComplete()
		return this.document.toString()
	}

	private connectCustomElements() {
		let customElements = [...document.querySelectorAll('*')]
			.filter(el => el.tagName.includes('-')) as HTMLElement[]

		for (let el of customElements) {
			connectCustomElement(el)

			// Indicates it's come from ssr.
			el.setAttribute('ssr', '')
		}
	}
}
