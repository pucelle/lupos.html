import {SlotPosition, SlotEndOuterPositionType} from './slot-position'
import {Template} from './template'
import {CompiledTemplateResult} from './template-result-compiled'
import {Part, PartCallbackParameterMask} from '../part'
import {NodeTemplateMaker, TextTemplateMaker} from './template-makers'
import {TemplateMaker} from './template-maker'
import {HydrateNodesSplitter} from './hydration-splitter'


/** 
 * Represents the type of the contents that can be included
 * in a template literal like `<tag>${...}<.tag>`.
 */
export const enum SlotContentType {
	TemplateResult = 0,
	TemplateResultList = 1,
	Text = 2,
	Node = 3,
}


/** 
 * A `TemplateSlot` locate a slot position `>${...}<` inside a template  literal,
 * it helps to update content of the slot.
 * Must know the content type of slot, otherwise use `DynamicTypedTemplateSlot`.
 */
export class TemplateSlot<T extends SlotContentType | null = SlotContentType | null> implements Part {

	/** 
	 * Indicates whether connected to document.
	 * Can also avoid calls content connect actions twice in update logic and connect callback.
	 */
	connected: boolean = false

	/** End outer position, indicates where to put new content. */
	readonly endOuterPosition: SlotPosition<SlotEndOuterPositionType>

	private contentType: T | null = null
	private readonly knownContentType: boolean

	private hydrateNodes: ArrayLike<ChildNode> | undefined
	private content: Template | Template[] | null = null

	constructor(
		endOuterPosition: SlotPosition<SlotEndOuterPositionType>,
		knownType: T | null = null,
		hydrateNodes: ArrayLike<ChildNode> | undefined = undefined
	) {
		this.endOuterPosition = endOuterPosition
		this.contentType = knownType as T
		this.knownContentType = knownType !== null
		this.hydrateNodes = hydrateNodes
	}

	/** Make a template, and use current hydrate nodes if possible. */
	makeTemplate(maker: TemplateMaker, context: any): Template {
		let template = maker.make(context, this.hydrateNodes)

		if (this.hydrateNodes) {
			this.hydrateNodes = undefined
		}

		return template
	}

	/** If have hydrate nodes, take control of it. */
	takeHydrateNodes(): ArrayLike<ChildNode> | undefined {
		if (this.hydrateNodes) {
			let hydrateNodes = this.hydrateNodes
			this.hydrateNodes = undefined
			return hydrateNodes
		}

		return undefined
	}

