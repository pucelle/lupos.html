/** Can run `bunx madge out/index.js --circular` to check for circular dependencies. */
export class Registries<O extends Record<string, any>> {

	private map: Map<string, any> = new Map()

	/** Help to register a component to solve circular dependencies problem. */
	register<K extends keyof O & string>(name: K, Com: O[K]) {
		this.map.set(name, Com)
	}

	/** To get registered component by name. */
	resolve<K extends keyof O & string>(name: K): O[K] {
		return this.map.get(name)
	}
}