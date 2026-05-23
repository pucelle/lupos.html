import {Transition, TransitionResult} from '../transition'
import {Binding} from './types'
import {Part, PartCallbackParameterMask, PartConnectedState} from '../part'


/** 
 * Base transition options for `Transition`.
 * Note some easing name like `ease-in-elastic` is not available for web type transition.
 */
export interface TransitionOptions {
	
	/** 
	 * Specifies transition phase.
	 * E.g., if specifies to `enter` and need to play leave transition, nothing happens.
	 * Default value is `both`.
	 */
	phase?: TransitionPhase

	/**
	 * Whether play transition immediately after element get initialized.
	 * Default value is `false`.
	 */
	immediate?: boolean

	/**
	 * Whether play transition when element or any ancestral element get inserted or removed.
	 * Default value is `false`.
	 */
	global?: boolean
}

/** 
 * Transition phase limit, includes enter and leave part.
 * Only phase is allowed the transition can play.
 */
export type TransitionPhase = 'enter' | 'leave' | 'both' | 'none'


/** Cache those bindings that haven't trigger connect callback yet. */
const NotConnectCallbackForFirstTime: WeakSet<TransitionBinding> = /*#__PURE__*/new WeakSet()


/**
 * `:transition` binding can play transition after element connected or before element disconnect.
 * - `<el :transition=${fade({duration, ...})}>`
 * - `<el :transition.local=${...}>`: play transition only when element itself get inserted or removed. `.local` can omit.
 * - `<el :transition.global=${...}>`: play transition when element or any ancestral element get inserted or removed.
 * - `<el :transition.immediate=${...}>`: play transition immediately after element get initialized.
 * - `<el :transition=${() => {...}}>`: Get transition result by a function, useful for leave transition to update transition parameters.
 * 
 * `:transition` binding will dispatch 4 events on the target element:
 * - `transition-enter-started`: After enter transition started.
 * - `transition-enter-ended`: After enter transition ended.
 * - `transition-leave-started`: After leave transition started.
 * - `transition-leave-ended`: After leave transition ended.
 */
export class TransitionBinding implements Binding, Part {

	protected readonly el: Element
	protected connectedState: PartConnectedState = PartConnectedState.Disconnected
	protected result: TransitionResult | null | (() => TransitionResult | null) = null
	protected phase: TransitionPhase = 'both'
	protected immediate: boolean = false
	protected global: boolean = false
	protected transition: Transition

	constructor(el: Element, _context: any, modifiers: ('global' | 'immediate' | 'enter' | 'leave')[] | null = null) {
		this.el = el

		if (modifiers) {
			this.global = modifiers.includes('global')
			this.immediate = modifiers.includes('immediate')

			if (modifiers.includes('enter')) {
				this.phase = 'enter'
			}
			else if (modifiers.includes('leave')) {
				this.phase = 'leave'
			}
		}

		this.transition = new Transition(this.el)

		NotConnectCallbackForFirstTime.add(this)
	}

	afterConnectCallback(param: PartCallbackParameterMask | 0) {
		if (this.connectedState === PartConnectedState.Connected) {
			return
		}

		if (this.shouldPlayEnter(param)) {
			this.enter()
		}

		this.connectedState = PartConnectedState.Connected
	}

	/** Test whether should play enter transition. */
	protected shouldPlayEnter(param: PartCallbackParameterMask | 0): boolean {

		// Prevent first time enter transition playing if not `immediate`.
		if (NotConnectCallbackForFirstTime.has(this)) {
			NotConnectCallbackForFirstTime.delete(this)

			if (!this.immediate) {
				return false
			}
		}

		// Connect immediately manually, no need to play transition.
		if (param & PartCallbackParameterMask.MoveImmediately) {
			return false
		}

		// Global, or as direct node when moving.
		if (this.global || (param & PartCallbackParameterMask.AsDirectNode) > 0) {
			if (this.phase === 'leave' || this.phase === 'both') {
				return true
			}
		}

		return false
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void {
		
		// Already disconnected.
		if (this.connectedState === PartConnectedState.Disconnected) {
			return
		}

		let shouldPlay = this.shouldPlayLeave(param)

		// When disconnecting, also broadcast it internally to pick up the promises.
		if (this.connectedState === PartConnectedState.Disconnecting) {
			if (shouldPlay) {
				return this.transition.untilEnd() as Promise<any>
			}
			else {
				return this.cancel()
			}
		}

		if (shouldPlay) {
			let promiseMay = this.leave()
			if (promiseMay) {
				this.connectedState = PartConnectedState.Disconnecting

				return promiseMay.then(() => {
					if (this.connectedState === PartConnectedState.Disconnecting) {
						this.connectedState = PartConnectedState.Disconnected
					}
				})
			}
			else {
				this.connectedState = PartConnectedState.Disconnected
			}
		}
		else {
			this.connectedState = PartConnectedState.Disconnected
		}
	}

	/** Test whether should play leave transition. */
	protected shouldPlayLeave(param: PartCallbackParameterMask | 0): boolean {

		// Connect immediately manually, no need to play transition.
		if (param & PartCallbackParameterMask.MoveImmediately) {
			return false
		}

		// Global, or as direct node when moving.
		if (this.global || (param & PartCallbackParameterMask.AsDirectNode) > 0) {
			if (this.phase === 'enter' || this.phase === 'both') {
				return true
			}
		}

		return false
	}

	update(result: TransitionResult | null | (() => TransitionResult | null), options?: TransitionOptions) {
		this.result = result

		// Cancel transition immediately if transition value becomes `null`.
		if (!this.result) {
			this.transition.cancel()
		}

		if (options) {
			if (options.global !== undefined) {
				this.global = options.global
			}

			if (options.immediate !== undefined) {
				this.immediate = options.immediate
			}

			if (options.phase !== undefined) {
				this.phase = options.phase
			}
		}
	}

	/** Cancel playing transition. */
	cancel() {
		return this.transition.cancel()
	}

	/** Called after the attached element is connected into document. */
	enter(): Promise<boolean | null> | void {
		let result = this.getResult()
		if (!result) {
			return
		}

		return this.transition.enter(result)
	}

	private getResult() {
		if (typeof this.result === 'function') {
			return this.result()
		}

		return this.result
	}

	/** Called before the attached element begin to disconnect from document. */
	leave(): Promise<boolean | null> | void {
		let result = this.getResult()
		if (!result) {
			return
		}

		return this.transition.leave(result)
	}
}