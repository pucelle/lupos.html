import {CompiledTemplateResult, Template, TemplateMaker, TemplateSlot} from '../template'


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:if ${...}>...</lu:if>
 * 	<lu:elseif ${...}>...</lu:elseif>
 * 	<lu:else>...</lu:else>
 * ```
 */
export class IfBlock {

	readonly slot: TemplateSlot

	constructor(slot: TemplateSlot) {
		this.slot = slot
	}

	update(result: CompiledTemplateResult | null) {
		this.slot.update(result)
	}
}



/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:if ${...} cache>...</lu:if>
 * 	<lu:elseif ${...}>...</lu:elseif>
 * 	<lu:else>...</lu:else>
 * ```
 */
export class CacheableIfBlock {

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