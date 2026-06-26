/** Whether in SSR environment. */
export let IN_SSR = false


/** Update `IN_SSR` variable, only for SSR env. */
export function reset_IN_SSR(value: boolean) {
	IN_SSR = value
}


/**
 * Calls a callback immediately on the web browser, 
 * or calls it before each time page SSR.
 */
export let onPageInit = function(callback: () => void) {
	callback()
}


/** Reset `onPageInit` function for SSR environment. */
export function resetOnPageInit(init: (callback: () => void) => void) {
	onPageInit = init
}