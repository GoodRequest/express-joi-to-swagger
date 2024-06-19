import { Debugger, Session } from 'inspector'
import path from 'path'
import { promisify } from 'util'
import { randomUUID as v4 } from 'node:crypto'

import { CacheManager, ILocation } from './cache-amanger.class'
import { Deferred } from './deffered.class'
import { ISwaggerMiddlewareConfig } from '../types/interfaces'

const PREFIX = '__functionLocation__'

export interface ILocateOptions {
	closure: string
	middlewareArguments: ISwaggerMiddlewareConfig['middlewareArguments']
}

export class SessionManager {
	private cache: CacheManager = new CacheManager()
	private session: Session | undefined
	private post$: any
	private scripts: {
		[scriptId: string]: Debugger.ScriptParsedEventDataType
	} = {}

	public async clean(): Promise<boolean> {
		if (!this.session) {
			return true
		}

		await this.post$('Runtime.releaseObjectGroup', {
			objectGroup: PREFIX
		})

		this.session.disconnect()
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		delete global[PREFIX]
		this.session = undefined
		this.cache.clear()

		return true
	}

	/**
	 * @description Returns all own properties of given debug object
	 * @note stackSize should always be 0 to forbid stack overflow errors
	 * @property debug object
	 * @property stackSize should always be 0 to forbid stack overflow errors
	 * */
	private async getParameterValue(property: any, stackSize: number): Promise<any> {
		if (stackSize > 255 || stackSize < 0) {
			throw new Error('Stack is too deep or has a negative value in getParameterValue func.')
		}

		if (property.value.subtype === 'array') {
			const properties = await this.post$('Runtime.getProperties', {
				objectId: property.value.objectId,
				ownProperties: true
			})
			const filteredProperties = properties.result.filter((propertyItem: any) => propertyItem.name !== 'length')
			const result = await Promise.all(filteredProperties.map((propertyItem: any) => this.getParameterValue(propertyItem, stackSize + 1)))
			return result
		}

		if (property?.value?.objectId) {
			const result: any = {}
			const properties = await this.post$('Runtime.getProperties', {
				objectId: property.value.objectId,
				ownProperties: true
			})

			// eslint-disable-next-line no-restricted-syntax
			for await (const propertyItem of properties.result) {
				if (propertyItem.isOwn) {
					result[propertyItem.name] = await this.getParameterValue(propertyItem, stackSize + 1)
				}
			}
			return result
		}
		if (property.value.value) {
			return property.value.value
		}

		return null
	}

	public async locate(fn: (...args: any) => any, opts?: ILocateOptions): Promise<ILocation> {
		if (typeof fn !== 'function') {
			throw new Error('You are allowed only to reference functions.')
		}

		// Look from the function inside the cache array and return it if it does exist.
		const fromCache = await this.cache.get(fn)

		if (fromCache) {
			return fromCache.location.promise
		}

		const deferred = new Deferred<ILocation>()

		// Push a deferred location into the cache
		this.cache.add({ ref: fn, location: deferred })

		// Create a function location object to put references into it
		// So that we can easily access to them
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		if (typeof global[PREFIX] === 'undefined') {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			global[PREFIX] = {}
		}

		// Create a reference of the function inside the global object
		const uuid = v4()
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		global[PREFIX][uuid] = fn

		// Create an inspector session an enable the debugger inside it
		if (!this.session) {
			this.session = new Session()
			this.post$ = promisify(this.session.post).bind(this.session)
			this.session.connect()
			this.session.on('Debugger.scriptParsed', (res) => {
				this.scripts[res.params.scriptId] = res.params
			})
			await this.post$('Debugger.enable')
		}

		// Evaluate the expression
		const evaluated = await this.post$('Runtime.evaluate', {
			expression: `global['${PREFIX}']['${uuid}']`,
			objectGroup: PREFIX
		})

		// Get the function properties
		const properties = await this.post$('Runtime.getProperties', {
			objectId: evaluated.result.objectId
		})
		// Get the function scopes
		const scopes = properties.internalProperties.find((prop: any) => prop.name === '[[Scopes]]')
		const functions = properties.internalProperties.find((prop: any) => prop.name === '[[FunctionLocation]]')
		const script = this.scripts[functions.value.value.scriptId]
		let importPath = decodeURIComponent(script.url.replace('file:///', ''))

		if (!path.isAbsolute(importPath)) {
			const { root } = path.parse(process.cwd())
			importPath = path.join(root, importPath)
		}

		// Get middleware attribute values
		const propertyValues: {
			name: string
			value: Promise<any>
		}[] = []
		if (opts?.closure) {
			const properties2 = await this.post$('Runtime.getProperties', {
				objectId: scopes.value.objectId
			})

			const closure = `Closure (${opts.closure})`
			const properties2Object = properties2.result.find((el: any) => el.value.description === closure)

			if (!properties2Object) {
				throw Error(`Middleware not found for closure: ${closure}`)
			}

			const properties3 = await this.post$('Runtime.getProperties', {
				objectId: properties2Object.value.objectId,
				ownProperties: true
			})

			opts.middlewareArguments?.forEach((middlewareArgument) => {
				const properties3Object = properties3.result.find((el: any) => el.name === middlewareArgument)
				if (properties3Object) {
					const value = this.getParameterValue(properties3Object, 0)
					propertyValues.push({ name: middlewareArgument, value })
				}
			})
		}

		const resultProperties = await Promise.all(
			propertyValues.map(async (property) => ({
				argumentName: property.name,
				value: await property.value
			}))
		)

		return {
			resultProperties,
			post: this.post$,
			path: importPath
		}
	}
}
