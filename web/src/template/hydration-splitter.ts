import {Template} from './template'
import {CompiledTemplateResult} from './template-result-compiled'


/** Split hydrate nodes for template result list. */
export class HydrateNodesSplitter {

	private hydrateNodes: ArrayLike<ChildNode>
	private template: Template | null = null
	private fromIndex: number = 0

	constructor(hydrateNodes: ArrayLike<ChildNode>) {
		this.hydrateNodes = hydrateNodes
	}

	/** Split nodes for a compiled template result */
	split(tr: CompiledTemplateResult): ChildNode[] | undefined {
			
		// Generate a empty template, not update, then compare elements bone.
		if (!this.template || !this.template.canUpdateBy(tr)) {
			this.template = tr.maker.make(tr.context)
		}

		let hIndex = this.fromIndex
		let templateNodes = this.template.el.content.childNodes

		for (let tIndex = 0; tIndex < templateNodes.length; tIndex++) {
			let tNode = templateNodes[tIndex]
			let hNode = hIndex < this.hydrateNodes.length ? this.hydrateNodes[hIndex] : null
			let hNodeMismatch = true

			if (!hNode) {
				break
			}

			if (tNode.nodeType === Node.ELEMENT_NODE) {
				hNodeMismatch = hNode.nodeType !== Node.ELEMENT_NODE
					|| (hNode as Element).localName !== (tNode as Element).localName
			}
			else if (tNode.nodeType === Node.COMMENT_NODE) {
				let commentId = tNode.textContent!

				hNodeMismatch = hNode.nodeType !== Node.COMMENT_NODE
					|| hNode.textContent !== commentId

				// Search for the match comment marker.
				if (hNodeMismatch) {
					for (let i = hIndex + 1; i < this.hydrateNodes.length; i++) {
						let n = this.hydrateNodes[i]
						if (n.nodeType === Node.COMMENT_NODE
							&& n.textContent === commentId
						) {
							hIndex = i
							hNode = n
							hNodeMismatch = false
							break
						}
					}
				}
			}
			else if (tNode.nodeType === Node.TEXT_NODE) {
				hNodeMismatch = hNode.nodeType !== Node.TEXT_NODE
			}

			// Eat this node whether match or not.
			hIndex++

			// Missing match, exit.
			if (hNodeMismatch) {
				break
			}
		}

		let nodes = hIndex === this.fromIndex ? undefined : Array.prototype.slice.call(this.hydrateNodes, this.fromIndex, hIndex)
		this.fromIndex = hIndex

		return nodes
	}

	/** Removes rest nodes. */
	clear() {
		if (this.fromIndex < this.hydrateNodes!.length) {
			for (let i = this.hydrateNodes!.length - 1; i >= this.fromIndex; i--) {
				this.hydrateNodes![i].remove()
			}
		}
	}
}