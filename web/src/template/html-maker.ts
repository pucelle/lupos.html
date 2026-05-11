import {HTMLLocator, HydrateHTMLLocator} from "./html-locator"

/** 
 * Create a template maker from inner html string.
 * Call the returned function to get a template element containing the html content.
 */
export class HTMLMaker {

	private html: string
	private wrapped: boolean
	private template: HTMLTemplateElement | null = null

	constructor(html: string, wrapped: boolean = false) {
		this.html = html
		this.wrapped = wrapped
	}

	private initTemplate() {
		this.template = document.createElement('template')
		this.template.innerHTML = this.html

		// Remove wrapped container.
		if (this.wrapped) {
			let container = this.template.content.firstElementChild!
			container.replaceWith(...container.childNodes)
		}
	}

	/** Note `hydrateNodes` should have at least one element if provided. */
	make(hydrateNodes: ArrayLike<ChildNode> | undefined): HTMLLocator | HydrateHTMLLocator {
		if (!this.template) {
			this.initTemplate()
		}
		
		if (hydrateNodes) {
			return new HydrateHTMLLocator(this.template!, hydrateNodes)
		}
		else {
			return new HTMLLocator(this.template!)
		}
	}
}