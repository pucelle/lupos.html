import {deleteCrossFadeElementForPairOnly, setCrossFadeElementForPairOnly} from '../transition'
import {Binding} from './types'
import {Part} from '../part'


/**
 * `:crossFadePair` can bind an element to provide it's bounding rect for later crossfade transition,
 * but the element itself will not participate in crossfade transition.
 * - `<el :crossFadePair=${key | null}>`: key can be any type, which matches the key parameter of `:transition=${crossfade({key})}`
 */
export class crossFadePair implements Binding, Part {

	protected readonly el: Element
	protected key: any | null = null
	protected connected: boolean = false

	constructor(el: Element) {
		this.el = el
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		this.connected = true

		if (this.key !== null) {
			setCrossFadeElementForPairOnly(this.key, this.el)
		}
	}

	beforeDisconnectCallback(): Promise<void> | void {
		if (!this.connected) {
			return
		}

		this.connected = false

		if (this.key !== null) {
			deleteCrossFadeElementForPairOnly(this.key, this.el)
		}
	}

	update(key: any) {
		if (this.connected) {
			if (this.key !== null) {
				deleteCrossFadeElementForPairOnly(this.key, this.el)
			}

			if (key !== null) {
				setCrossFadeElementForPairOnly(key, this.el)
			}
		}

		this.key = key
	}
}
