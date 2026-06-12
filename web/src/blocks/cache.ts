import {CompiledTemplateResult, Template, TemplateMaker, TemplateSlot} from '../template'


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:cache>${...}</lu:cache>
 * ```
 */
export class CacheBlock {

	readonly slot: TemplateSlot
	private templates: Map<TemplateMaker, Template> = new Map()

	constructor(slot: TemplateSlot) {
		this.slot = slot
	}

	update(result: CompiledTemplateResult | null) {
		let template = result ? this.templates.get(result.maker) ?? null : null
		
		if (!template && result) {
			template = this.slot.makeTemplate(result.maker, result.context)
			this.templates.set(result.maker, template)
		}

		this.slot.updateExternalTemplate(template, result ? result.values : [])
	}
}