import {Binding} from "./bindings"

/** Values of Part Callback Parameter. */
export const enum PartCallbackParameterMask {

	/** 
	 * To be connected or disconnected from own state change,
	 * but not because of parent component connect or disconnect.
	 * 
	 * E.g., for `<lu:if {...}><div :binding />...`, for `:binding`:
	 * - After `<lu:if>` state change, it is true.
	 * - Otherwise no matter whole component connect or disconnect, it's false.
	 */
	FromOwnStateChange = 1,

	/** 
	 * If node will be directly inserted or removed from their parent,
	 * this value is true.
	 * 
	 * E.g., for `<lu:if {...}><div1 :transition><div2 :transition>...`, after `<lu:if>` state change:
	 * `div1` can play because it is "AsDirectNode".
	 * `div2` can't play because it is not "AsDirectNode".
	 */
	AsDirectNode = 2,

	/** 
	 * If node will be inserted or removed directly from their parent,
	 * and it's also a component, this value is true.
	 * 
	 * It exists because "AsDirectNode" itself doesn't broadcast to child components,
	 * but if connect or disconnect happens at an outer component, and the child component
	 * itself "AsDirectNode", we should transform it to "AsDirectContextNode" and pass it to
	 * this component, and inside it get transform back to "AsDirectNode" for component node.
	 * 
	 * Use it only internally.
	 */
	AsDirectContextNodeInternal = 4,

	/** 
	 * If nodes of current part has been connected or disconnected immediately,
	 * this value is true.
	 * 
	 * E.g., if any ancestral element was removed directly, or connect manually
	 * immediately, no transition needs to be played.
	 */
	MoveImmediately = 8,
}


/** 
 * Component, TemplateSlot, Template, partial Bindings implement it.
 * If a binding needs to implement `Part`, must implement both methods.
 */
export interface Part {

	/** 
	 * After node or any ancestral node of current part were inserted into document.
	 * 
	 * For component as a part, all data has been assigned,
	 * component has been enqueued to update, but hasn't been updated.
	 * All child parts haven't been updated too.
	 * 
	 * For other parts, the part has been totally updated already,
	 * and all child parts (exclude component) has been updated.
	 * 
	 * Will also broadcast connect callback recursively to all descendant parts.

	 * - `param`: AND byte operate of `PartCallbackParameterMask`.
	 */
	afterConnectCallback(param: PartCallbackParameterMask | 0): void

	/** 
	 * Before node or any ancestral node of current part are going to be removed.
	 * Please note `beforeDisconnectCallback` may be called for multiple times with
	 * same or different parameters.
	 * 
	 * Will also broadcast disconnect calling recursively to all descendant parts.
	 * 
	 * - `param`: AND byte operate of `PartCallbackParameterMask`.
	 */
	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void
}

/** Type of part position. */
export const enum PartConnectedState {

	/** Already disconnected. */
	Disconnected = 0,

	/** In disconnecting. */
	Disconnecting = 1,

	/** Connected. */
	Connected = 2,
}

/** Type of part position. */
export const enum PartPositionType {

	/** All other nodes. */
	Normal = 0,

	/** Use direct child node (not grandchild or other descendants) of template. */
	DirectChildNode = 1,

	/** Use context node. */
	ContextNode = 2,
}


/** Get content slot parameter from component callback parameter. */
export function getComponentSlotParameter(param: PartCallbackParameterMask | 0, isSlotTag: boolean): PartCallbackParameterMask | 0 {

	// Replace `AsDirectNode` to as `AsContextNode` for a component.
	if (param & PartCallbackParameterMask.AsDirectNode && !isSlotTag) {
		param &= ~PartCallbackParameterMask.AsDirectNode
		param |= PartCallbackParameterMask.AsDirectContextNodeInternal
	}

	// Remove `FromOwnStateChange`.
	param &= ~PartCallbackParameterMask.FromOwnStateChange
	
	return param
}


/** Get part callback parameter by template callback parameter and part position. */
export function getTemplatePartParameter(param: PartCallbackParameterMask | 0, position: PartPositionType): PartCallbackParameterMask | 0 {

	// Removes `AsDirectNode` if is in Direct Position.
	if (param & PartCallbackParameterMask.AsDirectNode) {
		if (position !== PartPositionType.DirectChildNode) {
			param &= ~PartCallbackParameterMask.AsDirectNode
		}
	}

	// If has `AsContextNode` and is in Context Position, replace to `AsDirectNode`.
	if (param & PartCallbackParameterMask.AsDirectContextNodeInternal) {
		param &= ~PartCallbackParameterMask.AsDirectContextNodeInternal

		if (position === PartPositionType.ContextNode) {
			param |= PartCallbackParameterMask.AsDirectNode
		}
	}

	return param
}


/** It delegate a part, and this part itself may be deleted or appended again. */
export class PartDelegator implements Part {

	protected bindingMaker: () => Binding & Part
	protected onBindingUpdated: ((binding: Binding & Part | null) => void) | undefined = undefined

	protected connectedState: PartConnectedState = PartConnectedState.Disconnected
	protected activated: boolean = false
	protected binding: Binding & Part | null = null

	constructor(bindingMaker: () => Binding & Part, onUpdated?: (binding: Binding & Part | null) => void) {
		this.bindingMaker = bindingMaker
		this.onBindingUpdated = onUpdated
	}

	update(activated: boolean, ...bindParams: any[]) {
		if (activated) {
			if (!this.binding) {
				this.binding = this.bindingMaker()
			}

			if (bindParams.length > 0) {
				this.binding.update!(...bindParams)
			}

			if (!this.activated && this.connectedState === PartConnectedState.Connected) {
				this.binding.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
				this.onBindingUpdated?.(this.binding)
			}
		}
		else {
			if (this.activated && this.binding && this.connectedState === PartConnectedState.Connected) {
				this.binding.beforeDisconnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
				this.onBindingUpdated?.(null)
			}
		}

		this.activated = activated
	}

	afterConnectCallback(param: PartCallbackParameterMask | 0) {
		if (this.connectedState === PartConnectedState.Connected) {
			return
		}

		if (this.activated) {
			this.binding?.afterConnectCallback(param | PartCallbackParameterMask.FromOwnStateChange)
		}

		this.connectedState = PartConnectedState.Connected
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void {

		// Already disconnected.
		if (this.connectedState === PartConnectedState.Disconnected) {
			return
		}

		// Must ensure part truly release, so should union `FromOwnStateChange`.
		let promise = this.activated
			? this.binding?.beforeDisconnectCallback(param | PartCallbackParameterMask.FromOwnStateChange)
			: undefined

		// When disconnecting, also broadcast it internally to pick up the promises.
		if (this.connectedState === PartConnectedState.Disconnecting) {
			return promise
		}

		// Wait for disconnecting.
		else if (promise) {
			this.connectedState = PartConnectedState.Disconnecting

			return promise.then(() => {
				if (this.connectedState === PartConnectedState.Disconnecting) {
					this.connectedState = PartConnectedState.Disconnected
				}
			})
		}

		// Immediately disconnected.
		else {
			this.connectedState = PartConnectedState.Disconnected
		}
	}
}