import {SlotPosition, SlotEndOuterPositionType} from './slot-position'
import {Template} from './template'
import {CompiledTemplateResult} from './template-result-compiled'
import {Part, PartCallbackParameterMask, PartConnectedState} from '../part'
import {NodeTemplateMaker, TextTemplateMaker} from './template-makers'
import {TemplateMaker} from './template-maker'
import {HydrateNodesSplitter} from './hydration-splitter'
import {PrimitiveRenderResult, RenderResult} from '../component'


/** 
 * Represents the type of the contents that can be included
 * in a template literal like `<tag>${...}<.tag>`.
 */
export const enum SlotContentType {
	TemplateResult = 0,
	TemplateResultList = 1,
	Text = 2,
	Node = 3,
	Promise = 4,
}


/** 
 * A `TemplateSlot` locate a slot position `>${...}<` inside a template  literal,
 * it helps to update content of the slot.
 * Must know the content type of slot, otherwise use `DynamicTypedTemplateSlot`.
 * Note `hydrateNodes` should have at least one element if provided.
 */
export class TemplateSlot<T extends SlotContentType | null = SlotContentType | null> implements Part {

	/** 
	 * Indicates whether connected to document.
	 * Can also avoid calls content connect actions twice in update logic and connect callback.
	 */
	connectedState: PartConnectedState = PartConnectedState.Disconnected

	/** End outer position, indicates where to put new content. */
	readonly endOuterPosition: SlotPosition<SlotEndOuterPositionType>

	private contentType: T | null = null
	private knownContentType: boolean
	private hydrateNodes: ArrayLike<ChildNode> | undefined
	private content: Template | Template[] | null = null
	private promise: Promise<RenderResult> | null = null

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
		if (this.connectedState === PartConnectedState.Connected) {
			return
		}

		this.connectedState = PartConnectedState.Connected

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
		
		// Already disconnected.
		if (this.connectedState === PartConnectedState.Disconnected) {
			return
		}

		let promiseMay: Promise<void> | void = undefined

		if (this.contentType === SlotContentType.TemplateResult) {
			promiseMay = (this.content as Template).beforeDisconnectCallback(param)
		}
		else if (this.contentType === SlotContentType.TemplateResultList
			&& this.content	// Very rare situation disconnect before `<lu:for>` updated.
		) {
			let promises: Promise<void>[] = []
			
			for (let t of this.content as Template[]) {
				let p = t.beforeDisconnectCallback(param)
				if (p) {
					promises.push(p)
				}
			}

			if (promises.length > 0) {
				promiseMay = Promise.all(promises) as Promise<any>
			}
		}

		// When disconnecting, also broadcast it internally to pick up the promises.
		if (this.connectedState === PartConnectedState.Disconnecting) {
			return promiseMay
		}

		// Wait for disconnecting.
		else if (promiseMay) {
			this.connectedState = PartConnectedState.Disconnecting

			return promiseMay.then(() => {
				if (this.connectedState === PartConnectedState.Disconnecting) {
					this.connectedState = PartConnectedState.Disconnected
				}
			})
		}

		// Immediately disconnected.
		else {
			this.connectedState = PartConnectedState.Disconnected
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
		let newContentType: T | null

		// Even known content type, value may become null when meet render error.
		if (value === null) {
			newContentType = null

			if (this.knownContentType) {
				this.knownContentType = false
			}
		}
		else if (this.knownContentType) {
			newContentType = this.contentType
		}
		else {
			newContentType = this.identifyContentType(value)
		}

		if (newContentType !== this.contentType) {
			if (newContentType !== SlotContentType.Promise) {
				this.clearContent()
				this.contentType = newContentType
			}
		}

		if (this.hydrateNodes) {
			this.hydrate(value, newContentType)
			return
		}
		
		if (newContentType === SlotContentType.TemplateResult) {
			this.updateTemplateResult(value as CompiledTemplateResult)
		}
		else if (newContentType === SlotContentType.TemplateResultList) {
			this.updateTemplateResultList(value as CompiledTemplateResult[])
		}
		else if (newContentType === SlotContentType.Text) {
			this.updateText(value)
		}
		else if (newContentType === SlotContentType.Node) {
			this.updateNode(value as ChildNode)
		}
		else if (newContentType === SlotContentType.Promise) {
			if (value !== this.promise) {
				this.promise = value as Promise<PrimitiveRenderResult>;

				(value as Promise<PrimitiveRenderResult>).then(result => {
					if (this.promise === value && this.connectedState === PartConnectedState.Connected) {
						this.update(result)
					}
				})
			}
		}

		
		// If update with a promise, later with a normal value,
		// here should clear the promise to avoid it updated.
		if (newContentType !== SlotContentType.Promise
			&& this.promise
		) {
			this.promise = null
		}
	}

	/** 
	 * Hydrate by value parameter after known it's type.
	 * Note value must be strictly of the content type specified.
	 */
	hydrate(value: unknown, newContentType: SlotContentType | null) {
		if (newContentType === SlotContentType.TemplateResult) {
			this.hydrateTemplateResult(value as CompiledTemplateResult)
			this.hydrateNodes = undefined
		}
		else if (newContentType === SlotContentType.TemplateResultList) {
			this.hydrateTemplateResultList(value as CompiledTemplateResult[])
			this.hydrateNodes = undefined
		}
		else if (newContentType === SlotContentType.Text) {
			this.hydrateText(value)
			this.hydrateNodes = undefined
		}
		else if (newContentType === SlotContentType.Node) {
			this.hydrateNode(value as ChildNode)
			this.hydrateNodes = undefined
		}
		else if (newContentType === SlotContentType.Promise) {
			if (value !== this.promise) {
				this.promise = value as Promise<PrimitiveRenderResult>;

				(value as Promise<PrimitiveRenderResult>).then(result => {
					if (this.promise === value && this.connectedState === PartConnectedState.Connected) {
						this.contentType = this.identifyContentType(result)
						this.hydrate(result, this.contentType)
						this.promise = null
					}
				})
			}
		}
		else {
			for (let i = this.hydrateNodes!.length - 1; i >= 0; i--) {
				this.hydrateNodes![i].remove()
			}
			
			this.hydrateNodes = undefined
		}
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
		else if (value instanceof Promise) {
			return SlotContentType.Promise as T
		}
		else {
			return SlotContentType.Text as T
		}
	}

	/** 
	 * Clear current content, reset content and content type.
	 * When new content type is promise, persist old contents with
	 * only disconnecting them.
	 */
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
		else if (this.contentType === SlotContentType.TemplateResultList) {
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

			if (this.connectedState === PartConnectedState.Connected) {
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

		if (this.connectedState === PartConnectedState.Connected) {
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

				if (this.connectedState === PartConnectedState.Connected) {
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
	private hydrateTemplateResultList(results: CompiledTemplateResult[]) {
		let content: Template[] = []
		let splitter = new HydrateNodesSplitter(this.hydrateNodes!)

		// Update shared part.
		for (let i = 0; i < results.length; i++) {
			let result = results[i]
			let nodes = splitter.split(result)
			let newT = result.maker.make(result.context, nodes)

			if (nodes) {
				newT.hydrateNodesBefore(this.endOuterPosition)
			}
			else {
				this.insertTemplate(newT, null)
			}

			newT.update(result.values)

			if (this.connectedState === PartConnectedState.Connected) {
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
		let text = value === null || value === undefined ? '' : String(value)
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
		let text = value === null || value === undefined ? '' : String(value)
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

				if (this.connectedState === PartConnectedState.Connected) {
					newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
				}
			}

			this.contentType = newT ? SlotContentType.TemplateResult as T : null
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