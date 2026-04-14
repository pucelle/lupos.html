import {Binding} from './types'


/**
 * `:html` binding will update `innerHTML` property of current element.
 * Note html codes will replace to safe codes.
 * - `:html=${HTMLCodes}`
 */
export class HTMLBinding implements Binding {

	private readonly el: HTMLElement
	private htmlRendered: boolean

	constructor(el: Element) {
		this.el = el as HTMLElement
		this.htmlRendered = el.hasAttribute('html')
	}

	update(value: string | number | null | undefined) {
		if (this.htmlRendered
			&& typeof value === 'string'
			&& this.el.innerHTML === value
		) {
			return
		}

		// Re-parse HTML codes is expensive.
		this.el.innerHTML = value === null || value === undefined
			? ''
			: cleanUnsafeHTML(String(value))
	}
}


/** Clean all unsafe html tags and events, like `<script>`, `onerror=...` */
function cleanUnsafeHTML(html: string): string {
	return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script\s*>/gi, '')
		.replace(/<\w+[\s\S]*?>/g, function(m0: string) {
			return m0.replace(/\s*on\w+\s*=\s*(['"])?.*?\1/g, '')
		})
}