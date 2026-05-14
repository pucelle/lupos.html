import {Binding} from './types'


/** Object used for `:class=${{class1: value1, class2: value2}}` */
type ClassObject = Record<string, any>


/**
 * `:class` binding will add class names to current element.
 * - `:class="class1 class2"` - Just like class name strings.
 * - `:class.className=${value}` - Add class name if `value` is `true` like. Support by compiler.
 * - `:class=${[class1, class2]}` - Add multiply class names from array.
 * - `:class=${{class1: value1, class2: value2}}` - Add multiply class names, whether add or remove depending on mapped values.
 * 
 * Note: compiler may replace this binding to equivalent codes.
 */
export class ClassBinding implements Binding {

	protected readonly el: Element
	protected lastClassNames: string[] = []

	/** Modifier `className` of `:class.className` will be replaced by compiler. */
	constructor(el: Element) {
		this.el = el
	}

	update(value: string | string[] | ClassObject) {
		if (Array.isArray(value)) {
			this.updateList(value)
		}
		else if (value && typeof value === 'object') {
			this.updateObject(value)
		}
		else if (typeof value === 'string') {
			this.updateString(value)
		}
	}

	/** 
	 * For compiling:
	 * - `:class="abc"`.
	 * - `:class=${value}` and `value` is inferred as object type.
	 */
	updateString(value: string) {
		let names = value.split(/\s+/)
		this.updateList(names)
	}

	/** 
	 * For compiling:
	 * - `:class.className=${booleanLike}`.
	 * - `:class=${value}` and `value` is inferred as array type.
	 */
	updateObject(value: ClassObject) {
		let names: string[] = []

		for (let key of Object.keys(value as any)) {
			if ((value as any)[key]) {
				names.push(key)
			}
		}

		this.updateList(names)
	}

	/** 
	 * For compiling:
	 * - `:class=${value}` and `value` is inferred as array type.
	 */
	updateList(value: string[]) {
		value = value.filter(v => v)

		for (let name of this.lastClassNames) {
			if (!value.includes(name)) {
				this.el.classList.remove(name)
			}
		}

		for (let name of value) {
			if (!this.lastClassNames.includes(name)) {
				this.el.classList.add(name)
			}
		}
		
		this.lastClassNames = value
	}
}
