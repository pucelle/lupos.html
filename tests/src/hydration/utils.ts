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
		return this.compareRecursive(this.el, this.cache)
	}

	private compareRecursive(node: Node, cached: NodeCache) {
		if (node !== cached.node) {
			throw new Error('Node mismatch:\n' + node.toString() + '\n' + cached.node.toString())
		}

		let currentChildren = node.childNodes
		if (currentChildren.length !== cached.childNodes.length) {
			throw new Error('Child length mismatch:\n' + [...node.childNodes].map(c => c.toString()).join('') + '\n' + cached.childNodes.map(c => c.node.toString()).join(''))
		}

		for (let i = 0; i < currentChildren.length; i++) {
			this.compareRecursive(currentChildren[i], cached.childNodes[i])
		}
	}
}


export async function hydrateCom<T extends {new(el?: HTMLElement, willHydrate?: boolean): any, fromClosest(el: any): any }>(Com: T):
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
	let newCom = new Com(el)
	willHydrate(el)
	await newCom.connectManually()

	return {
		com: newCom,
		compare: () => cloner.compare(),
	}
}

