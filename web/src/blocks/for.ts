import {EditType, getEditRecord} from '../structs/edit'
import {CompiledTemplateResult, HydrateNodesSplitter, Template, TemplateSlot} from '../template'
import {PartCallbackParameterMask, PartConnectedState} from '../part'
import {Updatable, UpdateQueue} from 'lupos'
import {getIncrementalId} from '../iid'


/** 
 * The render function to render each item,
 * pass it directly from original template.
 * This must be a fixed function, or it would can't be optimized.
 */
type ForBlockRenderFn = (item: any, index: number) => CompiledTemplateResult


/** 
 * Make it by compiling:
 * ```html
 * 	<lu:for ${...}>${(item) => html`
 * 		...
 * 	`}</lu:for>
 * ```
 */
export class ForBlock<T = any> implements Updatable {

	readonly iid: number = getIncrementalId()
	readonly slot: TemplateSlot
	readonly context: any

	private hydrateNodes: ArrayLike<ChildNode> | undefined
	private renderFn!: ForBlockRenderFn
	private oldData: T[] = []
	private newData: T[] = []
	private templates: Template[] = []

	constructor(slot: TemplateSlot) {
		this.slot = slot
		this.hydrateNodes = this.slot.takeHydrateNodes()
	}

	/** Update render function. */
	updateRenderFn(renderFn: ForBlockRenderFn) {
		if (renderFn === this.renderFn) {
			return
		}

		this.renderFn = renderFn
		this.willUpdate()
	}

	/** Update data items. */
	updateData(data: Iterable<T>) {

		// Must clone, will compare it with the data at next time updating.
		this.newData = [...data]

		this.willUpdate()
	}

	willUpdate() {

		// Not like part tree, can connect at any time.
		// Here when calls `willUpdate` means we should always enqueue.

		// Component create earlier, update earlier.
		UpdateQueue.enqueue(this)
	}

	update() {
		if (this.slot.connectedState !== PartConnectedState.Connected) {
			return
		}

		if (this.hydrateNodes) {
			this.hydrateData()
			return
		}

		let oldData = this.oldData
		let newData = this.newData

		let oldTs = this.templates
		let editRecord = getEditRecord(oldData, newData, true)

		this.templates = []

		for (let record of editRecord) {
			let {type, insertIndex, fromIndex, toIndex} = record
			let nextOldT = this.getItemAtIndex(oldTs, insertIndex)
			let fromT = this.getItemAtIndex(oldTs, fromIndex)
			let result = toIndex >= 0 ? this.renderFn(newData[toIndex], toIndex) : null

			if (type === EditType.Leave || type === EditType.LeaveModify) {
				this.leaveTemplate(fromT!, result!)
			}
			else if (type === EditType.Move || type === EditType.MoveModify) {
				if (fromT!.canUpdateBy(result!)) {
					this.moveTemplate(fromT!, nextOldT)
					this.reuseTemplate(fromT!, result!)
				}
				else {
					this.removeTemplate(fromT!)
					this.createTemplate(result!, nextOldT!)
				}
			}
			else if (type === EditType.Insert) {
				this.createTemplate(result!, nextOldT!)
			}
			else if (type === EditType.Delete) {
				this.removeTemplate(fromT!)
			}
		}

		this.slot.updateExternalTemplateList(this.templates)
		this.oldData = newData
	}

	/** Hydrate data items. */
	private hydrateData() {
		let newData = this.newData
		let splitter = new HydrateNodesSplitter(this.hydrateNodes!)
	
		this.newData = newData
		this.templates = []

		for (let index = 0; index < newData.length; index++) {
			let item = newData[index]
			let result = this.renderFn(item, index)
			let nodes = splitter.split(result)
			let newT = result.maker.make(result.context, nodes)

			if (nodes) {
				newT.hydrateNodesBefore(this.slot.endOuterPosition)
			}
			else {
				newT.insertNodesBefore(this.slot.endOuterPosition)
			}

			newT.update(result.values)
			this.templates.push(newT)
		}

		splitter.clear()
		this.slot.updateExternalTemplateList(this.templates)

		this.hydrateNodes = undefined
	}

	private getItemAtIndex<T>(items: T[], index: number): T | null {
		if (index < items.length && index >= 0) {
			return items[index]
		}
		else {
			return null
		}
	}

	private createTemplate(result: CompiledTemplateResult, nextOldT: Template | null) {
		let t = result.maker.make(result.context)

		this.insertTemplate(t, nextOldT)
		t.update(result.values)

		// `lu:for` use it's slot to cache child parts.
		if (this.slot.connectedState === PartConnectedState.Connected) {
			t.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
		}

		this.templates.push(t)
	}

	private leaveTemplate(t: Template, result: CompiledTemplateResult) {
		t.update(result.values)
		this.templates.push(t)
	}

	private reuseTemplate(t: Template, result: CompiledTemplateResult) {
		t.update(result.values)
		
		if (this.slot.connectedState === PartConnectedState.Connected) {
			t.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
		}

		this.templates.push(t)
	}

	private removeTemplate(t: Template) {
		t.recycleNodes()
	}

	private moveTemplate(t: Template, nextOldT: Template | null) {
		let position = nextOldT?.startInnerPosition ?? this.slot.endOuterPosition
		t.moveNodesBefore(position)
	}

	private insertTemplate(t: Template, nextOldT: Template | null) {
		let position = nextOldT?.startInnerPosition ?? this.slot.endOuterPosition
		t.insertNodesBefore(position)
	}
}