	afterConnectCallback(param: PartCallbackParameterMask | 0) {
		if (this.connected) {
			return
		}

		this.connected = true

		// May haven't get updated.
		if (!this.content) {
			return
		}

		if (this.contentType === SlotContentType.TemplateResultList) {
			for (let t of this.content as Template[]) {
				t.afterConnectCallback(param)
			}
		}
		else if (this.contentType !== null) {
			(this.content as Template).afterConnectCallback(param)
		}
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void {
		if (!this.connected) {
			return
		}

		this.connected = false

		if (this.contentType === SlotContentType.TemplateResult) {
			return (this.content as Template).beforeDisconnectCallback(param)
		}
		else if (this.contentType === SlotContentType.TemplateResultList) {
			let promises: Promise<void>[] = []
			
			for (let t of this.content as Template[]) {
				let p = t.beforeDisconnectCallback(param)
				if (p) {
					promises.push(p)
				}
			}

			if (promises.length > 0) {
				return Promise.all(promises) as Promise<any>
			}
		}
	}

	/** Whether has some real content rendered. */
	hasContent(): boolean {
		return this.content !== null
	}

	/** 
	 * Update by value parameter after known it's type.
	 * Note value must be strictly of the content type specified.
	 */
	update(value: unknown) {
		if (!this.knownContentType) {
			let newContentType = this.identifyContentType(value)
			if (newContentType !== this.contentType) {
				this.clearContent()
			}

			this.contentType = newContentType
		}

		if (this.hydrateNodes) {
			this.hydrate(value)
		}
		else if (this.contentType === SlotContentType.TemplateResult) {
			this.updateTemplateResult(value as CompiledTemplateResult)
		}
		else if (this.contentType === SlotContentType.TemplateResultList) {
			this.updateTemplateResultList(value as CompiledTemplateResult[])
		}
		else if (this.contentType === SlotContentType.Text) {
			this.updateText(value)
		}
		else if (this.contentType === SlotContentType.Node) {
			this.updateNode(value as ChildNode)
		}
	}

	/** 
	 * Hydrate by value parameter after known it's type.
	 * Note value must be strictly of the content type specified.
	 */
	hydrate(value: unknown) {
		if (this.contentType === SlotContentType.TemplateResult) {
			this.hydrateTemplateResult(value as CompiledTemplateResult)
		}
		else if (this.contentType === SlotContentType.TemplateResultList) {
			this.hydrateTemplateResultList(value as CompiledTemplateResult[])
		}
		else if (this.contentType === SlotContentType.Text) {
			this.hydrateText(value)
		}
		else if (this.contentType === SlotContentType.Node) {
			this.hydrateNode(value as ChildNode)
		}

		this.hydrateNodes = undefined
	}

	/** Identify content type by value. */
	private identifyContentType(value: unknown): T | null {
		if (value === null || value === undefined) {
			return null
		}
		else if (value instanceof CompiledTemplateResult) {
			return SlotContentType.TemplateResult as T
		}
		else if (Array.isArray(value)) {
			return SlotContentType.TemplateResultList as T
		}
		else if (value instanceof Node) {
			return SlotContentType.Node as T
		}
		else {
			return SlotContentType.Text as T
		}
	}

	/** Clear current content, reset content and content type. */
	private clearContent() {
		if (!this.content) {
			return
		}

		if (this.contentType === SlotContentType.TemplateResult
			|| this.contentType === SlotContentType.Text
			|| this.contentType === SlotContentType.Node
		) {
			this.removeTemplate(this.content as Template)
		}
		else {
			let ts = this.content as Template[]

			for (let i = 0; i < ts.length; i++) {
				let t = ts[i]
				this.removeTemplate(t)
			}
		}

		this.content = null
		this.contentType = null
	}

	/** Update from a template result. */
	private updateTemplateResult(tr: CompiledTemplateResult) {
		let oldT = this.content as Template | null
		if (oldT && oldT.canUpdateBy(tr)) {
			oldT.update(tr.values)
		}
		else {
			if (oldT) {
				this.removeTemplate(oldT)
			}

			let newT = tr.maker.make(tr.context)
			newT.insertNodesBefore(this.endOuterPosition)
			newT.update(tr.values)

			if (this.connected) {
				newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
			}
			
			this.content = newT
		}
	}

	/** Hydrate from a template result. */
	private hydrateTemplateResult(tr: CompiledTemplateResult) {
		let newT = tr.maker.make(tr.context, this.hydrateNodes!)
		newT.hydrateNodesBefore(this.endOuterPosition)
		newT.update(tr.values)

		if (this.connected) {
			newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
		}
		
		this.content = newT
	}

	/** Update from a template result list. */
	private updateTemplateResultList(trs: CompiledTemplateResult[]) {
		let content = this.content as Template[] | null
		if (!content) {
			content = this.content = []
		}

		// Update shared part.
		for (let i = 0; i < trs.length; i++) {
			let oldT = i < content.length ? content[i] : null
			let tr = trs[i]

			if (oldT && oldT.canUpdateBy(tr)) {
				oldT.update(tr.values)
			}
			else {
				let newT = tr.maker.make(tr.context)
				let nextOldT = i < content.length - 1 ? content[i + 1] : null

				if (oldT) {
					this.removeTemplate(oldT)
				}
				
				this.insertTemplate(newT, nextOldT)
				newT.update(tr.values)

				if (this.connected) {
					newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
				}

				content[i] = newT
			}
		}

		// Remove rest part.
		if (trs.length < content.length) {
			for (let i = trs.length; i < content.length; i++) {
				let oldT = content[i]
				this.removeTemplate(oldT)
			}

			content.splice(trs.length, content.length - trs.length)
		}
	}

	/** Update from a template result list. */
	private hydrateTemplateResultList(trs: CompiledTemplateResult[]) {
		let content: Template[] = []
		let splitter = new HydrateNodesSplitter(this.hydrateNodes!)

		// Update shared part.
		for (let i = 0; i < trs.length; i++) {
			let tr = trs[i]
			let nodes = splitter.split(tr)
			let newT = tr.maker.make(tr.context, nodes)

			if (nodes) {
				newT.hydrateNodesBefore(this.endOuterPosition)
			}
			else {
				this.insertTemplate(newT, null)
			}

			newT.update(tr.values)

			if (this.connected) {
				newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
			}

			content[i] = newT
		}

		splitter.clear()
		this.content = content
	}

	/** Insert a template before another one, or before slot end position. */
	private insertTemplate(t: Template, nextT: Template | null) {
		let position = nextT?.startInnerPosition ?? this.endOuterPosition
		t.insertNodesBefore(position)
	}

	/** Remove a template. */
	private removeTemplate(t: Template) {
		t.recycleNodes()
	}

	/** Update from a text-like value. */
	private updateText(value: unknown) {
		let text = value === null || value === undefined ? '' : String(value).trim()
		let t = this.content as Template<[string]> | null

		if (!t) {
			t = TextTemplateMaker.make(null)
			t.insertNodesBefore(this.endOuterPosition)
		}

		t.update([text])
		this.content = t as Template<string[]>
	}

	/** Hydrate from a text-like value. */
	private hydrateText(value: unknown) {
		let text = value === null || value === undefined ? '' : String(value).trim()
		let t = TextTemplateMaker.make(null, this.hydrateNodes!) as Template<string[]>

		t.hydrateNodesBefore(this.endOuterPosition)
		t.update([text])

		this.content = t
	}

	/** Update from a node. */
	private updateNode(node: ChildNode | null) {
		let t = this.content as Template<ChildNode[]> | null

		if (node) {
			if (!t) {
				t = this.content = NodeTemplateMaker.make(null)
				t.insertNodesBefore(this.endOuterPosition)
			}

			t.update([node])
		}
		else {
			if (t) {
				t.update([])
			}
		}
	}

	/** Hydrate from a node. */
	private hydrateNode(node: ChildNode | null) {
		for (let i = this.hydrateNodes!.length - 1; i >= 0; i--) {
			this.hydrateNodes![i].remove()
		}
		
		this.updateNode(node)
	}

	/** 
	 * Update external template manually without comparing template maker.
	 * Use this when template is been managed and cached outside.
	 * Note it will still connect target template if needed.
	 */
	updateExternalTemplate(newT: Template | null, values: any[]) {
		let oldT = this.content as Template | null

		if (oldT === newT) {
			if (newT) {
				newT.update(values)
			}
		}
		else {
			if (oldT) {
				this.removeTemplate(oldT)
			}

			if (newT) {
				newT.insertNodesBefore(this.endOuterPosition)
				newT.update(values!)

				if (this.connected) {
					newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
				}
			}

			this.contentType = SlotContentType.TemplateResult as T
			this.content = newT
		}
	}

	/** 
	 * Update external template list manually without comparing template maker.
	 * Use this when template list is been managed and cached outside.
	 * Note it will not connect target template list.
	 */
	updateExternalTemplateList(list: Template[]) {
		this.contentType = SlotContentType.TemplateResultList as T
		this.content = list
	}
}