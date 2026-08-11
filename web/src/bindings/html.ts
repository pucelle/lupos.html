import {Binding} from './types'


/**
 * `:html` binding will update `innerHTML` property of current element.
 * Note html codes will replace to safe codes.
 * 
 * - `:html=${HTMLCodes}`
 * - `:html=${null | undefined}` for hydration will not reset html.
 */
export class HTMLBinding implements Binding {

	protected readonly el: HTMLElement
	protected htmlRendered: boolean

	constructor(el: Element) {
		this.el = el as HTMLElement
		this.htmlRendered = el.hasAttribute('html')
	}

	update(value: string | number | null | undefined) {

		// Not reset html if html pre-rendered, and provide null value.
		if (this.htmlRendered
			&& (value === null || value === undefined)
		) {
			return
		}

		// Not reset html if equals to pre-rendered
		if (this.htmlRendered
			&& typeof value === 'string'
			&& this.el.innerHTML === value
		) {
			return
		}

		// Re-parse HTML codes is expensive.
		this.el.innerHTML = value === null || value === undefined
			? ''
			: String(value)
	}
}
