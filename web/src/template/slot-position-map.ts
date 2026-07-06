import {Template} from './template'
import {SlotPosition} from './slot-position'


/** 
 * Cache where a template slot inserted,
 * and also update this position after new template insert into same position.
 */
export class SlotPositionMap {

	/** 
	 * Template <=> position just after it.
	 * It's equivalent to a double linked list.
	 * Can also use `TwoWayMap`, but use two maps independently can avoid some useless operations.
	 */
	private tpMap: WeakMap<Template, SlotPosition> = new WeakMap()
	private ptMap: WeakMap<SlotPosition, Template> = new WeakMap()

	/** After insert a template before a position, remember relative position. */
	addPosition(template: Template<any>, position: SlotPosition) {
		let prevT = this.ptMap.get(position)
		if (prevT) {
			this.tpMap.set(prevT, template.startInnerPosition)
			this.ptMap.set(template.startInnerPosition, prevT)
		}

		this.tpMap.set(template, position)
		this.ptMap.set(position, template)
	}

	/** 
	 * Get template position, the position where template located before it.
	 * So later when we want to get template nodes, just walk
	 * from first node of template to the node of this position.
	 */
	getPosition(template: Template<any>): SlotPosition | undefined {
		return this.tpMap.get(template)
	}

	/** Delete a template and it's not located before position anymore. */
	deletePosition(template: Template<any>, position: SlotPosition) {
		let prevT = this.ptMap.get(template.startInnerPosition)

		if (prevT) {
			this.tpMap.delete(template)
			this.ptMap.delete(template.startInnerPosition)

			this.tpMap.set(prevT, position)
			this.ptMap.set(position, prevT)
		}
		else {
			this.tpMap.delete(template)
			this.ptMap.delete(position)
		}
	}
}
