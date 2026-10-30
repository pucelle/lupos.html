import {UpdateQueue} from 'lupos'
import * as linkedom from 'linkedom'
import {Component, connectCustomElement, flushStyles, needsFlushStyles, render, RenderResult, reset_IN_SSR, reset_IN_SSR_PROD, resetOnPageInit, setSSRPaging, SSRPaging, waitHydrationGates} from '../../web/out'


// Cache page init callbacks.
const PageInitCallbacks: (() => void)[] = []

// Declare `onPageInit` for SSR environment.
function onPageInit(callback: () => void) {
	PageInitCallbacks.push(callback)
}

// Reset `onPageInit`.
resetOnPageInit(onPageInit)


// For SSR environment.
reset_IN_SSR(true)


/** 
 * Must unique each time.
 * Several `DOMForSSR` should not exist at same time.
 */
export class SSR {

	static domain: string = 'https://lupos.html'

	/** Set default domain for SSR. */
	static setDomain(domain: string) {
		this.domain = domain

		// Must set global location early before any SSR.
		globalThis.location = new URL(domain) as any
	}

	/** Check whether need to flush styles. */
	static get needsFlushStyles() {
		return needsFlushStyles
	}


	readonly uri: string
	readonly window: Window
	readonly document: Document

	private styleFlushed: boolean = false

	constructor(uri: string) {
		this.uri = uri
		this.window = this.initWindow()
		this.document = this.window.document

		// Reset env variable.
		reset_IN_SSR_PROD(new URL(location.href).searchParams.get('mode') === 'production')
		
		// Clear ssr paging settings.
		setSSRPaging(null)
	}

	private initWindow(): Window {
		let win = linkedom.parseHTML('<!DOCTYPE html><html><head></head><body></body></html>') as unknown as Window
		win.location = new URL(this.uri, SSR.domain) as any
		globalThis.location = win.location

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
		let html = this.formatHTML(rendered.el.innerHTML)

		rendered.remove(true)

		return html
	}

	/** 
	 * Render a render result to HTML codes.
	 * Note it will not connect custom elements internal.
	 * `tagName` can be used to render to custom tag, for later hydration easier.
	 */
	async renderComponent(Com: typeof Component, tagName: string = 'div', promiseToWait: (() => Promise<any>) | null = null): Promise<string> {
		
		// Wait for gate promises resolved.
		let promise = waitHydrationGates()
		if (promise) {
			await promise
		}

		let com = new Com(document.createElement(tagName))
		await com.connectManually()
		await UpdateQueue.untilComplete()

		if (promiseToWait) {
			await promiseToWait()
		}

		com.el.setAttribute('ssr', '')
		let html = this.formatHTML(com.el.outerHTML)

		com.remove()

		return html
	}

	private formatHTML(html: string) {
		return html.replace(/ (com)="\w*"(?=[^<>]*>)/g, ' $1')
			.replace(/ iid="\w*"(?=[^<>]*>)/g, '')
	}

	/** 
	 * Render document title, include `<title>` tag.
	 * Must after some components rendered, or will return `null`.
	 */
	renderTitle(): string | null {
		return this.document.head.querySelector('title')?.outerHTML ?? null
	}

	/** 
	 * Render all style codes which declared by css`...`.
	 * Although it can be called for multiple times, we would suggest
	 * you to import all components firstly, and render it for only once.
	 * 
	 * If `includeStyleTag` is `true`, will render `<style>...</style>`.
	 */
	renderStyles(includeStyleTag: boolean = false): string {
		
		// Flush styles after context initialized.
		if (!this.styleFlushed || needsFlushStyles) {
			flushStyles()
			this.styleFlushed = true
		}

		let style = this.document.head.querySelector('style[lupos]')
		if (!style) {
			return ''
		}

		style.removeAttribute('lupos')

		return this.formatHTML(includeStyleTag ? style.outerHTML : style.textContent)
	}

	/** Render link point to next page. */
	renderPagingLink(): string | null {
		if (SSRPaging && SSRPaging.current < SSRPaging.total) {
			return `<link rel="canonical" href="?page=${SSRPaging.current + 1}">`
		}

		return null
	}

	/** 
	 * Export whole document as string.
	 * Normally we would suggest you to render style and a entry component,
	 * and inject them to a html template.
	 */
	async toString(): Promise<string> {
		await this.connectCustomElements(this.document.body)
		await UpdateQueue.untilComplete()

		let output = this.document.toString()
		return output
	}

	private async connectCustomElements(root: Node) {
		for (let el of this.walkCustomElements(root)) {
			let connected = await connectCustomElement(el)

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
