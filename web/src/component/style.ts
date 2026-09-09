import {Effector, Updatable, UpdateQueue} from 'lupos'
import {TemplateResult} from '../template'
import {IN_SSR} from '../ssr'


/** Type of the values returned from `Component.style()`. */
export type TemplateStyle = TemplateResult | (() => TemplateResult)

interface NamedStyle {
	name: string
	type: 'static' | 'dynamic'
	code: TemplateStyle | string
}


/** For global style name seeding. */
let globalNameSeed: number = 1

/** 
 * Whether changed styles and need to flush but not yet.
 * Only for SSR env.
 */
export let needsFlushStyles: boolean = false


/** Class to insert style tags. */
class ToUpdateStyle implements Updatable {

	readonly iid: number = 0
	private styles: Map<string, NamedStyle> = new Map()

	/** 
	 * Add a component style.
	 * Note the style content will replace original via name.
	 */
	add(name: string, style: TemplateStyle) {
		this.styles.set(name, {
			name,
			type: typeof style === 'function' ? 'dynamic' : 'static',
			code: `/* ${name} */\n` + style
		})

		// Only when not in SSR, will enqueue.
		// And only need to enqueue for once.
		if (IN_SSR) {
			needsFlushStyles = true
		}
		else if (this.styles.size === 1) {
			this.willUpdate()
		}
	}

	willUpdate() {
		UpdateQueue.enqueue(this)
	}

	update() {
		let group = this.groupStyles()
		let scriptTag = document.head.querySelector('script')

		for (let style of group) {
			this.createStyleElement(style.type, style.code, scriptTag)
		}
	}

	private groupStyles() {
		let group: NamedStyle[] = []
		let latestStringGroup: NamedStyle | null = null

		for (let style of this.styles.values()) {
			if (style.type === 'dynamic') {
				group.push(style)
			}
			else {
				if (!latestStringGroup) {
					latestStringGroup = {
						name: style.name,
						type: 'static', 
						code: String(style.code),
					}

					group.push(latestStringGroup)
				}
				else {
					latestStringGroup.name += ', ' + style.name
					latestStringGroup.code += '\n\n' + String(style.code)
				}
			}
		}

		return group
	}

	/** 
	 * Create <style> element and insert it into document head.
	 * `identifyName` should be `global` for global style.
	 * Always insert it into before any script tags.
	 * So you may put overwritten styles after script tag to avoid conflict.
	 */
	private createStyleElement(type: 'static' | 'dynamic', code: TemplateStyle | string, scriptTag: HTMLElement | null) {
		let styleTag = document.createElement('style')
		styleTag.setAttribute(type, '')

		if (typeof code === 'function') {
			new Effector(() => {
				styleTag.textContent = String((code as () => TemplateResult)())
			}).connect()
		}
		else {
			styleTag.textContent = code as string
		}
		
		document.head.insertBefore(styleTag, scriptTag)
	}
}

/** For inserting styles later. */
let toUpdateStyle: ToUpdateStyle | null = null


/** 
 * Add component style to document head as a style tag.
 * 
 * It will be compiled to accept component declared style,
 * and returns the style as original static property.
 */
export function addComponentStyle(style: TemplateStyle, identifyName: string): TemplateStyle {
	if (!toUpdateStyle) {
		toUpdateStyle = new ToUpdateStyle()
	}

	toUpdateStyle.add(identifyName, style)
	return style
}


/** 
 * Add a template style to document head as a style tag.
 * If you want new to replace old, specifies a static name.
 */
export function addStyle(style: TemplateStyle, name = 'global-' + globalNameSeed++) {
	if (!toUpdateStyle) {
		toUpdateStyle = new ToUpdateStyle()
	}

	toUpdateStyle.add(name, style)
}


/** 
 * Flush component styles to style tags.
 * Normally only for SSR rendering.
 * Can be called for multiple times.
 */
export function flushStyles() {
	if (toUpdateStyle) {
		toUpdateStyle.update()
		needsFlushStyles = false
	}
}
