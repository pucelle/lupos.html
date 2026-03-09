import {Transition, TransitionResult} from '../transition'
import {Binding} from './types'
import {Part, PartCallbackParameterMask} from '../part'


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

	private readonly el: Element

	/** 
	 * A `local` transition as default action,
	 * can only play when attached elements been directly inserted or removed.
	 * A `global` transition can play when any level of ancestral element get inserted or removed.
	 */
	private global: boolean = false

	/** 
	 * By default, transition cant play when get initialized.
	 * But set `immediate` can make it play.
	 */
	private immediate: boolean = false

	private result: TransitionResult | null | (() => TransitionResult | null) = null
	private transition: Transition

	constructor(el: Element, _context: any, modifiers: ('global' | 'local' | 'immediate')[] = []) {
		this.el = el
		this.global = modifiers.includes('global')
		this.immediate = modifiers.includes('immediate')
		this.transition = new Transition(this.el)

		NotConnectCallbackForFirstTime.add(this)
	}

	afterConnectCallback(param: PartCallbackParameterMask | 0) {
		this.cancel()

		// Connect immediately manually, no need to play transition.
		if (param & PartCallbackParameterMask.MoveImmediately) {
			return
		}

		if (NotConnectCallbackForFirstTime.has(this)) {
			NotConnectCallbackForFirstTime.delete(this)

			// Prevent first time enter transition playing if not `immediate`.
			if (!this.immediate) {
				return
			}
		}

		if (this.global || (param & PartCallbackParameterMask.AsDirectNode) > 0) {
			this.enter()
		}
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void {
		this.cancel()

		// Ancestral element has been removed immediately, no need to play transition.
		if (param & PartCallbackParameterMask.MoveImmediately) {
			return
		}

		if (this.global || (param & PartCallbackParameterMask.AsDirectNode) > 0) {
			return this.leave() as Promise<void> | void
		}
	}

	update(result: TransitionResult | null | (() => TransitionResult | null)) {
		this.result = result

		// Cancel transition immediately if transition value becomes `null`.
		if (!this.result) {
			this.transition.cancel()
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