import {Binding} from './types'


/**
 * `:unsafeHTML` binding will update `innerHTML` property of current element.
 * Note html codes will replace to safe codes.
 * 
 * - `:unsafeHTML=${HTMLCodes}`
 * - `:unsafeHTML=${null | undefined}` for hydration will not reset html.
 */
export class unsafeHTML implements Binding {

	protected readonly el: HTMLElement

	constructor(el: Element) {
		this.el = el as HTMLElement
	}

	update(value: string | number | null | undefined) {

		// Re-parse HTML codes is expensive.
		this.el.innerHTML = value === null || value === undefined
			? ''
			: cleanUnsafeHTML(String(value))
	}
}


/** Clean all unsafe html tags and events, like `<script>`, `onerror=...` */
function cleanUnsafeHTML(html: string): string {
	let template = document.createElement('template')
	template.innerHTML = html

	for (let script of template.content.querySelectorAll('script')) {
		script.remove()
	}

	for (let el of template.content.querySelectorAll('*')) {
		for (let attr of [...el.attributes]) {
			if (/^on/i.test(attr.name)) {
				el.removeAttribute(attr.name)
			}
		}
	}

	return template.innerHTML
}
