import {PerFrameTransitionOptions} from '../per-frame-transition'
import {Transition} from '../transition'


/** 
 * When enter, fade opacity from 0 to 1.
 * When leave, fade opacity from 1 to 0.
 * Use Web Animations API, fallback to initial state after transition end.
 */
export const fade = /*#__PURE__*/Transition.define(function(_el: Element, options: PerFrameTransitionOptions = {}) {
	return {
		...options,
		startFrame: {
			opacity: '0',
		},
		endFrame: {
			opacity: '1',
		},
	}
})