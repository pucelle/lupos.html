import {RenderResult} from '../component'
import {PartConnectedState} from '../part'
import {CompiledTemplateResult, TemplateMaker, TemplateSlot} from '../template'


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:await ${AsyncContent}>
 *     Default Content
 *  </lu:await>
 * ```
 * 
 * Note you should ensure the `AsyncContent` visits
 * all trackable properties before any `await`, after which
 * the visiting will never be tracked.
 */
export class AwaitBlock {

	// May contain more maker like catch branch.
	readonly maker: TemplateMaker | null

	readonly slot: TemplateSlot
	readonly context: any

	private promise: Promise<any> | null = null

	constructor(maker: TemplateMaker | null, slot: TemplateSlot, context: any) {
		this.maker = maker
		this.slot = slot
		this.context = context
	}

	/** 
	 * Note update await block or resolve awaiting promise must wait
	 * for a micro task tick, then template will begin to update.
	 */
	update(promise: Promise<RenderResult>, values: any[]) {
		if (promise === this.promise) {
			return
		}

		this.updateDefault(values)
		
		promise.then((result: RenderResult) => {
			if (promise === this.promise && this.slot.connectedState === PartConnectedState.Connected) {
				this.updatePromised(result)
			}
		})

		this.promise = promise
	}
	
	private updateDefault(values: any[]) {
		let maker = this.maker

		// If default content not specified,
		// not update it but only update and replace for promised.
		if (!maker) {
			return
		}

		let result = new CompiledTemplateResult(maker, values, this.context)
		this.slot.update(result)
	}

	private updatePromised(result: RenderResult) {
		this.slot.update(result)
	}
}
