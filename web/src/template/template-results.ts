import {HTMLMaker} from './html-maker'
import {SlotPosition, SlotPositionType, SlotStartInnerPositionType} from './slot-position'
import {TemplateInitResult, TemplateMaker} from './template-maker'
import {CompiledTemplateResult} from './template-result-compiled'


/**
 * Make a `CompiledTemplateResult` to be interpolated into a `${...}`.
 * It works like `:html`, but have no need to specify container.
 * Note not like `:html`, here it can't skip html hydration like `:html=null`.
 */
export class HTMLTemplateResult extends CompiledTemplateResult {

	constructor(html: string) {
		super(makeHTMLTemplateMaker(html), [], null)
	}
}


/** To create a Template Maker from a html template string. */
function makeHTMLTemplateMaker(html: string): TemplateMaker {
	let htmlMaker = new HTMLMaker(html)

	return new TemplateMaker(function(_$context, $hydrates) {
		let locator = htmlMaker.make($hydrates)
		let startNode = locator.childAt(0)

		if (!startNode) {
			throw new Error(`HTML '${html}' must contain at least one node`)
		}

		let position = new SlotPosition<SlotStartInnerPositionType>(SlotPositionType.Before, startNode)

		return {
			el: locator.el,
			position,
		} as TemplateInitResult
	})
}

