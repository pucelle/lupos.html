import {willHydrate} from '../component'
import {getComponentByElement} from '../component/from-element'


/** For locating comment nodes by their id. */
export class HTMLLocator {

	/** The template element to store all child nodes. */
	el: HTMLTemplateElement

	/** The comment map to store comments by id. */
	private markerMap: Map<string, Comment> = new Map()

	constructor(template: HTMLTemplateElement) {
		this.el = template.cloneNode(true) as HTMLTemplateElement
		this.walkForMarkers()
	}

	private walkForMarkers() {
		let walker = document.createTreeWalker(
			this.el.content, 
			NodeFilter.SHOW_COMMENT,
			null
		)

		let currentNode
		while (currentNode = walker.nextNode()) {
			let id = (currentNode as Comment).textContent
			this.markerMap.set(id, currentNode as Comment)
		}
	}

	childAt(index: number) {
		return this.el.content.childNodes[index]
	}

	getMarker(id: string): Comment {
		return this.markerMap.get(id)!
	}

	getNodes(_id: string): undefined {
		return undefined
	}
}


/** For hydration comment nodes by their id. */
export class HydrateHTMLLocator {

	/** The template element to store all child nodes. */
	el: HTMLTemplateElement
	
	/** Nodes to hydrate. */
	private hydrateNodes: ArrayLike<ChildNode>

	/** The comment map to store comments by id. */
	private markerMap: Map<string, Comment> = new Map()

	/** The ranged nodes of specified id. */
	private rangedNodesMap: Map<string, ChildNode[]> = new Map()

	/** Note `hydrateNodes` should have at least one element. */
	constructor(template: HTMLTemplateElement, hydrateNodes: ArrayLike<ChildNode>) {
		this.hydrateNodes = hydrateNodes

		// Initialize an empty template container.
		this.el = document.createElement('template')

		// Patch to SSR nodes.
		this.patchNodesRecursively(template.content.childNodes, hydrateNodes)
	}

	private patchNodesRecursively(templateNodes: ArrayLike<ChildNode>, hydrateNodes: ArrayLike<ChildNode>) {
		let hIndex = 0
		let latestHNode = hydrateNodes[0]

		for (let tIndex = 0; tIndex < templateNodes.length; tIndex++) {
			let tNode = templateNodes[tIndex]
			let hNode = hIndex < hydrateNodes.length ? hydrateNodes[hIndex] : null

			// hydration list end, clone from template to append.
			if (!hNode) {
				hNode = tNode.cloneNode(true) as ChildNode
				this.walkAndMapMarkers(hNode as Element)

				latestHNode.after(hNode)
				latestHNode = hNode
				hIndex++
				continue
			}

			if (tNode.nodeType === Node.ELEMENT_NODE) {
				let hNodeMismatch = hNode.nodeType !== Node.ELEMENT_NODE
					|| (hNode as Element).localName !== (tNode as Element).localName

				// Missing match, replace it.
				if (hNodeMismatch) {
					let newHNode = tNode.cloneNode(true) as ChildNode
					this.walkAndMapMarkers(newHNode as Element)

					hNode!.replaceWith(newHNode)
					hNode = newHNode
				}

				// Handle component. 
				else if ((tNode as Element).hasAttribute('com')) {
					willHydrate(hNode as Element)
					
					this.patchElementProperties(tNode as Element, hNode as Element)

					if (tNode.childNodes.length > 0) {
						this.patchRestSlotNodes(tNode as Element, hNode as Element)
					}
				}

				// Skip rest slot contents hydration.
				else if ((tNode as Element).localName !== 'slot') {
					this.patchElementProperties(tNode as Element, hNode as Element)

					// Skip elements which will apply `:html`. 
					if (!(tNode as Element).hasAttribute('html')) {
						this.patchChildNodesRecursively(tNode, hNode)
					}
				}
			}
			else if (tNode.nodeType === Node.COMMENT_NODE) {
				let markerId = tNode.textContent!

				let hNodeMismatch = hNode.nodeType !== Node.COMMENT_NODE
					|| hNode.textContent !== markerId

				// Search for the comment marker by id.
				if (hNodeMismatch) {
					let markerIndex = this.findMarker(markerId, hIndex, hydrateNodes)
					if (markerIndex !== -1) {
						hIndex = markerIndex
						hNode = hydrateNodes[markerIndex]
						hNodeMismatch = false
					}
				}

				// Missing match, replace it.
				if (hNodeMismatch) {
					let newHNode = tNode.cloneNode(true) as ChildNode
					hNode!.replaceWith(newHNode)
					hNode = newHNode
				}

				if (markerId) {
					this.markerMap.set(markerId, hNode as Comment)
				}
			}
			else if (tNode.nodeType === Node.TEXT_NODE) {
				let hNodeMismatch = hNode.nodeType !== Node.TEXT_NODE

				// Missing match, insert text before current node.
				if (hNodeMismatch) {
					let newText = tNode.cloneNode(true) as ChildNode
					hNode!.before(newText)
				}
			}

			latestHNode = hNode
			hIndex++
		}

		// Removes redundant nodes.
		if (hIndex < hydrateNodes.length) {
			this.cleanHydrateNodes(templateNodes, hydrateNodes, hIndex)
		}
	}

