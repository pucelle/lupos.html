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

- **Slot Contents within ${...}**:
	- `html...`: as HTML content.
	- `Array of html...`: as a list of HTML contents.
	- `Text`: as a text content.
	- `Node`: as a HTML node to move here.
	- `Promise<AnyContentAbove>`: update content after resolved it. Note you should ensure the async content visits all trackable properties before any `await`, after which the properties visiting will never be tracked.

- **Bindings**:
	- `:class`: bind element class names.
	- `:crossFadePair` bind an element to provide bounding rect for later crossfade transition.
	- `:html`: update `innerHTML` property of current element to codes.
	- `:ref`: ref an element or a component as property, or as parameter to call a callback.
	- `:style`: bind element style properties.
	- `:transition`: bind enter and leave transition.
	- `class newBinding implements Binding {...}`: to declare a new binding.

- **Blocks**
	- **await**: await an async render result, update with it after it resolved, and will show default content before it get resolved.
		```html
		<lu:await ${AsyncContent}>DefaultContent</lu:await>
		```
		Note you should ensure the `AsyncContent` visits all trackable properties before any `await`, after which the properties visiting will never be tracked.

	- **DynamicComponent**: decide which component to render in runtime.
		```html
		<${DynamicComponent} />
		```
	- **for**: loop an iterable object.
		```html
		<lu:for ${...}>${(item) => ...}</lu:for>
		```
	- **if**: control flow statements like which in javascript.
		```html
		<lu:if ${...} ?cache>...</lu:if>
		<lu:elseif>...</lu:elseif>
		<lu:else>...</lu:else>
		```
	- **keyed**: will totally replace contents after keyed value changed.
		```html
		<lu:keyed ${...} ?cache>...</lu:keyed>
		```
	- **switch**: switch control flow statements like which in javascript.
		```html
		<lu:switch ${...}>
			<lu:case ${...}>...</lu:case>
			<lu:default>...</lu:default>
		</switch>
		```

- **Component**
	- `Component`: base class of all components.
	- `class NewComponent implements Component {...}`: to declare a new component.
	- `defineCustomElement`: define a component as a custom element.
	- `Fragmented`: accept a render function, will render things independently.
	- `render`: render a html template literal to get a component like.

- **Template**
	- `` html`...` ``: html template literal to render html codes.
	- `` css`...` ``: css template literal to render css codes.

- **transition**
	- **transitions**
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

Use `SSR` export from `lupos/ssr` to do server side rendering, work in node, bun and workers.

You should render a entry component by `ssr.renderComponent`, and render css styles by `ssr.renderStyles`, and then interpolate them into the final HTML codes.

You should also add following codes to your `webpack.config.js` to exclude outputting style (which SSR had rendered).

```js
module: {
	rules: [
		{
			test: /\.js$/,
			loader: 'string-replace-loader',
			options: {
				search: /static style = .+/g, 
				replace: '',
			}
		}
	]
}
```

Note you may need to set `"moduleResolution": "Bundler"` in `tsconfig.json` to import `lupos/ssr`.



## Production

You should config your bundle tool to eliminate function call `debug_component`.



## More about

**lupos.html** was inspired by [lit-html](https://lit-html.polymer-project.org/) and [svelte](https://svelte.dev/).




## License

MIT