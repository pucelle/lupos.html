import {EditType, getEditRecord} from '../../../web/out/structs/edit'
import {describe, it, expect} from 'vitest'


function restoredGraphEditOld<T>(oldItems: T[], newItems: T[], willReuse: boolean) {
	let record = getEditRecord(oldItems, newItems, willReuse)
	let oldObjItems: {v: T}[] = oldItems.map(v => {return {v}})
	let liveObjItems = [...oldObjItems]

	for (let r of record) {
		if (r.type === EditType.Leave) {
			
		}
		else if (r.type === EditType.LeaveModify) {
			oldObjItems[r.fromIndex].v = newItems[r.toIndex]
		}
		else if (r.type === EditType.Move) {
			remove(liveObjItems, oldObjItems[r.fromIndex])

			let liveIndex = r.insertIndex >= 0 && r.insertIndex < oldObjItems.length ? liveObjItems.indexOf(oldObjItems[r.insertIndex]) : liveObjItems.length
			liveObjItems.splice(liveIndex, 0, oldObjItems[r.fromIndex])
		}
		else if (r.type === EditType.MoveModify) {
			remove(liveObjItems, oldObjItems[r.fromIndex])
			
			let liveIndex = r.insertIndex >= 0 && r.insertIndex < oldObjItems.length ? liveObjItems.indexOf(oldObjItems[r.insertIndex]) : liveObjItems.length
			liveObjItems.splice(liveIndex, 0, oldObjItems[r.fromIndex])

			oldObjItems[r.fromIndex].v = newItems[r.toIndex]
		}
		else if (r.type === EditType.Delete) {
			remove(liveObjItems, oldObjItems[r.fromIndex])
		}
		else if (r.type === EditType.Insert) {
			let liveIndex = r.insertIndex >= 0 && r.insertIndex < oldObjItems.length ? liveObjItems.indexOf(oldObjItems[r.insertIndex]) : liveObjItems.length
			liveObjItems.splice(liveIndex, 0, {v: newItems[r.toIndex]})
		}
	}

	return liveObjItems.map(v => v.v)
}


/**
 * Remove all the `items` from `list`, and returns the removed values.
 * Note this method uses `splice` to remove values, and only removes each item for once.
 */
function remove<T>(list: T[], ...items: T[]): T[] {
	let removed = []

	for (let item of items) {
		let index = list.indexOf(item)

		if (index > -1) {
			removed.push(...list.splice(index, 1))
		}
	}

	return removed
}

function restoredGraphEditNew<T>(oldItems: T[], newItems: T[], willReuse: boolean) {
	let record = getEditRecord(oldItems, newItems, willReuse)
	let restored: T[] = []

	for (let r of record) {
		if (r.type === EditType.Leave) {
			restored.push(newItems[r.toIndex])
		}
		else if (r.type === EditType.LeaveModify) {
			restored.push(newItems[r.toIndex])
		}
		else if (r.type === EditType.Move) {
			restored.push(newItems[r.toIndex])
		}
		else if (r.type === EditType.MoveModify) {
			restored.push(newItems[r.toIndex])
		}
		else if (r.type === EditType.Delete) {
			
		}
		else if (r.type === EditType.Insert) {
			restored.push(newItems[r.toIndex])
		}
	}

	return restored
}


describe('Test Graph Edit', () => {
	it('delete and insert', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = []
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Delete, insertIndex: -1, fromIndex: 0, toIndex: -1},
			{type: EditType.Delete, insertIndex: -1, fromIndex: 1, toIndex: -1},
			{type: EditType.Delete, insertIndex: -1, fromIndex: 2, toIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Insert, insertIndex: 0, fromIndex: -1, toIndex: 0},
			{type: EditType.Insert, insertIndex: 0, fromIndex: -1, toIndex: 1},
			{type: EditType.Insert, insertIndex: 0, fromIndex: -1, toIndex: 2},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('leave', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [1, 2, 3]
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 2},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('move', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [3, 1, 2]

		// Should test c = [2, 3, 1] with a, b?
		// No, (123), (231), (312) make up a permutation group,
		// any two of them can generate all elements in the group.
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Move, insertIndex: 0, fromIndex: 2, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 2},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 1},
			{type: EditType.Move, insertIndex: -1, fromIndex: 0, toIndex: 2},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('move modify', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [4, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, insertIndex: 0, fromIndex: 2, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 2},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 1},
			{type: EditType.MoveModify, insertIndex: -1, fromIndex: 0, toIndex: 2},
		])

		expect(getEditRecord(a, b, false)).toEqual([
			{type: EditType.Insert, insertIndex: 0, fromIndex: -1, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 2},
			{type: EditType.Delete, insertIndex: -1, fromIndex: 2, toIndex: -1},
		])

		expect(getEditRecord(b, a, false)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 1},
			{type: EditType.Insert, insertIndex: -1, fromIndex: -1, toIndex: 2},
			{type: EditType.Delete, insertIndex: -1, fromIndex: 0, toIndex: -1},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('move modify and insert delete', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [4, 5, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, insertIndex: 0, fromIndex: 2, toIndex: 0},
			{type: EditType.Insert, insertIndex: 0, fromIndex: -1, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 2},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 3},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 3, toIndex: 1},
			{type: EditType.MoveModify, insertIndex: -1, fromIndex: 0, toIndex: 2},
			{type: EditType.Delete, insertIndex: -1, fromIndex: 1, toIndex: -1},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('repeated items', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [1, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, insertIndex: 0, fromIndex: 2, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 1},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 1, toIndex: 2},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, insertIndex: -1, fromIndex: 0, toIndex: 0},
			{type: EditType.Leave, insertIndex: -1, fromIndex: 2, toIndex: 1},
			{type: EditType.MoveModify, insertIndex: -1, fromIndex: 1, toIndex: 2},
		])

		expect(restoredGraphEditOld(a, b, true)).toEqual(b)
		expect(restoredGraphEditOld(b, a, true)).toEqual(a)
		expect(restoredGraphEditOld(a, b, false)).toEqual(b)
		expect(restoredGraphEditOld(b, a, false)).toEqual(a)

		expect(restoredGraphEditNew(a, b, true)).toEqual(b)
		expect(restoredGraphEditNew(b, a, true)).toEqual(a)
		expect(restoredGraphEditNew(a, b, false)).toEqual(b)
		expect(restoredGraphEditNew(b, a, false)).toEqual(a)
	})


	it('random data', () => {
		for (let i = 0; i < 100; i++) {
			let a: number[] = []
			let b: number[] = []

			for (let i = 0; i < 10; i++) {
				a.push(Math.floor(Math.random() * 10))
				b.push(Math.floor(Math.random() * 10))
			}

			// For debugging.
			// console.log('------------------------')
			// console.log(a)
			// console.log(b)

			expect(restoredGraphEditOld(a, b, true)).toEqual(b)
			expect(restoredGraphEditOld(b, a, true)).toEqual(a)
			expect(restoredGraphEditOld(a, b, false)).toEqual(b)
			expect(restoredGraphEditOld(b, a, false)).toEqual(a)

			expect(restoredGraphEditNew(a, b, true)).toEqual(b)
			expect(restoredGraphEditNew(b, a, true)).toEqual(a)
			expect(restoredGraphEditNew(a, b, false)).toEqual(b)
			expect(restoredGraphEditNew(b, a, false)).toEqual(a)
		}
	})
})
