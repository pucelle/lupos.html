import {Observed, trackSet, UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test For Block', () => {
	let render = (list: number[]) => {
		return lupos.html`
			<lu:for ${list}>${(item: number) => lupos.html`
				<div>${item}</div>
			`}</lu:for>
		`
	}


	let container = document.createElement('div')
	let slot = new lupos.TemplateSlot(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)
	slot.afterConnectCallback(lupos.PartCallbackParameterMask.AsDirectNode)


	it('For Block', async () => {

		slot.update(render([1]))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('1')

		slot.update(render([1, 2]))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('12')

		slot.update(render([2, 3]))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('23')

		slot.update(render([]))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('')
	})


	it('For Block with Random Data', async () => {
		for (let i = 0; i < 10; i++) {
			let list: number[] = []
			list.push(Math.floor(Math.random() * 10))

			slot.update(render(list))
			await UpdateQueue.untilComplete()
			expect(container.textContent).toEqual(list.join(''))
		}
	})
})


/** Stable identity and displayed content can change independently. */
interface KeyedItem {

	/** Logical identity, preserved across object replacement. */
	id: number

	/** Content to refresh when an item is replaced. */
	label: string
}


/** Create an isolated connected slot for keyed loop tests. */
function createKeyedFixture() {
	let container = document.createElement('div')
	let slot = new lupos.TemplateSlot(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)
	slot.afterConnectCallback(lupos.PartCallbackParameterMask.AsDirectNode)
	return {container, slot}
}

/** Render replacement objects with a property name or callback selector. */
function renderKeyed(items: KeyedItem[], key: lupos.ForBlockKey<KeyedItem> = 'id') {
	return lupos.html`<lu:for ${item, index} of ${items} key=${key}>
		<div>${index}: ${item.label}</div>
	</lu:for>`
}


describe('Test keyed For Block', () => {
	it('reuses property-keyed nodes for replacement objects and reorders them', async () => {
		let {container, slot} = createKeyedFixture()
		slot.update(renderKeyed([{id: 1, label: 'one'}, {id: 2, label: 'two'}]))
		await UpdateQueue.untilComplete()
		let nodes = [...container.querySelectorAll('div')]
		nodes[0].setAttribute('data-state', 'retained')

		slot.update(renderKeyed([{id: 2, label: 'second'}, {id: 1, label: 'first'}]))
		await UpdateQueue.untilComplete()
		let updated = [...container.querySelectorAll('div')]
		expect(updated).toEqual([nodes[1], nodes[0]])
		expect(updated.map(node => node.textContent)).toEqual(['0: second', '1: first'])
		expect(updated[1].getAttribute('data-state')).toBe('retained')
	})

	it('inserts and removes keys without reusing a different item', async () => {
		let {container, slot} = createKeyedFixture()
		slot.update(renderKeyed([{id: 1, label: 'one'}]))
		await UpdateQueue.untilComplete()
		let previous = container.querySelector('div')

		slot.update(renderKeyed([{id: 2, label: 'two'}]))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).not.toBe(previous)
		expect(container.contains(previous)).toBe(false)
		expect(container.textContent?.trim()).toBe('0: two')

		slot.update(renderKeyed([]))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).toBeNull()
	})

	it('supports literal key attributes with renderer shorthand', async () => {
		let {container, slot} = createKeyedFixture()

		/** Exercise the static compiler path and shorthand renderer together. */
		let render = (items: KeyedItem[]) => lupos.html`<lu:for ${items} key="id">${item => lupos.html`<div>${item.label}</div>`}</lu:for>`

		slot.update(render([{id: 1, label: 'one'}]))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')
		slot.update(render([{id: 1, label: 'updated'}]))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).toBe(node)
		expect(node?.textContent).toBe('updated')
	})

	it('supports callback keys and dynamically changing the selector', async () => {
		let {container, slot} = createKeyedFixture()
		let selector = (item: KeyedItem) => item.id
		slot.update(renderKeyed([{id: 1, label: 'one'}], selector))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')

		slot.update(renderKeyed([{id: 1, label: 'updated'}], item => item.id))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).toBe(node)
		expect(node?.textContent).toBe('0: updated')

		slot.update(renderKeyed([{id: 1, label: 'updated'}], 'label'))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).not.toBe(node)
	})

	it('snapshots previous keys when an item key mutates in place', async () => {
		let {container, slot} = createKeyedFixture()
		let item = {id: 1, label: 'one'}
		slot.update(renderKeyed([item]))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')
		item.id = 2
		slot.update(renderKeyed([item]))
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).not.toBe(node)
	})

	it('tracks key-property changes even without a new iterable update', async () => {
		let {container, slot} = createKeyedFixture()
		let item = {id: 1, label: 'one'}
		slot.update(renderKeyed([item]))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')
		item.id = 2
		trackSet(item, 'id')
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).not.toBe(node)
	})

	it('tracks inline key-extractor reads on observed items', async () => {
		let {container, slot} = createKeyedFixture()

		/** The compiler propagates item observation into the selector parameter. */
		let render = (items: Observed<KeyedItem[]>) => lupos.html`<lu:for ${item} of ${items} key=${item => item.id}><div>${item.label}</div></lu:for>`

		let item = {id: 1, label: 'one'}
		slot.update(render([item]))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')
		item.id = 2
		trackSet(item, 'id')
		await UpdateQueue.untilComplete()
		expect(container.querySelector('div')).not.toBe(node)
	})

	it('recreates a keyed row when its template maker changes', async () => {
		let {container, slot} = createKeyedFixture()

		/** Stable keys do not make different template structures interchangeable. */
		let render = (items: KeyedItem[]) => lupos.html`<lu:for ${item} of ${items} key="id">
			${item.label === 'one' ? lupos.html`<div>${item.label}</div>` : lupos.html`<span>${item.label}</span>`}
		</lu:for>`

		slot.update(render([{id: 1, label: 'one'}]))
		await UpdateQueue.untilComplete()
		let node = container.querySelector('div')
		slot.update(render([{id: 1, label: 'two'}]))
		await UpdateQueue.untilComplete()
		expect(container.contains(node)).toBe(false)
		expect(container.querySelector('span')?.textContent).toBe('two')
	})
})
