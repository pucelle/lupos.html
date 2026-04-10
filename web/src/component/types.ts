import {CompiledTemplateResult, SlotContentType, TemplateResult} from '../template'
import {Component} from './component'
import {TemplateStyle} from './style'


/** Constructor of component. */
export interface ComponentConstructor {
	style: TemplateStyle | null
	SlotContentType: SlotContentType | null
	new(el?: HTMLElement): Component
}

/** Type of `render` method or function. */
export type RenderResult = TemplateResult | TemplateResult[] | CompiledTemplateResult | CompiledTemplateResult[] | string | number | null