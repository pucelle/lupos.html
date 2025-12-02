import {ContextVariableConstructor, EventFirer, Observed, UpdateQueue, beginTrack, endTrack, Updatable, promisify, promiseWithResolves} from 'lupos'
import {ComponentStyle} from './style'
import {addElementComponentMap, getComponentByElement} from './from-element'
import {TemplateSlot, SlotPosition, SlotPositionType, CompiledTemplateResult, SlotContentType} from '../template'
import {ComponentConstructor, RenderResult} from './types'
import {getComponentSlotParameter, Part, PartCallbackParameterMask} from '../part'
import {SlotRange} from '../template/slot-range'
import {deleteContextVariables, getContextVariableDeclared, setContextVariable} from './context-variable'


export interface ComponentEvents {

	/** 
	 * After component's element was inserted into document,
	 * and component itself has been assigned properties.
	 * Component hasn't updated, but have been enqueued to update.
	 * Will be dispatched every time the component's element entered into document.
	 * 
	 * You may assign some more properties or register events here.
	 */
	'connected': () => void

	/** 
	 * After component's element will soon be removed from document.
	 * Will be dispatched every time the component's element will be removed from document.
	 * 
	 * You may cache some dom properties or release events here.
	 */
	'will-disconnect': () => void

	/** 
	 * After every time the component get updated.
	 * All the data, child nodes, child components are ready.
	 * But child components were not updated.
	 * 
	 * Child components has been referenced, and have accepted data assignments,
	 * You may continue to change properties what will be assigned to child components,
	 * like reading element size, and assign to child components.
	 */
	'updated': () => void
}


/** Current of `component.incrementalId`. */
let IncrementalId = 1


/** Components state. */
const enum ComponentStateMask {
	Created = 2 ** 0,
	ReadyAlready = 2 ** 1,
	Connected = 2 ** 2,
	WillCallConnectCallback = 2 ** 3,
}


/** 
 * Super class of all the components.
 * @typeparam `E`: Event interface in `{eventName: (...args) => void}` format.
 * 
 * Connect Lifecycle:
 *  - Parent `afterConnectCallback`, from element appending to dom, parent connecting, or custom element initializing
 *  - Parent `onCreated` for only once
 *  - Parent `onConnected`
 *  	- Parent watchers, effectors, computers get enqueued
 *  - Parent fires `connected` event
 *  - Parent to be enqueued
 * 	- ----Queue callback
 * 		- See Update Lifecycle below
 *  	- Parent `onReady` for only once
 * 
 * Update Lifecycle:
 *  - Parent watchers, effectors, computers get updated in their declaration order.
 *  - Parent `update` from newly render result, apply data to each child part
 *  	- Enqueue Child1 watchers, effectors, computers
 * 		- Enqueue Child1 to update.
 * 		- Enqueue Child2 watchers, effectors, computers
 * 		- Enqueue Child2 to update.
 *  - Parent `onUpdated`
 *  - Parent fires `updated` event
 *  - ----Queue callback
 *  	- Child1 and Child2 watchers, effectors, computers of Child1 and Child2
 *  	- Child1 update like Parent
 *  	- Child2 update like Parent
 * 
 * Disconnect Lifecycle:
 *  - Parent `beforeDisconnectCallback`, from element removing from dom, or parent disconnecting.
 *  - Parent `onWillDisconnect`
 * 		- Parent watchers, effectors, computers get disconnected
 *  - Parent fires `will-disconnect`
 *  - Parent disconnect each child part
 * 		- Each child's disconnect lifecycle works just like parent
 */
export class Component<E = any> extends EventFirer<E & ComponentEvents> implements Part, Updatable, Observed {

	/** 
	 * After a source component connected,
	 * set context variables declared by `@setContext`.
	 * Implemented from `ContextVariableConstructor`.
	 */
	static setContextVariable: ContextVariableConstructor['setContextVariable'] = setContextVariable

	/**
	 * Get source component where declares `@setContext prop`,
	 * from it's descendant component which declares `@useContext prop`.
	 * Implemented from `ContextVariableConstructor`.
	 */
	static getContextVariableDeclared: ContextVariableConstructor['getContextVariableDeclared'] = getContextVariableDeclared

	/** 
	 * After component disconnected,
	 * delete it's context variables.
	 * Implemented from `ContextVariableConstructor`.
	 */
	static deleteContextVariables: ContextVariableConstructor['deleteContextVariables'] = deleteContextVariables

