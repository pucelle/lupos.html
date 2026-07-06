import type {Component} from './component'


/** To cache `element -> component` map. */
const ElementComponentMap: WeakMap<Element, Component> = /*#__PURE__*/new WeakMap()

/** 
 * To cache elements for components which will be hydrated.
 * Map value is the child node should hydrate from.
 */
const WillHydrateFromMap: WeakMap<Element, ChildNode | null> = /*#__PURE__*/new WeakMap()



/** Add an `element -> component` map after component connected. */
export function addElementComponentMap(el: Element, com: Component) {
	ElementComponentMap.set(el, com)
}


/** Delete `element -> component` map after component disconnected. */
export function deleteElementComponentMap(el: Element) {
	ElementComponentMap.delete(el)
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
export function willHydrateFrom(el: Element, fromNode: ChildNode | null) {
	WillHydrateFromMap.set(el, fromNode)
}


/** Check the index that a component element need to be hydrated from. */
export function needsHydrateFrom(el: Element): ChildNode | null | undefined {
	return WillHydrateFromMap.get(el)
}


/** To complete hydration of element. */
export function completeHydration(el: Element) {
	WillHydrateFromMap.delete(el)
}

