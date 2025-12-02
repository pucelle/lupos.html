import {trackGet} from 'lupos'
import {TemplateSlot, SlotPosition, SlotPositionType, SlotEndOuterPositionType} from '../template'
import {Component} from './component'
import {RenderResult} from './types'


/** Rendered result, or a function to return it. */
export type RenderResultRenderer = RenderResult | (() => RenderResult)


/** 
 * Render a component like with `<slot>` as tag to contain content specified by html`...` bound with `context`,
 * or contain responsive content render by function like `() => html`...`` bound with `context`.
 */
export function render(renderer: RenderResultRenderer, context: any = null): RenderedComponentLike {
	return new RenderedComponentLike(renderer, context)
}


/** 
 * Same as an anonymous component, except it attaches to a context,
 * and render all the things within that context.
 */
export class RenderedComponentLike<E = any> extends Component<E> {

	/** `context` can be overwritten. */
	context: any

	/** `renderer` can be overwritten. */
	renderer: RenderResultRenderer

	/** Component generated from `getAs`. */
	private componentRenderedAs: Component | null = null
	private componentRenderedNeedsValidate = true

	constructor(renderer: RenderResultRenderer, context: any) {
		super(document.createElement('slot'))
		
		this.renderer = renderer
		this.context = context
	}
	
	/** Replace context of content slot. */
	protected override initContentSlot(): TemplateSlot {
		let position = new SlotPosition<SlotEndOuterPositionType>(SlotPositionType.AfterContent, this.el)
		return new TemplateSlot(position)
	}

	protected override render(): RenderResult {
		trackGet(this, 'renderer')

		if (typeof this.renderer === 'function') {
			return this.renderer.call(this.context)
		}
		else {
			return this.renderer
		}
	}

	protected override onUpdated() {
		super.onUpdated()
		this.componentRenderedNeedsValidate = true
	}

	/** 
	 * Get the component bound with first rendered element.
	 * E.g., render a popup or contextmenu based on current rendered.
 	 * Normally you should wait for render complete then get, or you will receive `null`.
 	 */
	getAs<T extends typeof Component = typeof Component>(cons: T): InstanceType<T> | null {
		if (!this.hasContentRendered()) {
			this.componentRenderedAs = null
			return null
		}

		if (this.componentRenderedNeedsValidate) {
			this.componentRenderedNeedsValidate = false
			let firstElement = this.el.firstElementChild

			// Re-rendered new component.
			if (firstElement && firstElement !== this.componentRenderedAs?.el) {
				let com = cons.from(firstElement)!
				if (!com) {
					throw new Error(`The "renderer" must render a "<${cons.name}>" type of component!`)
				}

				this.componentRenderedAs = com
			}
		}

		return this.componentRenderedAs as InstanceType<T> | null
	}
}