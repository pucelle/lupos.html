import {IN_DEV} from 'lupos'


/** Whether in SSR environment. */
export let IN_SSR = false

/** Whether in SSR production environment. */
export let IN_SSR_PROD = !IN_DEV


/** Update `IN_SSR` variable, only for SSR env. */
export function reset_IN_SSR(value: boolean) {
	IN_SSR = value
}


/** Update `IN_SSR_PROD` variable, only for SSR env. */
export function reset_IN_SSR_PROD(value: boolean) {
	IN_SSR_PROD = value
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


interface SSRPaging {
	current: number
	total: number
}

/** Set paging index for SSR env. */
export let SSRPaging: SSRPaging | null = null

/** Set paging index for SSR env. */
export function setSSRPaging(paging: SSRPaging | null) {
	SSRPaging = paging
}
