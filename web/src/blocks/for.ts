import {EditType, getEditRecord} from '../structs/edit'
import {CompiledTemplateResult, HydrateNodesSplitter, Template, TemplateSlot} from '../template'
import {Part, PartCallbackParameterMask, PartConnectedState} from '../part'
import {beginTrack, endTrack, trackGet, untrack, Updatable, UpdateQueue} from 'lupos'
import {getIncrementalId} from '../iid'


/** 
 * The render function to render each item,
 * pass it directly from original template.
 * This must be a fixed function, or it would can't be optimized.
 */
type ForBlockRenderFn = (item: any, index: number) => CompiledTemplateResult

/** Stable identity selector; null or undefined restores item-identity matching. */
export type ForBlockKey<T> = keyof T | ((item: T) => unknown) | null | undefined


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:for ${...}>${(item) => html`
 * 		...
 * 	`}</lu:for>
 * ```
 */
export class ForBlock<T = any> implements Updatable, Part {

	readonly iid: number = getIncrementalId()
	readonly slot: TemplateSlot
	readonly context: any

	private connected: boolean = false
	private hydrateNodes: ArrayLike<ChildNode> | undefined
	private renderFn!: ForBlockRenderFn
	private oldData: T[] = []
	private newData: T[] = []
	private templates: Template[] = []

	/** Explicit identity selector, or no selector for legacy item matching. */
	private key: ForBlockKey<T>

	/** Snapshot keys rather than re-reading potentially mutated old items. */
	private oldKeys: unknown[] = []

	/** Keys collected alongside the current render under dependency tracking. */
	private newKeys: unknown[] = []

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
	}

	/** Update the selector and schedule reconciliation even when the iterable is unchanged. */
	updateKey(key: ForBlockKey<T>) {
		if (key === this.key) {
			return
		}

		this.key = key
		if (this.connected) {
			this.willUpdate()
		}
	}

	afterConnectCallback(_param: PartCallbackParameterMask | 0) {
		if (!this.connected) {
			this.connected = true
			this.willUpdate()
		}
	}

	beforeDisconnectCallback(_param: PartCallbackParameterMask | 0) {
		
		// The bound slot will help to manage all the contents,
		// here we have the only need to manage tracking state.
		if (this.connected) {
			this.connected = false
			untrack(this)
		}
	}

	/** Update data items. */
	updateData(data: Iterable<T>) {

		// Must clone, will compare it with the data when next time updating.
		this.newData = [...data]

		if (this.connected) {
			this.willUpdate()
		}
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
		let newResults = this.renderItems()
		let keyed = this.key !== null && this.key !== undefined

		let editRecord = keyed
			? getEditRecord(this.oldKeys, this.newKeys, false)
			: getEditRecord(oldData, newData, true)

		this.templates = []

		for (let record of editRecord) {
			let {type, insertIndex, fromIndex, toIndex} = record
			let nextOldT = this.getItemAtIndex(oldTs, insertIndex)
			let fromT = this.getItemAtIndex(oldTs, fromIndex)
			let result = toIndex >= 0 ? newResults[toIndex] : null

			if (type === EditType.Leave || type === EditType.LeaveModify) {
				if (fromT!.canUpdateBy(result!)) {
					this.leaveTemplate(fromT!, result!)
				}
				else {
					this.createTemplate(result!, fromT)
					this.removeTemplate(fromT!)
				}
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
		this.oldKeys = this.newKeys
	}

	private renderItems(): CompiledTemplateResult[] {
		beginTrack(this)

		let results: CompiledTemplateResult[]
		let meetsError = false

		try {
			let key = this.key
			
			this.newKeys = key === null || key === undefined ? this.newData : this.newData.map(item => {
				if (typeof key === 'function') {
					return key(item)
				}
				else {
					if (typeof item === 'object' && item !== null || typeof item === 'function') {
						trackGet(item, key)
					}

					return item[key]
				}
			})

			results = this.newData.map((item, toIndex) => {
				return this.renderFn(item, toIndex)
			})
		}
		catch (err) {
			results = []
			meetsError = true
			console.warn(err)
		}

		endTrack(meetsError)

		return results
	}

	/** Hydrate data items. */
	private hydrateData() {
		let splitter = new HydrateNodesSplitter(this.hydrateNodes!)
		let newResults = this.renderItems()
	
		this.templates = []

		for (let index = 0; index < newResults.length; index++) {
			let result = newResults[index]
			let nodes = splitter.split(result)
			let newT = result.maker.make(result.context, nodes)

			if (nodes) {
				newT.hydrateNodesBefore(this.slot.endOuterPosition)
			}
			else {
				newT.insertNodesBefore(this.slot.endOuterPosition)
			}

			newT.update(result.values)

			if (this.slot.connectedState === PartConnectedState.Connected) {
				newT.afterConnectCallback(PartCallbackParameterMask.FromOwnStateChange | PartCallbackParameterMask.AsDirectNode)
			}
			
			this.templates.push(newT)
		}

		splitter.clear()
		this.slot.updateExternalTemplateList(this.templates)

		this.oldData = this.newData
		this.oldKeys = this.newKeys
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
