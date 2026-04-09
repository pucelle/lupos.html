import {Template, TemplateMaker, TemplateSlot} from '../template'


/** 
 * Make it by compiling:
 * ```html
 * 	<lu:await ${...}>...</lu:await>
 * 	<lu:then>...</lu:then>
 * 	<lu:catch>...</lu:catch>
 * ```
 */
export class AwaitBlock {

	readonly makers: (TemplateMaker | null)[]
	readonly slot: TemplateSlot
	readonly context: any

	private promise: Promise<any> | null = null
	private values: any[] | null = null
	private template: Template | null = null

	constructor(makers: (TemplateMaker | null)[], slot: TemplateSlot, context: any) {
		this.makers = makers
		this.slot = slot
		this.context = context
	}

	/** 
	 * Note update await block or resolve awaiting promise must wait
	 * for a micro task tick, then template will begin to update.
	 */
	update(promise: Promise<any>, values: any[]) {
		this.values = values
		
		if (promise !== this.promise) {
			this.updateIndex(0)
			
			promise.then(() => {
				this.updateIndex(1)
			})
			.catch(() => {
				this.updateIndex(2)
			})

			this.promise = promise
		}
		else if (this.template) {
			this.template.update(values)
		}
	}
	
	private updateIndex(index: number) {
		let maker = this.makers[index]
		this.template = maker ? this.slot.makeTemplate(maker, this.context) : null
		this.slot.updateExternalTemplate(this.template, this.values!)
	}
}
