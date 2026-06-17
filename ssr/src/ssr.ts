import {UpdateQueue} from 'lupos'
import * as linkedom from 'linkedom'
import {Component, connectCustomElement, flushStyles, render, RenderResult, resetInSSR, resetOnPageInit} from '../../web/out'


// Cache page init callbacks.
const PageInitCallbacks: (() => void)[] = []

// Declare `onPageInit` for SSR environment.
function onPageInit(callback: () => void) {
	PageInitCallbacks.push(callback)
}

// Reset `onPageInit`.
resetOnPageInit(onPageInit)


// For SSR environment.
resetInSSR(true)


// Missing in Linkedom env.
if (!globalThis.location) {
	globalThis.location = new URL('https://lupos.html') as any
}

if (!globalThis.NodeFilter) {
	globalThis.NodeFilter = {
		FILTER_ACCEPT: 1,
		FILTER_REJECT: 2,
		FILTER_SKIP: 3,

		SHOW_ALL: 0xFFFFFFFF,
		SHOW_ELEMENT: 0x1,
		SHOW_ATTRIBUTE: 0x2,
		SHOW_TEXT: 0x4,
		SHOW_CDATA_SECTION: 0x8,
		SHOW_ENTITY_REFERENCE: 0x10,
		SHOW_ENTITY: 0x20,
		SHOW_PROCESSING_INSTRUCTION: 0x40,
		SHOW_COMMENT: 0x80,
		SHOW_DOCUMENT: 0x100,
		SHOW_DOCUMENT_TYPE: 0x200,
		SHOW_DOCUMENT_FRAGMENT: 0x400,
		SHOW_NOTATION: 0x800,
	}
}

if (!globalThis.CSS) {
	globalThis.CSS = {
		supports: () => true,
		escape: (v: string) => v,
		px: (v: any) => new CSSUnitValue(v, 'px'),
		em: (v: any) => new CSSUnitValue(v, 'em'),
		rem: (v: any) => new CSSUnitValue(v, 'rem'),
	} as any
}

if (!globalThis.matchMedia) {
	globalThis.matchMedia = (query) => ({
		matches: true,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true,
	})
}

if (!globalThis.history) {
	globalThis.history = {
		length: 0,
		state: null,
		pushState() {},
		replaceState() {},
		back() {},
		forward() {},
		go() {},
		scrollRestoration: 'auto',
	}
}

if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
}

if (!globalThis.requestAnimationFrame) {
	globalThis.requestAnimationFrame = function(callback: (timestamp: number) => void) {

		// Note here can't call callback immediately before returning.
		Promise.resolve().then(() => callback(0))
		
		return 0
	}
}

if (!globalThis.cancelAnimationFrame) {
	globalThis.cancelAnimationFrame = function(_id: number) {}
}

if (!globalThis.devicePixelRatio) {
	globalThis.devicePixelRatio = 1
}



/** 
 * Must unique each time.
 * Several `DOMForSSR` should not exist at same time.
 */
export class SSR {

	static domain: string = 'https://lupos.html'

	/** Set default domain for SSR. */
	static setDomain(domain: string) {
		this.domain = domain
		globalThis.location = new URL(domain) as any
	}


	readonly uri: string
	readonly window: Window
	readonly document: Document

	private styleFlushed: boolean = false

	constructor(uri: string) {
		this.uri = uri
		this.window = this.initWindow()
		this.document = this.window.document
	}

	private initWindow(): Window {
		let parseHTML = linkedom.parseHTML as any

		let {window: win} = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>', {
			location: new URL(this.uri, SSR.domain)
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
		global.history = win.history
		global.customElements = win.customElements

		global.HTMLElement = win.HTMLElement
		global.Element = win.Element
		global.Node = win.Node

		for (let callback of PageInitCallbacks) {
			callback()
		}

		return win
	}

	/** 
	 * Render a render result to HTML codes.
	 * Note it will not connect custom elements internal.
	 * Normally for testing.
	 */
	async render(toRender: RenderResult): Promise<string> {
		let rendered = render(toRender)
		await rendered.connectManually()

		await UpdateQueue.untilComplete()
		return this.formatHTML(rendered.el.innerHTML)
	}

	/** 
	 * Render a render result to HTML codes.
	 * Note it will not connect custom elements internal.
	 * `tagName` can be used to render to custom tag, for later hydration easier.
	 */
	async renderComponent(Com: typeof Component, tagName: string = 'div', promiseToWait: (() => Promise<any>) | null = null): Promise<string> {
		let com = new Com(document.createElement(tagName))
		await com.connectManually()
		await UpdateQueue.untilComplete()

		if (promiseToWait) {
			await promiseToWait()
		}

		com.el.setAttribute('ssr', '')
		return this.formatHTML(com.el.outerHTML)
	}

	private formatHTML(html: string) {
		return html.replace(/ (com)="\w*"(?=[^<>]*>)/g, ' $1')
			.replace(/ iid="\w*"(?=[^<>]*>)/g, '')
	}

	/** 
	 * Render document title, include `<title>` tag.
	 * Must after some components rendered.
	 */
	renderTitle(): string {
		return this.document.head.querySelector('title')!.outerHTML
	}

	/** 
	 * Render all style codes which declared by css`...`.
	 * Although it can be called for multiple times, we would suggest
	 * you to import all components firstly, and render it for only once.
	 */
	async renderStyles(): Promise<string> {
		
		// Flush styles after context initialized.
		if (!this.styleFlushed) {
			await flushStyles()
			this.styleFlushed = true
		}

		let style = this.document.head.querySelector('style[static]')
		if (!style) {
			return ''
		}

		style.removeAttribute('static')
		style.setAttribute('ssr', '')

		return this.formatHTML(style.outerHTML)
	}

	/** 
	 * Export whole document as string.
	 * Normally we would suggest you to render style and a entry component,
	 * and inject them to a html template.
	 */
	async toString(): Promise<string> {
		this.connectCustomElements(this.document.body)
		await UpdateQueue.untilComplete()

		let output = this.document.toString()
		return output
	}

	private connectCustomElements(root: Node) {
		for (let el of this.walkCustomElements(root)) {
			let connected = connectCustomElement(el)

			// Indicates it's come from ssr.
			if (connected) {
				el.setAttribute('ssr', '')
			}
		}
	}

	private *walkCustomElements(root: Node): Iterable<HTMLElement> {
		const walker = document.createTreeWalker(
			root,
			NodeFilter.SHOW_ELEMENT,
			{
				acceptNode(node: Element) {
					return node.localName.includes('-') 
						? NodeFilter.FILTER_ACCEPT 
						: NodeFilter.FILTER_SKIP
				}
			}
		)

		let currentNode;
		while (currentNode = walker.nextNode()) {
			yield currentNode as HTMLElement
		}
	}
}
