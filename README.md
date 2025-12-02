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

- **Bindings**:
	- `:class`: bind element class names.
	- `:crossFadePair` bind an element to provide bounding rect for later crossfade transition.
	- `:html`: update `innerHTML` property of current element to codes.
	- `:ref`: ref an element or a component as property, or as parameter to call a callback.
	- `:slot`: bind element as a slot element, later it may replace same named `<slot name=...>`.
	- `:style`: bind element style properties.
	- `:transition`: bind enter and leave transition.
	- `class newBinding implements Binding {...}`: to declare a new binding.

- **Blocks**
	- **await**: await a promise expression, switch to `then` after promise resolved, or `<catch>` after promise rejected.
		```html
		<lu:await ${...}>...</lu:await>
		<lu:then>...</lu:then>
		<lu:catch>...</lu:catch>
		```
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


## More about

**lupos.html** was inspired by [lit-html](https://lit-html.polymer-project.org/) and [svelte](https://svelte.dev/).



## License

MIT