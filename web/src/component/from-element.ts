import type {Component} from './component'


/** To cache `element -> component` map. */
const ElementComponentMap: WeakMap<Element, Component> = /*#__PURE__*/new WeakMap()

/** To cache elements for components which will be hydrated. */
const WillHydrateMap: WeakSet<Element> = /*#__PURE__*/new WeakSet()



/** Add an `element -> component` map after component created. */
export function addElementComponentMap(el: Element, com: Component) {
	ElementComponentMap.set(el, com)
}


/** Get component instance by an associated element. */
export function getComponentByElement(el: Element): Component | undefined {
	return ElementComponentMap.get(el)
}


/** Test whether have component instance bound by an associated element. */
export function hasComponentByElement(el: Element): boolean {
	return ElementComponentMap.has(el)
}


/** Element related component will be hydrated later. */
export function willHydrate(el: Element) {
	WillHydrateMap.add(el)
}


/** 
 * Check whether an elements need to be hydrated.
 * After visited, element will be cleared.
 */
export function needsHydrateOnce(el: Element): boolean {
	let needs = WillHydrateMap.has(el)
	if (needs) {
		WillHydrateMap.delete(el)
	}

	return needs
}