	/** 
	 * Get component instance from an element.
	 * Returned result will be auto-inferred as instance of current constructor, so please ensure they are.
	 * @param element: The element to get component instance at.
	 */
	static from<C extends {new (...args: any): any}>(this: C, element: Element): InstanceType<C> | null {
		return getComponentByElement(element) as any
	}

	/** 
	 * Get closest ancestor element (or self) which is the instance of specified component constructor.
	 * @param element: The element from which to check component instance.
	 * @param searchDepth: Max search depth, default value is `30`.
	 */
	static fromClosest<C extends {new (...args: any): any}>(this: C, element: Element, searchDepth: number = 50): InstanceType<C> | null {
		let el: Element | null = element
		let depth = 0

		while (el) {
			let com = Component.from(el)
			if (com instanceof this) {
				return com as InstanceType<C>
			}
	
			el = el.parentElement

			if (depth >= searchDepth) {
				break
			}

			depth++
		}

		return null
	}

	/**
	 * Provides a global css content, used as styles for current component.
	 * Although it supports dynamic css content, we would suggest using only static css content.
	 */
	static style: ComponentStyle | null = null

	/** Compiler will add this property after analysis render result. */
	static SlotContentType: SlotContentType | null = null


	/** The root element of component. */
	readonly el: HTMLElement

	/** 
	 * Help to identify the creation orders of component,
	 * or for debugging a specified component.
	 * Only for internal usages.
	 */
	readonly iid: number = IncrementalId++

	/** State of current component, byte mask type. */
	protected $stateMask: ComponentStateMask | 0 = 0

	/** Help to patch render result to current element. */
	protected $contentSlot!: TemplateSlot<any>

	/** 
	 * Cache range of rest slot content,
	 * which will be used to fill `<slot />` element the component itself render.
	 */
	protected $restSlotRange: SlotRange | null = null

	/**
	 * Caches slot elements which are marked as `<... slot="slotName">`.
	 * You should re-define the detailed type like `{name1: Element, ...}` in derived components.
	 */
	protected slotElements: Record<string, Element | null> = {}

	constructor(el: HTMLElement = document.createElement('div')) {
		super()
		this.el = el
		addElementComponentMap(el, this)
	}

	/** 
	 * Whether current component was connected into document.
	 * Readonly outside of component.
	 */
	get connected(): boolean {
		return (this.$stateMask & ComponentStateMask.Connected) > 0
	}

	/** After any tracked data change, enqueue it to update in next animation frame. */
	willUpdate() {
		if (!this.connected) {
			return
		}

		// Component create earlier, update earlier.
		UpdateQueue.enqueue(this)
	}
	
	/** 
	 * Doing update immediately.
	 * Can be an async function, and can call `untilChildUpdateComplete`
	 * inside to wait for child components update completed.
	 */
	update(this: Component<{}>): void | Promise<void> {
		if (!this.connected) {
			return
		}

		this.updateRendering()
		this.onUpdated()
		this.fire('updated')
	}

	/** Update and track rendering contents. */
	protected updateRendering() {
		beginTrack(this)
		let result: CompiledTemplateResult | CompiledTemplateResult[] | string | null

		try {
			result = this.render() as typeof result
		}
		catch (err) {
			result = null
			console.warn(err)
		}

		this.$contentSlot.update(result)

		// `endTrack` here is important.
		// This will cause can track the update process of `ForBlock`.
		endTrack()
	}

	/** 
	 * Defines the results the current component should render.
	 * Child class should overwrite this method, normally returns html`...` or a string.
	 * You can choose to not overwrite `render()` to keep it returns `null`,
	 * when you don't want to render any child nodes.
	 */
	protected render(): RenderResult {
		return null
	}

	/** Init `contentSlot`. */
	protected initContentSlot(): TemplateSlot {
		let position = new SlotPosition<SlotPositionType.AfterContent>(SlotPositionType.AfterContent, this.el)
		let Com = this.constructor as ComponentConstructor

		return new TemplateSlot(position, Com.SlotContentType!)
	}
	
	/**
	 * Called when component was connected and all properties were assigned.
	 * All the child nodes are not prepared yet, until `onReady`.
	 * 
	 * You may change properties, visit `el` or parent nodes,
	 * or register some component events here.
	 * 
	 * Fired for only once.
	 */
	protected onCreated() {}

