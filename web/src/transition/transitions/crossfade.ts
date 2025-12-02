import {UpdateQueue} from 'lupos'
import {TransitionOptions, TransitionResult, Transition, WebTransitionProperties} from '../transition'
import {assignWithoutKeys} from './utils'
import {InternalPairKeysListMap} from '../../structs/map'


export interface CrossFadeTransitionOptions extends TransitionOptions {

	/** The key to match a pair of elements. */
	key: any

	/** If specified, select this element and use it's rect to do transition. */
	rectSelector?: string

	/** 
	 * How to fit transition element with it's pair element.
	 *  - `contain`: be contained by pair element.
	 *  - `cover`: covers pair element.
	 *  - `stretch`: stretch to fit pair element's width and height.
	 * Default value is `stretch`.
	 */
	fitMode?: 'contain' | 'cover' | 'stretch'

	/** Whether also play fade transition. */
	fade?: boolean

	/** 
	 * Define the fallback transition when no matched element.
	 * E.g., `{fallback: fade()}`.
	 * By default no fallback defined, no transition will be played.
	 */
	fallback?: TransitionResult
}


/** Cache "Crossfade Key" -> "enter / leave" -> Element. */
const CrossFadeElementMatchMap: InternalPairKeysListMap<any, 'enter' | 'leave' | 'any', Element> = /*#__PURE__*/new InternalPairKeysListMap()


/** 
 * Set element for crossfade transition.
 * It will provide the mapped element rect for later connected `crossfade` transition,
 * but itself will not play transition.
 */
export function setCrossFadeElementForPairOnly(key: any, el: Element) {
	CrossFadeElementMatchMap.add(key, 'any', el)
}

/** Delete element previously set by `setCrossFadeElementForPairOnly` for crossfade transition. */
export function deleteCrossFadeElementForPairOnly(key: any, el: Element) {
	CrossFadeElementMatchMap.delete(key, 'any', el)
}

/** Get element for crossfade transition pair. */
export function getCrossFadeElementForPhase(key: any, phase: 'enter' | 'leave' | 'any') {
	let els = CrossFadeElementMatchMap.get(key, phase)
	if (!els) {
		return undefined
	}

	// Returns latest.
	return els[els.length - 1]
}


/** 
 * When enter, transform from the leave element to current state.
 * When leave, transform from current state to the leave element.
 * So you can see one element cross fade to another element.
 * Use Web Animations API, fallback to initial state after transition end.
 */
export const crossfade = /*#__PURE__*/Transition.define(async function(el: Element, options: CrossFadeTransitionOptions, phase: 'enter' | 'leave') {
	CrossFadeElementMatchMap.add(options.key, phase, el)

	// Sync same keyed enter and leave transitions.
	await UpdateQueue.untilAllComplete()

	let pairPhase: 'enter' | 'leave' = phase === 'enter' ? 'leave' : 'enter'
	let useAnyPair = false

	// Firstly try pair phase, otherwise try any phase.
	let pairEl = getCrossFadeElementForPhase(options.key, pairPhase)
	if (!pairEl) {
		pairEl = getCrossFadeElementForPhase(options.key, 'any')
		useAnyPair = true
	}

	// Delete key match after next-time update complete.
	UpdateQueue.untilAllComplete().then(() => {
		CrossFadeElementMatchMap.delete(options.key, phase, el)
	})

	// Fallback when there is no pair element.
	if (!pairEl) {
		let fallback = options.fallback
		if (!fallback) {
			return null
		}

		return fallback.getter(el, fallback.options, phase)
	}

	let fromRectOf = options.rectSelector ? el.querySelector(options.rectSelector) ?? el : el
	let toBox = pairEl.getBoundingClientRect()
	let elBox = el.getBoundingClientRect()
	let fromBox = fromRectOf === el ? elBox : fromRectOf.getBoundingClientRect()
	
	// Transform coord from el origin to pair element origin, based on viewport origin.
	let transformInViewport = fromBoxPair(fromBox, toBox, options.fitMode ?? 'stretch')

	// TransformInViewport * elLocalToViewport = elLocalToViewport * TransformInEl
	// TransformInEl = elLocalToViewport^-1 * TransformInViewport * elLocalToViewport
	let transformInElOrigin = new DOMMatrix()
		.translateSelf(-elBox.x, -elBox.y)
		.multiplySelf(transformInViewport)
		.translateSelf(elBox.x, elBox.y)

	let o: WebTransitionProperties = {
		startFrame: {
			transform: transformInElOrigin.toString(),
			transformOrigin: 'left top',
		},
		endFrame: {
			transform: 'none',
			transformOrigin: 'left top',
		},
	}

	if (options.fade) {
		o.startFrame.opacity = '0'
		o.endFrame.opacity = '1'
	}

	o = assignWithoutKeys(o, options, ['key', 'fallback'])

	// Play transitions for both el and pair element.
	if (useAnyPair) {

		// PairTransformInPair will transform pair element to el, based on top-left or pair element.
		// PairTransformInViewport = TransformInViewport^-1
		// PairTransformInViewport * pairLocalToViewport = pairLocalToViewport * PairTransformInPair
		// PairTransformInPair = pairLocalToViewport^-1 * PairTransformInViewport * pairLocalToViewport
		//                     = pairLocalToViewport^-1 * TransformInViewport^-1 * pairLocalToViewport
		let pTransform = new DOMMatrix()
			.translateSelf(-toBox.x, -toBox.y)
			.multiplySelf(transformInViewport.invertSelf())
			.translateSelf(toBox.x, toBox.y)

		let zIndex = parseInt(getComputedStyle(pairEl).zIndex) || 0

		let po: WebTransitionProperties = {
			el: pairEl,
			startFrame: {
				transform: 'none',
				transformOrigin: 'left top',
				zIndex: String(zIndex + 1),	// Higher than siblings.
			},
			endFrame: {
				transform: pTransform.toString(),
				transformOrigin: 'left top',
				zIndex: String(zIndex + 1),
			},
		}

		if (options.fade) {
			po.startFrame.opacity = '1'
			po.endFrame.opacity = '0'
		}
	
		po = assignWithoutKeys(po, options, ['key', 'fallback'])

		return [o, po]
	}
	else {
		return o
	}
})


/** 
 * Make a transform matrix, which will convert `fromBox` to `toBox`.
 * 
 * `fitMode` decides how to fit transition element with it's pair element.
 *  - `contain`: be contained by pair element.
 *  - `cover`: covers pair element.
 *  - `stretch`: stretch to fit pair element's width and height.
 * Default value is `stretch`.
 */
function fromBoxPair(fromBox: DOMRect, toBox: DOMRect, fitMode: 'contain' | 'cover' | 'stretch' = 'stretch'): DOMMatrix {
	let fromX = fromBox.x + fromBox.width / 2
	let fromY = fromBox.y + fromBox.height / 2
	let toX = toBox.x + toBox.width / 2
	let toY = toBox.y + toBox.height / 2

	let scaleX = toBox.width / fromBox.width
	let scaleY = toBox.height / fromBox.height

	if (fitMode === 'contain') {
		scaleX = scaleY = Math.min(scaleX, scaleY)
	}
	else if (fitMode === 'cover') {
		scaleX = scaleY = Math.max(scaleX, scaleY)
	}

	// DOMMatrix runs in post multiply order.
	let matrix = new DOMMatrix()
		.translateSelf(toX, toY)
		.scaleSelf(scaleX, scaleY)
		.translateSelf(-fromX, -fromY)

	return matrix
}