	/** Patch for rest slot nodes. */
	private patchRestSlotNodes(tNode: Element, hNode: Element) {

		// Locate hydrated rest slot contents.
		let restSlotMarkerId = tNode.firstChild!.textContent!
		let restSlotMarker = this.walkAndFindMarker(hNode, restSlotMarkerId)

		if (restSlotMarker) {
			this.patchNodesRecursively(tNode.childNodes, restSlotMarker.parentElement!.childNodes)
		}

		// We make a new empty template to cache cloned nodes,
		// to make locator can at least locate these nodes.
		// and also insert into parent `hNode` as silent rest slot nodes.
		else {
			let template = document.createElement('template')

			for (let i = 0; i < tNode.childNodes.length; i++) {
				let cloned = tNode.childNodes[i].cloneNode(true)
				template.content.append(cloned)
			}

			this.walkAndMapMarkers(template.content)
			hNode.appendChild(template.content)
		}
	}

	/** 
	 * Patch element properties, especially class and style.
	 * But leaves additional attrs which hNode have only.
	 */
	private patchElementProperties(tNode: Element, hNode: Element) {
		let tAttrs = tNode.attributes
		let hAttrs = hNode.attributes

		for (let tAttr of tAttrs) {
			if (hAttrs.getNamedItem(tAttr.name)?.value !== tAttr.value) {
				hAttrs.setNamedItem(tAttr.cloneNode() as Attr)
			}
		}

		for (let attrName of ['class', 'style']) {
			if (!tAttrs.getNamedItem(attrName) && hAttrs.getNamedItem(attrName)) {
				hAttrs.removeNamedItem(attrName)
			}
		}
	}

	/** Can handle when `hNode` have no child nodes. */
	private patchChildNodesRecursively(tNode: Node, hNode: Node) {

		// Empty text node will be removed.
		if (hNode.childNodes.length === 0) {
			if (tNode.childNodes.length > 0) {
				for (let child of tNode.childNodes) {
					hNode.appendChild(child.cloneNode(true))
				}
			}
		}

		// Skip both have no child nodes.
		else if (hNode.childNodes.length > 0) {
			this.patchNodesRecursively(tNode.childNodes, hNode.childNodes)
		}
	}

	/** Clean hydration nodes that have no template nodes match. */
	private cleanHydrateNodes(templateNodes: ArrayLike<ChildNode>, hydrateNodes: ArrayLike<ChildNode>, hIndex: number) {
		
		// Like `<Row><Col /></Row>`, row template not specify `<slot>`,
		// so `<Col />` becomes silent rest slot contents.
		let cleanFromIndex = hydrateNodes.length - 1

		if (templateNodes.length === 0) {
			let containerCom = getComponentByElement(hydrateNodes[0].parentElement!)
			if (containerCom) {
				let restSlotStartNode = containerCom.$getRestSlotStartNode()
				if (restSlotStartNode) {
					for (let i = hydrateNodes.length - 1; i >= hIndex; i--) {
						if (hydrateNodes[i] === restSlotStartNode) {
							cleanFromIndex = i - 1
							break
						}
					}
				}
			}
		}

		if (cleanFromIndex >= hIndex) {
			for (let i = cleanFromIndex; i >= hIndex; i--) {
				hydrateNodes[i].remove()
			}
		}
	}

	/** Walk and build markers map. */
	private walkAndMapMarkers(node: Element | DocumentFragment) {
		let walker = document.createTreeWalker(
			node, 
			NodeFilter.SHOW_COMMENT,
			null
		)

		let currentNode
		while (currentNode = walker.nextNode()) {
			let id = (currentNode as Comment).textContent
			if (id) {
				this.markerMap.set(id, currentNode as Comment)
			}
		}
	}

	/** Walk and try to find a specified id of marker. */
	private walkAndFindMarker(node: Node, markerId: string): Node | undefined {
		let walker = document.createTreeWalker(
			node, 
			NodeFilter.SHOW_COMMENT,
			null
		)

		let currentNode
		while (currentNode = walker.nextNode()) {
			let id = (currentNode as Comment).textContent
			if (id === markerId) {
				return currentNode
			}
		}

		return undefined
	}

	/** Scan for specified id marker. */
	private findMarker(markerId: string, hIndex: number, hydrateNodes: ArrayLike<ChildNode>): number {
		for (let i = hIndex + 1; i < hydrateNodes.length; i++) {
			let node = hydrateNodes[i]
			if (node.nodeType === Node.COMMENT_NODE
				&& node.textContent === markerId
			) {
				let rangedNodes: ChildNode[] = Array.prototype.slice.call(hydrateNodes, hIndex, i)
				this.rangedNodesMap.set(markerId, rangedNodes)
				
				return i
			}
		}

		return -1
	}

	childAt(index: number) {
		return this.hydrateNodes[index]
	}

	getMarker(id: string): Comment {
		return this.markerMap.get(id)!
	}

	getNodes(id: string): ChildNode[] | undefined {
		return this.rangedNodesMap.get(id)
	}
}