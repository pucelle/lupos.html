import {Effector, Updatable, UpdateQueue} from 'lupos'
import {TemplateResult} from '../template'
import {inSSR} from '../ssr'


/** Type of the values returned from `Component.style()`. */
export type ComponentStyle = TemplateResult | (() => TemplateResult)

interface NamedStyle {
	name: string
	code: ComponentStyle | string
}


/** Class to insert style tags. */
class ToUpdateStyle implements Updatable {

	readonly iid: number = 0
	private styles: NamedStyle[] = []

	/** Add a component style. */
	add(name: string, style: ComponentStyle) {
		this.styles.push({name, code: style})

		// When SSR, not enqueue.
		if (this.styles.length === 1 && typeof requestAnimationFrame !== 'undefined') {
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
			this.createStyleElement(style.name, style.code, scriptTag)
		}

		// In SSR env, not reset it for next time rendering.
		if (!inSSR) {
			toUpdateStyle = null
		}
	}

	private groupStyles() {
		let group: NamedStyle[] = []
		let latestStringGroup: {name: string, code: string} | null = null

		for (let style of this.styles) {
			if (typeof style === 'function') {
				group.push(style)
			}
			else {
				if (!latestStringGroup) {
					latestStringGroup = {
						name: style.name,
						code: String(style.code),
					}
					group.push(latestStringGroup)
				}
				else {
					latestStringGroup.name += ', ' + style.name
					latestStringGroup.code += String(style.code)
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
	private createStyleElement(identifyName: string, code: ComponentStyle | string, scriptTag: HTMLElement | null) {
		let styleTag = document.createElement('style')
		styleTag.setAttribute('name', identifyName)

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
export function addComponentStyle(style: ComponentStyle, identifyName: string): ComponentStyle {
	if (!toUpdateStyle) {
		toUpdateStyle = new ToUpdateStyle()
	}
	toUpdateStyle.add(identifyName, style)
	return style
}


/** 
 * Flush component styles to style tags.
 * Normally only for SSR rendering.
 */
export function flushComponentStyles() {
	if (toUpdateStyle) {
		toUpdateStyle.willUpdate()
	}
}
