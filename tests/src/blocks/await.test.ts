import {UpdateQueue} from 'lupos'
import * as lupos from '../../../web/out'
import {describe, it, expect} from 'vitest'


describe('Test Await Block', () => {

	/** Render an await block with fallback content. */
	let render = (promise: Promise<lupos.RenderResult>) => {
		return lupos.html`
			<lu:await ${promise}>Pending</lu:await>
		`
	}

	/** Make a connected root slot and its container. */
	let makeConnectedSlot = () => {
		let container = document.createElement('div')
		let slot = new lupos.TemplateSlot<null>(new lupos.SlotPosition(lupos.SlotPositionType.AfterContent, container), null)
		slot.afterConnectCallback(lupos.PartCallbackParameterMask.AsDirectNode)

		return {container, slot}
	}


	it('renders fallback content while waiting', async () => {
		let {container, slot} = makeConnectedSlot()

		let resolve: (value: lupos.RenderResult) => void
		let promise = new Promise<lupos.RenderResult>((r) => {
			resolve = r
		})

		slot.update(render(promise))
		expect(container.textContent).toEqual('')

		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')

		resolve!(lupos.html`Then`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Then')
	})


	it('skips fallback content when promise resolves quickly', async () => {
		let {container, slot} = makeConnectedSlot()

		slot.update(render(Promise.resolve(lupos.html`Resolved`)))
		expect(container.textContent).toEqual('')

		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Resolved')
	})


	it('ignores superseded promise results', async () => {
		let {container, slot} = makeConnectedSlot()

		let resolveFirst: (value: lupos.RenderResult) => void
		let firstPromise = new Promise<lupos.RenderResult>((resolve) => {
			resolveFirst = resolve
		})

		let resolveSecond: (value: lupos.RenderResult) => void
		let secondPromise = new Promise<lupos.RenderResult>((resolve) => {
			resolveSecond = resolve
		})

		slot.update(render(firstPromise))
		slot.update(render(secondPromise))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')

		resolveFirst!(lupos.html`First`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')

		resolveSecond!(lupos.html`Second`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Second')
	})


	it('does not render resolved content after disconnect', async () => {
		let {container, slot} = makeConnectedSlot()

		let resolve: (value: lupos.RenderResult) => void
		let promise = new Promise<lupos.RenderResult>((r) => {
			resolve = r
		})

		slot.update(render(promise))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')

		await slot.beforeDisconnectCallback(lupos.PartCallbackParameterMask.AsDirectNode)
		resolve!(lupos.html`Resolved`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Pending')
	})


	it('supports awaiting without fallback content', async () => {
		let renderWithoutFallback = (promise: Promise<lupos.RenderResult>) => {
			return lupos.html`<lu:await ${promise}></lu:await>`
		}

		let {container, slot} = makeConnectedSlot()

		let resolve: (value: lupos.RenderResult) => void
		let promise = new Promise<lupos.RenderResult>((r) => {
			resolve = r
		})

		slot.update(renderWithoutFallback(promise))
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('')

		resolve!(lupos.html`Resolved`)
		await Promise.resolve()
		await UpdateQueue.untilComplete()
		expect(container.textContent).toEqual('Resolved')
	})
})
