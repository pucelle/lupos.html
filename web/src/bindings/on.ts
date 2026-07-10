import {DOMEvents, DOMModifiableEvents, EventType, InferEventHandler} from 'lupos'
import {SimulatedEvents} from 'ff-kit'
import {Binding} from './types'
import {Part, PartCallbackParameterMask} from '../part'


/** Both dom event and simulated events. */
export type EventTypeMixed = EventType | SimulatedEvents.EventType

/** Both dom event and simulated handlers. */
export type EventHandlerMixed = InferEventHandler<any> | SimulatedEvents.Events[SimulatedEvents.EventType]

/** Both dom event and simulated event options. */
export type EventOptionsMixed = AddEventListenerOptions | SimulatedEvents.Options


/**
 * To bind dynamic event type, can be used to bind simulated events.
 * 
 * `:on=${onTouch ? 'touchstart' : 'mousedown', (e) => ...}, options?`
 * `:on=${onTouch ? 'hold' : 'click', (e) => ...}, options?`
 * 
 * For hold event bound element, you may need to set styles to prevent default selection and hold action:
 * `
 *  user-select: none;
 *	-webkit-user-select: none;
 *	-webkit-touch-callout: none;
 * `
 */
export class on implements Binding, Part {

	protected readonly el: Element
	protected readonly context: any
	protected type: EventTypeMixed | null = null
	protected handler: EventHandlerMixed | null = null
	protected options: EventOptionsMixed | undefined = undefined
	protected modifiers: DOMModifiableEvents.EventModifierByType<any>[] | undefined
	protected boundType: EventTypeMixed | null = null

	constructor(el: Element, context: any) {
		this.el = el
		this.context = context
	}

	update<T extends EventTypeMixed>(type: T, handler: EventHandlerMixed | null, options?: EventOptionsMixed, modifiers?: DOMModifiableEvents.EventModifierByType<T>[]) {
		this.type = type
		this.handler = handler
		this.options = options
		this.modifiers = modifiers
	}

	afterConnectCallback(_param: PartCallbackParameterMask | 0) {
		if (this.boundType && this.boundType !== this.type) {
			this.unbindBound()
		}

		if (this.boundType === null && this.type !== null) {
			if (SimulatedEvents.hasType(this.type)) {
				SimulatedEvents.on(this.el, this.type, this.handle as any, this, this.options as SimulatedEvents.Options)
			}
			else if (this.modifiers) {
				DOMModifiableEvents.on(this.el, this.type, this.modifiers, this.handle, this, this.options as AddEventListenerOptions)
			}
			else {
				DOMEvents.on(this.el, this.type, this.handle, this, this.options as AddEventListenerOptions)
			}

			this.boundType = this.type
		}
	}

	protected unbindBound() {
		if (SimulatedEvents.hasType(this.boundType!)) {
			SimulatedEvents.off(this.el, this.boundType as SimulatedEvents.EventType, this.handle as any, this)
		}
		else {
			DOMEvents.off(this.el, this.boundType!, this.handle, this)
		}

		this.boundType = null
	}

	protected handle(...args: any[]) {
		(this.handler as any)?.call(this.context, ...args)
	}

	beforeDisconnectCallback(_param: PartCallbackParameterMask | 0) {
		if (this.boundType) {
			this.unbindBound()
		}
	}
}
