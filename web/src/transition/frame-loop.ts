import {AnimationFrame} from 'lupos'


/** Callback with a timestamp as parameter. */
type FrameLoopCallback = (duration: number) => void


/** Repeated animation frames. */ 
export class FrameLoop<F extends FrameLoopCallback = FrameLoopCallback> {
	
	/** 
	 * Whether current time control has been canceled.
	 * Readonly outside.
	 */
	canceled: boolean = false

	/** The original function to call after timeout. */
	fn: F

	/** Animation frame id, `null` represents it's not exist. */
	protected id: any = null

	private startTimestamp: number = 0

	constructor(fn: F) {
		this.fn = fn
	}

	/** Whether frame loop is running. */
	get running(): boolean {
		return !!this.id
	}

	/** 
	 * Restart animation frame, even it was canceled before.
	 * Calls `fn` with duration parameter `0` immediately.
	 */
	reset() {
		if (this.id !== null) {
			AnimationFrame.cancel(this.id)
		}

		this.id = AnimationFrame.requestCurrent(this.onCurrentFrame.bind(this))
		this.canceled = false
		this.fn(0)
	}

	/** 
	 * Start or restart animation frame, even it was canceled before.
	 * Calls `fn` with duration parameter `0` immediately.
	 */
	start() {
		this.reset()
	}

	private onCurrentFrame(timestamp: number) {
		this.startTimestamp = timestamp
		this.id = AnimationFrame.requestNext(this.onFrame.bind(this))
	}

	private onFrame(timestamp: number) {
		this.id = AnimationFrame.requestNext(this.onFrame.bind(this))

		// Calls `fn` must after request animation frame,
		// Or will fail if cancel inside `fn`.
		this.fn(timestamp - this.startTimestamp)
	}

	/** Just restart animation frame. */
	flush() {
		this.reset()
	}

	/** Cancel animation frame. */
	cancel() {
		if (this.id !== null) {
			AnimationFrame.cancel(this.id)
			this.id = null
		}
		
		this.canceled = true
	}
}
