import {SlotPosition, SlotStartInnerPositionType} from './slot-position'
import {Template} from './template'
import {Part, PartPositionType} from '../part'


/** Compiler compile a html`<div>...` to a `TemplateMaker(TemplateInitFn)`. */
export type TemplateInitFN = (context: any, hydrateNodes: ArrayLike<ChildNode> | undefined) => TemplateInitResult

/** Part of contents compiled from a template literal. */
export interface TemplateInitResult {

	/** Template element to initialize all contents inside. */
	el: HTMLTemplateElement

	/** Start inner position, indicate the start edge of content inside. */
	position: SlotPosition<SlotStartInnerPositionType>

	/** 
	 * Update and apply new values.
	 * If nothing needs to be updated, ignores it.
	 */
	update?: (values: any[]) => void

	/** 
	 * List of all the parts inside.
	 * If no parts inside, ignores this property.
	 */
	parts?: [Part, PartPositionType][]
}


/** Compile from any html`...`. */
export class TemplateMaker {

	private init: TemplateInitFN

	constructor(init: TemplateInitFN) {
		this.init = init
	}

	/** 
	 * Bind with a context to create a Template.
	 * Note `hydrateNodes` should have at least one element if provided.
	 */
	make(context: any, hydrateNodes?: ArrayLike<ChildNode>): Template {
		return new Template(this.init(context, hydrateNodes), this, context)
	}
}