	/** 
	 * After every time the component get updated.
	 * All the data, child nodes, child components are ready.
	 * But child components were not updated.
	 * 
	 * Child components has been referenced, and have accepted data assignments,
	 * You may continue to change properties what will be assigned to child components,
	 * like reading element size, and assign to child components.
	 */
	protected onUpdated() {}

	/**
	 * Called when component is updated for the first time.
	 * All the data, nodes of current component are ready.
	 * But child components were not updated.
	 *
	 * You can visit all child nodes, and can access and assign
	 * properties to child components by their references.
	 * 
	 * This fires for only once.
	 */
	protected onReady() {}

	/** 
	 * After component's element was inserted into document,
	 * and component itself haven't been updated, but have been enqueued to update.
	 * Will be dispatched every time the component's element entered into document.
	 * 
	 * You may assign some properties or register events here.
	 * 
	 * If you need to register global listeners like `resize` when element exist in document,
	 * or watch non-self properties, you should register them here.
	 * 
	 * If choose to overwrite `onConnected`, Never forget to call `super.onConnected()`.
	 */
	protected onConnected() {}

	/** 
	 * After component's element will soon be removed from document.
	 * Will be dispatched every time the component's element will be removed from document.
	 * 
	 * You may cache some dom properties or release events here.
	 * 
	 * If you need to register global listeners like `resize` when element exist in document,
	 * or watch non-self properties, you should unregister them here.
	 * 
	 * If choose to overwrite `onWillDisconnect`, Never forget to call `super.onWillDisconnect()`.
	 */
	protected onWillDisconnect() {}

	/** 
	 * Calls callback after the component get updated for the next time.
	 * Note you need to ensure current component has been enqueued, or will be enqueued soon.
	 * Note if immediately disconnected, `callback` may never be called.
	 */
	whenUpdated(this: Component<{}>, callback: () => void) {
		if (UpdateQueue.hasEnqueued(this)) {
			this.once('updated', callback)
		}
		else {
			Promise.resolve().then(() => {
				if (UpdateQueue.hasEnqueued(this)) {
					this.once('updated', callback)
				}
				else {
					callback()
				}
			})
		}
	}

	/** Returns a promise which will be resolved after the component is next time connected. */
	whenConnected(this: Component<{}>, callback: () => void) {
		this.once('connected', callback)
	}

	/** Returns a promise which will be resolved after the component is next time will disconnect. */
	whenWillDisconnect(this: Component<{}>, callback: () => void) {
		this.once('will-disconnect', callback)
	}

	/** 
	 * Returns a promise which will be resolved after the component is next time updated.
	 * Note you need to ensure current component has been enqueued, or will be enqueued soon.
	 * Note if immediately disconnected, this may never be resolved.
	 * 
	 * If want to interpolate data before child component updated,
	 * we would suggest using `whenUpdate(...)`.
	 */
	untilUpdated(this: Component<{}>): Promise<void> {
		return promisify(this.whenUpdated, this)
	}

	/** Returns a promise which will be resolved after the component is next time connected. */
	untilConnected(this: Component<{}>): Promise<void> {
		return promisify(this.whenConnected, this)
	}

	/** Returns a promise which will be resolved after the component is next time will disconnect. */
	untilWillDisconnect(this: Component<{}>): Promise<void> {
		return promisify(this.whenWillDisconnect, this)
	}

	/** 
	 * Calls callback after all children, and all descendant components update completed.
	 * 
	 * Use it when you need to wait for child and descendant components
	 * update completed and do some measurement.
	 * 
	 * Note you need to ensure current component has been enqueued or is updating,
	 * or will be enqueued soon.
	 * 
	 * ```ts
	 * update() {
	 *     this.updateRendering()
	 *     this.whenChildComplete(this.doMoreAfterChildUpdateCompleted)
	 *     ...
	 * }
	 * ```
	 * 
	 * or 
	 * 
	 * ```ts
	 * com.willUpdate()
	 * com.whenChildComplete(doMoreAfterChildUpdateCompleted)
	 * ```
	 */
	whenChildComplete(this: Component, callback: () => void) {
		if (UpdateQueue.hasEnqueued(this)) {
			UpdateQueue.whenChildComplete(this, callback)
		}
		else {
			Promise.resolve().then(() => {
				if (UpdateQueue.hasEnqueued(this)) {
					UpdateQueue.whenChildComplete(this, callback)
				}
				else {
					callback()
				}
			})
		}
	}

