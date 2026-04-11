import {UpdateQueue} from 'lupos'
import {willHydrate} from '../../../web/out'


type NodeCache = {node: Node, childNodes: NodeCache[]}

class NodesCloner {

	private el: HTMLElement
	private cache: NodeCache

	constructor(el: HTMLElement) {
		this.el = el
		this.cache = this.makeCache(el)
	}

	private makeCache(node: Node): NodeCache {
		return {
			node: node,
			childNodes: Array.from(node.childNodes).map(child => this.makeCache(child))
		}
	}

	compare() {
		return this.compareRecursively(this.el, this.cache)
	}

	private compareRecursively(node: Node, cached: NodeCache) {
		if (node !== cached.node) {
			throw new Error('Node mismatch:\nReceived: ' + node.toString() + '\nExpected: ' + cached.node.toString())
		}

		let currentChildren = node.childNodes
		if (currentChildren.length !== cached.childNodes.length) {
			throw new Error('Child length mismatch:\nReceived: ' + [...node.childNodes].map(this.outputChildNode).join(' | ')
				+ '\nExpected: ' + cached.childNodes.map(c => this.outputChildNode(c.node)).join(' | '))
		}

		for (let i = 0; i < currentChildren.length; i++) {
			this.compareRecursively(currentChildren[i], cached.childNodes[i])
		}
	}

	private outputChildNode(node: Node) {
		if (node.nodeType === Node.COMMENT_NODE) {
			return `<!--${node.textContent ?? ''}-->`
		}

		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent ?? ''
		}

		return node.toString()
	}
}


export async function hydrateCom<T extends {new(el?: HTMLElement, willHydrate?: boolean): any}>(Com: T, HydrateBy: T = Com):
	Promise<{ com: InstanceType<T>, compare: () => void }>
{
	let com = new Com()
	com.appendTo(document.body)
	await UpdateQueue.untilAllComplete()
	let outerHTML = com.el.outerHTML

	com.remove()

	let template = document.createElement('template')
	template.innerHTML = outerHTML

	let el = template.content.firstElementChild as HTMLElement
	let cloner = new NodesCloner(el)
	let newCom = new HydrateBy(el)
	willHydrate(el)
	await newCom.connectManually()

	return {
		com: newCom,
		compare: () => cloner.compare(),
	}
}

