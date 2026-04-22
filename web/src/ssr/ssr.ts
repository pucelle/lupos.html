/** Whether in SSR environment. */
export let inSSR = false


/** Update `inSSR` variable, only for SSR env. */
export function resetInSSR(value: boolean) {
	inSSR = value
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