	/** 
	 * Returns a promise, which will be resolved after all children,
	 * and all descendants update completed.
	 * 
	 * Use it when you need to wait for child and descendant components
	 * update completed and do some measurement.
	 * 
	 * ```ts
	 * async update() {
	 *     this.updateRendering()
	 *     await UpdateQueue.untilChildComplete()
	 *     await barrierDOMReading()
	 *     ...
	 * }
	 * ```
	 * 
	 * or 
	 * 
	 * ```ts
	 * com.willUpdate()
	 * await com.untilChildComplete()
	 * ...
	 * ```
	 */
	untilChildComplete(): Promise<void> {
		let {promise, resolve} = promiseWithResolves<void>()
		this.whenChildComplete(resolve)
		return promise
	}

	/** 
	 * When a dynamic component is replaced by another,
	 * transfer all the slot contents to it.
	 * For internal usage only.
	 */
	$transferSlotContents(toCom: Component) {
		toCom.slotElements = this.slotElements
		toCom.$restSlotRange = this.$restSlotRange
	}

	/** 
	 * For `:slot=slotName` binding to apply slot elements,
	 * which may be used later to fill `<slot name=slotName>` inside current component context.
	 * For internal usage only.
	 */
	$setSlotElement(slotName: string, el: Element | null) {
		this.slotElements[slotName] = el
	}

	/** 
	 * Get element by specified slot name,
	 * and use it to fill `<slot name=slotName>` inside current component context.
	 * For internal usage only, and be called by compiled codes.
	 */
	$getSlotElement(slotName: string): Element | null {
		return this.slotElements[slotName]
	}

	/** 
	 * Apply rest slot range from a dynamic component,
	 * which may be used to fill `<slot>` inside current component context.
	 * For internal usage only, and will be called by compiled codes.
	 */
	$applyRestSlotRange(slotRange: SlotRange) {
		this.$restSlotRange = slotRange
	}

	/** 
	 * Apply rest slot range nodes, which may be used to fill `<slot>` inside current component context.
	 * For internal usage only, and will be called by compiled codes.
	 */
	$applyRestSlotRangeNodes(startInnerNode: ChildNode, endInnerNode: ChildNode = startInnerNode) {
		this.$restSlotRange = new SlotRange(startInnerNode, endInnerNode)
	}

	/** 
	 * Get list of rest slot nodes.
	 * Use these nodes to fill `<slot />` element that the component itself render.
	 * For internal usage only, and be called by compiled codes.
	 */
	$getRestSlotNodes(): ChildNode[] {
		return this.$restSlotRange ? [...this.$restSlotRange.walkNodes()] : []
	}

	afterConnectCallback(this: Component<{}>, param: PartCallbackParameterMask | 0) {
		if (this.connected) {
			return
		}

		if ((this.$stateMask & ComponentStateMask.Created) === 0) {
			this.$stateMask |= ComponentStateMask.Created
			this.$contentSlot = this.initContentSlot()
			this.onCreated()
		}

		this.$stateMask |= (ComponentStateMask.Connected | ComponentStateMask.WillCallConnectCallback)

		// Postpone to connect child after updated.
		// So it keeps consist with normal enqueuing update logic,
		// and and visit child references before it updates.
		this.once('updated', () => {
			if ((this.$stateMask & ComponentStateMask.WillCallConnectCallback) === 0) {
				return
			}

			this.$stateMask &= ~ComponentStateMask.WillCallConnectCallback
			
			// Call connect callback if not yet.
			let slotParam = getComponentSlotParameter(param)
			this.$contentSlot.afterConnectCallback(slotParam)

			// Call ready if not yet.
			if ((this.$stateMask & ComponentStateMask.ReadyAlready) === 0) {
				this.$stateMask |= ComponentStateMask.ReadyAlready
				this.onReady()
			}
		})

		// Earlier than `onConnected` because may calls `untilUpdated()` there.
		this.willUpdate()

		// After binding `updated` because may bind more `updated` events in `onConnected`.
		this.onConnected()
		this.fire('connected')
	}

