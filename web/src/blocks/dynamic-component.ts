import {Component, ComponentConstructor} from '../component'
import {SlotRange, TemplateSlot, makeTemplateByComponent} from '../template'


/** 
 * After compiling all the properties applied to a component,
 * and update latest component reference.
 * get this binder as a function.
 */
type DynamicComponentBinder = (com: Component) => void


/** 
 * Compiled by:
 * ```html
 * 	<${DynamicComponent}>
 * ```
 */
export class DynamicComponentBlock {

	readonly binder: DynamicComponentBinder
	readonly slot: TemplateSlot
	readonly contentRange: SlotRange | null

	private originalEl: HTMLElement | undefined
	private Com: ComponentConstructor | null = null
	private com: Component | null = null

	constructor(binder: DynamicComponentBinder, originalEl: HTMLElement, slot: TemplateSlot, contentRange: SlotRange | null) {
		this.binder = binder
		this.originalEl = originalEl
		this.slot = slot
		this.contentRange = contentRange
	}

	/** Update with new Component Constructor. */
	update(NewCom: ComponentConstructor) {
		if (NewCom === this.Com) {
			return
		}

		let com = new NewCom(this.originalEl)
		this.binder(com)

		if (this.com) {
			this.com.$transferSlotContents(com)
		}

		// First time updating.
		else {
			this.originalEl = undefined

			if (this.contentRange) {
				com.$setRestSlotRange(this.contentRange)
			}
		}
	
		let template = makeTemplateByComponent(com)
		this.slot.updateExternalTemplate(template, [])

		this.Com = NewCom
		this.com = com
	}
}
