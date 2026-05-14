import {PerFrameTransitionOptions} from '../per-frame-transition'
import {TransitionProperties, Transition} from '../transition'
import {assignWithoutKeys} from './utils'


export interface BlurTransitionOptions extends PerFrameTransitionOptions {

	/** 
	 * CSS filter blur radius, can be number, or css value with unit.
	 * Default value is `5`.
	 */
	radius: number | string

	/** 
	 * If want element is also fade out when leave, or fade in when enter
	 * specifies this value to `true`.
	 * Default value is `false`.
	 */
	fade?: boolean
}


/** 
 * When enter, do blur filter from with radius from specified value to 0.
 * When leave, do blur filter from with radius from 0 to specified value.
 * Use Web Animations API, fallback to initial state after transition end.
 */
export const blur = /*#__PURE__*/Transition.define(function(_el: Element, options: BlurTransitionOptions = {radius: 5}) {
	let blurValue = typeof options.radius === 'number' ? options.radius + 'px' : options.radius

	let o: TransitionProperties = {
		startFrame: {
			filter: `blur(${blurValue})`,
		},
		endFrame: {
			filter: 'none',
		},
	}

	if (options.fade) {
		o.startFrame.opacity = '0'
		o.endFrame.opacity = '1'
	}

	return assignWithoutKeys(o, options, ['radius', 'fade'])
})