	beforeDisconnectCallback(this: Component<{}>, param: PartCallbackParameterMask | 0): Promise<void> | void {
		if (!this.connected) {
			return
		}

		this.$stateMask &= ~ComponentStateMask.Connected
		this.onWillDisconnect()
		this.fire('will-disconnect')

		// If haven't called connect callback, not call disconnect callback also.
		if (this.$stateMask & ComponentStateMask.WillCallConnectCallback) {
			this.$stateMask &= ~ComponentStateMask.WillCallConnectCallback
			return
		}

		return this.$contentSlot.beforeDisconnectCallback(getComponentSlotParameter(param))
	}

	/** Whether has some real content rendered. */
	hasContentRendered(): boolean {
		return this.$contentSlot && this.$contentSlot.hasContent()
	}

	/** Append current element into a container, and do connect.
	 * If `canPlayEnterTransition` is specified as `true`, which is also default action,
	 * will play enter transition after appended.
	 */
	appendTo(container: Element, canPlayEnterTransition: boolean = true) {
		if (this.connected) {
			this.remove()
		}

		container.append(this.el)
		
		if (document.contains(this.el)) {
			let mask = PartCallbackParameterMask.AsDirectNode

			if (!canPlayEnterTransition) {
				mask |= PartCallbackParameterMask.MoveImmediately
			}
			
			this.afterConnectCallback(mask)
		}
	}

	/** 
	 * Insert current element before an element, and do connect.
	 * If `canPlayEnterTransition` is specified as `true`, which is also default action,
	 * will play enter transition after inserted.
	 */
	insertBefore(sibling: Element, canPlayEnterTransition: boolean = true) {
		if (this.connected) {
			this.remove()
		}

		sibling.before(this.el)

		if (document.contains(this.el)) {
			let mask = PartCallbackParameterMask.AsDirectNode

			if (!canPlayEnterTransition) {
				mask |= PartCallbackParameterMask.MoveImmediately
			}

			this.afterConnectCallback(mask)
		}
	}

	/** 
	 * Insert current element after an element, and do connect.
	 * If `canPlayEnterTransition` is specified as `true`, which is also default action,
	 * will play enter transition after inserted.
	 */
	insertAfter(sibling: Element, canPlayEnterTransition: boolean = true) {
		if (this.connected) {
			this.remove()
		}

		sibling.after(this.el)

		if (document.contains(this.el)) {
			let mask = PartCallbackParameterMask.AsDirectNode

			if (!canPlayEnterTransition) {
				mask |= PartCallbackParameterMask.MoveImmediately
			}

			this.afterConnectCallback(mask)
		}
	}

	/** 
	 * Remove or will remove element from document.
	 * By default it disconnect immediately and will not play any leave transition,
	 * except `canPlayLeaveTransition` specified as `true`.
	 * 
	 * `remove` process with transitions may failed if immediately appended again,
	 * in this scenario leave transitions will be stopped,
	 * can visit `connected` to know whether remove successfully.
	 */
	remove(canPlayLeaveTransition: boolean = false): Promise<void> | void {
		if (!this.connected) {
			return
		}

		let mask: PartCallbackParameterMask = PartCallbackParameterMask.AsDirectNode

		if (!canPlayLeaveTransition) {
			mask |= PartCallbackParameterMask.MoveImmediately
		}

		let result = this.beforeDisconnectCallback(mask)

		// Wait for disconnect promise, then remove node.
		if (canPlayLeaveTransition && result) {
			return result.then(() => {
				if (!this.connected) {
					this.el.remove()
				}
			})
		}
		else {
			this.el.remove()
		}
	}

	/** 
	 * Connect current component manually even it's not in document,
	 * and also wait for component get updated.
	 * Skip and return `true` if already connected.
	 * Returns false if get disconnected before updated.
	 */
	async connectManually(this: Component): Promise<boolean> {
		if (this.connected) {
			return true
		}

		let param: PartCallbackParameterMask = PartCallbackParameterMask.AsDirectNode
			| PartCallbackParameterMask.MoveImmediately

		this.afterConnectCallback(param)

		await Promise.race([this.untilUpdated(), this.untilWillDisconnect()])
		return this.connected
	}
}


// For localhost debugging.
/*#__PURE__*/(() => {
	if (typeof location !== 'undefined'
		&& (location.hostname === "localhost"
			|| location.hostname === "127.0.0.1"
			|| location.protocol === 'file:'
		)
	) {
		let original = (Component as any).prototype.onCreated;
		
		(Component as any).prototype.onCreated = function() {
			original.call(this)
			this.el.setAttribute('com', this.constructor.name)
			this.el.setAttribute('iid', this.iid)
		}
	}
})()