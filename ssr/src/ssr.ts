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


/** 
 * Must unique each time.
 * Several `DOMForSSR` should not exist at same time.
 */
export class SSR {

	readonly uri: string
	readonly window: Window
	readonly document: Document

	private styleFlushed: boolean = false

	constructor(uri: string) {
		this.uri = uri
		this.window = this.initWindow()
		this.document = this.window.document

		// Set `inSSR` to `true`.
		resetInSSR(true)
	}

	private initWindow(): Window {
		let parseHTML = linkedom.parseHTML as any

		let {window: win} = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>', {
			location: new URL(this.uri, 'https://lupos.html')
		})

		let global = globalThis as any

		global.window = win
		global.document = win.document
		global.devicePixelRatio = 1

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
		global.NodeFilter = win.NodeFilter

		// Missing in Linkedom env.
		if (!global.NodeFilter) {
			global.NodeFilter = {
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

		if (!global.CSS) {
			global.CSS = {
				supports: () => true,
				escape: (v: string) => v,
				px: (v: any) => `${v}px`,
				rem: (v: any) => `${v}rem`,
			}
		}

		if (!global.matchMedia) {
			window.matchMedia = (query) => ({
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

		if (!global.history) {
			global.history = {
				length: 0,
				state: null,
				pushState() {},
				replaceState() {},
				back() {},
				forward() {},
				go() {},
			}
		}

		global.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}

		global.requestAnimationFrame = function(callback: (timestamp: number) => void) {

			// Note here can't call callback immediately before returning.
			Promise.resolve().then(() => callback(0))
			
			return 0
		}

		global.cancelAnimationFrame = function(_id: number) {}

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

		await UpdateQueue.untilAllComplete()
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
		await UpdateQueue.untilAllComplete()

		if (promiseToWait) {
			await promiseToWait()
			await UpdateQueue.untilAllComplete()
		}

		com.el.setAttribute('ssr', '')
		return this.formatHTML(com.el.outerHTML)
	}

	private formatHTML(html: string) {
		return html.replace(/ (com|html|ssr)="\w*"(?=[^<>]*>)/g, ' $1')
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
		await UpdateQueue.untilAllComplete()

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
