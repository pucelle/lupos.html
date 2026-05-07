import {CompiledTemplateResult, SlotContentType, TemplateResult} from '../template'
import {Component} from './component'
import {TemplateStyle} from './style'


/** Constructor of component. */
export interface ComponentConstructor {
	style: TemplateStyle | null
	SlotContentType: SlotContentType | null
	new(el?: HTMLElement): Component
}

/** Primitive type of `render` result which render method or function returned. */
export type PrimitiveRenderResult = TemplateResult
	| TemplateResult[]
	| CompiledTemplateResult
	| CompiledTemplateResult[]
	| string | number | null

/** 
 * Type of `render` result which render method or function returned.
 * Can be a promise which returns primitive render result.
 */
export type RenderResult = PrimitiveRenderResult | Promise<PrimitiveRenderResult>