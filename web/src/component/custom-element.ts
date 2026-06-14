import {getComponentByElement, willHydrateFrom} from './from-element'
import {ComponentConstructor} from './types'
import {PartCallbackParameterMask} from '../part'


/** Map custom element property to component property. */
type PropertyMapOf<T extends ComponentConstructor> = Record<string, keyof InstanceType<T>
	| [keyof InstanceType<T>, PropertyFormatter]>

/** Format an element property to a component property. */
type PropertyFormatter = (value: string) => any


/** To cache `custom element name -> component constructor` */
const CustomElementConstructorMap: Map<
	string,
	{Com: ComponentConstructor, propertyMap: PropertyMapOf<ComponentConstructor> | undefined}
> = /*#__PURE__*/new Map()


/**
 * Defines a custom element which will initialize specified component.
 * @param name The custom element name.
 * @param Com The Component class constructor.
 * @param propertyMap A map, which's key is custom element attribute name, and value is component property,
 *   or `[component property, formatter]`. Frequently used formatters can be `Number`, `String`, `JSON.parse`.
 * 
 * Note normally only when working with pure HTML codes,
 * you should define an custom element for initializing a component there.
 * Otherwise just refer a component in a template or new it directly.
 * 
 * Defining custom elements gains an additional benefit:
 * - the component will be automatically `connect` or `disconnected`
 *   after the element was connected or disconnected from document.
 */
export function defineCustomElement<T extends ComponentConstructor>(name: string, Com: T, propertyMap?: PropertyMapOf<T>) {
	if (!name.includes('-')) {
		throw new Error(`"${name}" can't be defined as custom element name, which must contain "-"!`)
	}

	CustomElementConstructorMap.set(name, {Com, propertyMap})
	defineCallbacks(name)
}

/** Defines custom element's connect and disconnect callbacks. */
function defineCallbacks(name: string) {
	if (typeof customElements === 'undefined') {
		return
	}

	customElements.define(name, class LuposElement extends HTMLElement {

		// W3C Spec says connect callback will not be called when inserting an element to a document fragment,
		// but I still find it is occurred sometimes.
		connectedCallback() {
			connectCustomElement(this)
		}

		// Note moving or removing element from its parent will dispatch disconnected callback each time.
		disconnectedCallback() {
			onCustomElementDisconnected(this)
		}
	})
}

/** 
 * Calls connect callback of specified custom element.
 * Returns whether truly connected.
 */
export function connectCustomElement(el: HTMLElement): boolean {
	if (!CustomElementConstructorMap.has(el.localName)) {
		return false
	}
	
	let com = getComponentByElement(el)

	// Component instance isn't created.
	if (!com) {

		// Will do hydration.
		if (el.hasAttribute('ssr')) {
			willHydrateFrom(el, el.firstChild)
		}

		let {Com, propertyMap} = CustomElementConstructorMap.get(el.localName)!
		com = new Com(el)

		if (propertyMap) {
			let props = makeProperties(el, propertyMap)
			Object.assign(com, props)
		}
	}

	com.afterConnectCallback(PartCallbackParameterMask.AsDirectNode)
	return true
}

/** Make a property parameter for initializing component. */
function makeProperties(el: HTMLElement, propertyMap: PropertyMapOf<any>): Record<PropertyKey, any> {
	let props: Record<PropertyKey, any> = {}

	for (let [attr, prop] of Object.entries(propertyMap)) {
		let value = el.getAttribute(attr)
		if (value === null) {
			continue
		}

		if (Array.isArray(prop)) {
			props[prop[0]] = prop[1](value)
		}
		else {
			props[prop] = value
		}
	}

	return props
}

/** Disconnect callback of custom element. */
function onCustomElementDisconnected(el: HTMLElement) {
	let com = getComponentByElement(el)
	if (com && com.connected) {
		com.beforeDisconnectCallback(
			PartCallbackParameterMask.AsDirectNode
			| PartCallbackParameterMask.MoveImmediately
		)
		
		console.warn(`Suggest you DON'T remove custom element directly, which will cause disconnect action cant work as expected! but remove component instead.`)
	}
}
