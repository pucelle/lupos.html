import {CompiledTemplateResult, Template, TemplateSlot} from '../template'


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:keyed ${...}>...</lu:keyed>
 * ```
 */
export class KeyedBlock {

	readonly slot: TemplateSlot

	private key: any = undefined
	private template: Template | null = null
	
	constructor(slot: TemplateSlot) {
		this.slot = slot
	}

	update(newKey: any, result: CompiledTemplateResult | null) {
		let template: Template | null = null

		if (newKey === this.key
			&& result
			&& this.template
			&& this.template.canUpdateBy(result)
		) {
			template = this.template
		}
		else if (result) {
			template = this.slot.makeTemplate(result.maker, result.context)
		}

		this.slot.updateExternalTemplate(template, result ? result.values : [])
		this.key = newKey
		this.template = template
	}
}


/** 
 * Make it by compiling:
 * ```html
 * 	<lu:keyed cache ${...}>...</lu:keyed>
 * ```
 * Note it will cache all rendered templates.
 */
export class CacheableKeyedBlock {

	readonly slot: TemplateSlot

	private key: any = undefined
	private template: Template | null = null
	private templates: Map<any, Template | null> = new Map()
	
	constructor(slot: TemplateSlot) {
		this.slot = slot
	}

	update(newKey: any, result: CompiledTemplateResult | null) {
		let template: Template | null = null

		if (newKey === this.key
			&& result
			&& this.template
			&& this.template.canUpdateBy(result)
		) {
			template = this.template
		}
		else if (result) {
			template = this.templates.get(newKey) ?? this.slot.makeTemplate(result.maker, result.context)
		}

		this.slot.updateExternalTemplate(template, result ? result.values : [])
		this.key = newKey
		this.template = template

		if (template) {
			this.templates.set(newKey, template)
		}
	}
}


/** 
 * Make it by compiling:
 * ```
 * 	<lu:keyed weakCache ${...}>...</lu:keyed>
 * ```
 * Note key must be an object.
 */
export class WeakCacheableKeyedBlock {

	readonly slot: TemplateSlot

	private key: object | undefined = undefined
	private template: Template | null = null
	private templates: WeakMap<object, Template | null> = new Map()
	
	constructor(slot: TemplateSlot) {
		this.slot = slot
	}

	update(newKey: object, result: CompiledTemplateResult | null) {
		let template: Template | null = null

		if (newKey === this.key
			&& result
			&& this.template
			&& this.template.canUpdateBy(result)
		) {
			template = this.template
		}
		else if (newKey && result) {
			template = this.templates.get(newKey) ?? this.slot.makeTemplate(result.maker, result.context)
		}

		this.slot.updateExternalTemplate(template, result ? result.values : [])
		this.key = newKey
		this.template = template

		if (template) {
			this.templates.set(newKey, template)
		}
	}
}