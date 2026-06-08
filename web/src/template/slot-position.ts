/** 
 * Contents that can be included in a `<tag>${...}<.tag>`.
 * **Do Not** change the values of each enum item.
 */
export const enum SlotPositionType {

	/** 
	 * End position collapse with end of parent container range.
	 * Will add or remove to the end of child contents.
	 */
	AfterContent = 0,

	/** 
	 * End position collapse with start of next sibling node.
	 * Will add or remove before the start of current node.
	 */
	Before = 1,
}

export type SlotStartInnerPositionType = SlotPositionType.Before
export type SlotEndOuterPositionType = SlotPositionType.Before | SlotPositionType.AfterContent


/** 
 * A `TemplateSlotPosition` indicates where a template slot located.
 * It try to find closest node, container, or slot for reference,
 * And helps to insert or remove contents from this position.
 */
export class SlotPosition<T = SlotPositionType> {

	type: T
	marker: Element | ChildNode

	constructor(type: T, target: Element | ChildNode) {
		this.type = type
		this.marker = target
	}
	
	/** 
	 * Get first node of the all the contents that inside of current slot.
	 * Available only when current position represents a start inner position.
	 */
	getStartNode(): ChildNode | null {
		if (this.type === SlotPositionType.Before) {
			return (this.marker as ChildNode)
		}
		else {
			return null
		}
	}

	/** Insert nodes before current position. */
	insertNodesBefore(...newNodes: ChildNode[]) {
		if (this.type === SlotPositionType.Before) {
			let node = this.marker as ChildNode
			node.before(...newNodes)
		}
		else {
			let parent = this.marker as Element
			parent.append(...newNodes)
		}
	}

	/** Walk nodes from specified node, and until before of current position. */
	*walkNodesFrom(from: ChildNode): Iterable<ChildNode> {
		let untilBeforeNode: ChildNode | null
		let node: ChildNode | null = from

		if (this.type === SlotPositionType.Before) {
			untilBeforeNode = this.marker as ChildNode
		}
		else {
			untilBeforeNode = null
		}

		do {
			yield node
			node = node.nextSibling
		}
		while (node && node !== untilBeforeNode)
	}
}
