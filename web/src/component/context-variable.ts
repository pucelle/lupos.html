import {InternalWeakPairKeysMap} from '../structs/map-weak'
import {Component} from './component'


/** 
 * Cache contextual variables of a component,
 * second key is the variable property name,
 * and the value is the source component where declare this property.
 */
export const ContextVariableUnionMap: InternalWeakPairKeysMap<Component, PropertyKey, Component> = /*#__PURE__*/new InternalWeakPairKeysMap()

export function setContextVariable(com: Component, prop: PropertyKey) {
	ContextVariableUnionMap.set(com, prop, com)
}

export function getContextVariableDeclared(com: Component, prop: PropertyKey): Component | undefined {
	let source = ContextVariableUnionMap.get(com, prop)
	if (source) {
		return (source as any)[prop]
	}

	source = findContextVariableDeclared(com, prop)
	if (source) {

		// Also cache for current component as a bridge for external components' querying.
		ContextVariableUnionMap.set(com, prop, source)
		return source
	}

	return undefined
}

/** Find source component where declares `@setContext prop`. */
function findContextVariableDeclared(com: Component, prop: PropertyKey): Component | undefined {
	let el: Element | null = com.el.parentElement

	while (el) {
		let com = Component.from(el)
		if (com) {
			let source = ContextVariableUnionMap.get(com, prop)
			if (source) {
				return source
			}

			return com
		}

		el = el.parentElement
	}

	return undefined
}

export function deleteContextVariables(com: Component): any {
	ContextVariableUnionMap.deleteOf(com)
}
