/** All template types. */
export type TemplateType = 'html' | 'css' | 'svg'


/** 
 * Returns a HTML template literal, can be used to render or update a component.
 * Uses it like:
 * 
 * ```ts
 * html`...`
 * ```
 * 
 * It will be replaced to a `CompiledTemplateResult` object after compiled by `lupos`.
 */
export function html(strings: TemplateStringsArray, ...values: any[]): TemplateResult {
	return new TemplateResult('html', strings, values)
}


/** 
 * Returns a SVG template literal, can be used to render or update a component.
 * Uses it like:
 * 
 * ```ts
 * svg`...`
 * ```
 * 
 * It will be replaced to a `CompiledTemplateResult` object after compiled by `lupos`.
 */
export function svg(strings: TemplateStringsArray, ...values: any[]): TemplateResult {
	return new TemplateResult('svg', strings, values)
}


/** 
 * Returns a CSS template literal, can be used as component's `static style` property.
 * Uses it like:
 * 
 * ```ts
 * css`...`
 * ```
 */
export function css(strings: TemplateStringsArray, ...values: any[]): TemplateResult {
	return new TemplateResult('css', strings, values)
}


/**
 * Created from each html`...` or svg`...`.
 * Every time call `component.update` will generate a new template result,
 * then we will use this result to patch or replaced old one.
 */
export class TemplateResult {

	readonly type: TemplateType
	readonly strings: TemplateStringsArray | string[]
	readonly values: any[]

	constructor(type: TemplateType, strings: TemplateStringsArray | string[], values: any[]) {
		this.type = type
		this.strings = strings
		this.values = values
	}

	/** 
	 * Join strings and values to a string.
	 * Note after compiled `html` or `svg` type template,
	 * `toString()` is not available any more.
	 */
	toString(): string {
		let text = this.strings[0]

		for (let i = 0; i < this.strings.length - 1; i++) {
			let value = this.values[i]

			if (value !== null && value !== undefined) {
				if (Array.isArray(value)) {
					text += value.join('')
				}
				else {
					text += String(value)
				}
			}

			text += this.strings[i + 1]
		}

		return text
	}
}
