<h1 align="left">
    <img src="https://github.com/pucelle/lupos.html/blob/master/images/logo.png?raw=true" width="32" height="32" alt="Lupos Logo" />
    Lupos.html
</h1>



## About

**lupos.html** is a library for building Component-Based Web User Interface, powered by [lupos](https://github.com/pucelle/lupos).



## Features

- Uses [lupos](https://github.com/pucelle/lupos) to track get and set operations of component's properties.
- Uses `html` Template Literal to describe component's rendering, and compile templates with hoisted codes for better performance.



## Examples

```ts
import {Component, css, html} from 'lupos.html'


export class Checkbox extends Component {

	static style = css`
		.checkbox{
			...
			&.checked{...}
		}
	`

	checked: boolean = false

	protected render() {
		return html`
			<template class="checkbox" 
				:class.checked=${this.checked}
				@click=${this.onClick}
			>
				<slot />
			</template>
		`
	}

	protected onClick() {
		this.checked = !this.checked
	}
}
```



## APIs

- **Slot contents within `${...}`**:
	- `` html`...` ``: HTML content.
	- An array of `` html`...` `` results: a list of HTML contents.
	- A primitive value: text content.
	- `Node`: a DOM node to move into the slot.
	- `Promise<AnyContentAbove>`: content that updates after the promise resolves. Access trackable properties before the first `await`; property access after it is not tracked.

- **Bindings**:
	- `:class`: bind element class names.
	- `:crossFadePair`: provide an element's bounding rectangle for a later crossfade transition. Use `null` to remove the pair.
	- `:html`: update an element's `innerHTML`; script elements and inline event attributes are removed.
	- `:ref`: reference an element, component, or binding through a property or callback.
	- `:style`: bind element style properties.
	- `:transition`: bind enter and leave transition.
	- `class NewBinding implements Binding {...}`: declare a custom binding.

- **Blocks**:
	- **await**: show default content until an asynchronous render result resolves.
		```html
		<lu:await ${AsyncContent}>DefaultContent</lu:await>
		```
		`AsyncContent` should resolve to any supported slot content. Access trackable properties before the first `await`.

	- **DynamicComponent**: decide which component to render in runtime.
		```html
		<${DynamicComponent} />
		```
	- **for**: loop over an iterable object.
		```html
		<lu:for ${...}>${(item) => ...}</lu:for>
		```
	- **if**: conditionally render one branch.
		```html
		<lu:if ${...} cache>...</lu:if>
		<lu:elseif>...</lu:elseif>
		<lu:else>...</lu:else>
		```
	- **keyed**: replace the contents when the key changes.
		```html
		<lu:keyed ${...} cache>...</lu:keyed>
		```
	- **cache**: can restore previously rendered contents and states.
		```html
		<lu:cache>${...}</lu:cache>
		```
	- **switch**: switch control flow statements like which in javascript.
		```html
		<lu:switch ${...}>
			<lu:case ${...}>...</lu:case>
			<lu:default>...</lu:default>
		</lu:switch>
		```

- **Component**
	- `Component`: base class of all components.
	- `class NewComponent extends Component {...}`: declare a new component.
	- `defineCustomElement`: define a component as a custom element.
	- `Fragmented`: render a function independently from its parent component.
	- `render`: render content as a component-like object.

- **Template**
	- `` html`...` ``: html template literal to render html codes.
	- `` css`...` ``: css template literal to render css codes.

- **Transitions**:
	- Built-in transitions:
		- `blur`
		- `crossfade`
		- `draw`
		- `fade`
		- `fly`
		- `fold`
		- `frameRange`
	- `getEasingFunction`: get a map function by easing name.
	- `FrameLoop`: start a per-frame loop.
	- `PerFrameTransition`: play per-frame transition.
	- `WebTransition`: play web transition.
	- `Transition`: play defined web or per-frame transition.



## SSR & Hydration

Import `SSR` from `lupos.html/ssr` to perform server-side rendering in Node.js, Bun, or worker environments. Importing the module also installs the DOM globals required by the renderer.

Render an entry component with `ssr.renderComponent()` and its CSS with `ssr.renderStyles()`, then interpolate both results into the final HTML document. `renderStyles()` returns CSS text by default; pass `true` to include the `<style>` element.

```ts
import {SSR} from 'lupos.html/ssr'


const ssr = new SSR('/products')
const content = await ssr.renderComponent(App, 'app-root')
const styles = ssr.renderStyles(true)
```

During hydration, object-form `:class` bindings and property-form style bindings can reconcile pre-rendered values. String and list forms of `:class` are not hydrate-able. An empty object passed to `:style` preserves pre-rendered inline styles because it contains no owned property names to remove.

You should also add following codes to your `webpack.config.js` to exclude outputting style (which SSR had rendered), and eliminate useless SSR codes.

```js
module: {
	rules: [
		{
			test: /\.js$/,
			loader: 'string-replace-loader',
			options: {
				multiple: [
					{
						search: /\bstatic style = .+/g, 
						replace: '',
					},
					{
						search: /\bIN_SSR(?!\s*[=\},])/g, 
						replace: 'false',
					},
				]
			}
		}
	]
}
```

You may need to set `"moduleResolution": "Bundler"` in `tsconfig.json` to import `lupos.html/ssr`.



## Development

Build the web and SSR packages, compile the tests, and run the full test suite:

```bash
npm run build
npm run build-test
npm test -- --run
```



## Production

You should config your bundle tool to eliminate `IN_SSR` by replacing it to `false`.



## More about

**lupos.html** was inspired by [lit-html](https://lit-html.polymer-project.org/) and [svelte](https://svelte.dev/).




## License

MIT
