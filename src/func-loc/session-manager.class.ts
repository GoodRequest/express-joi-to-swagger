import { Debugger, Session } from 'inspector'
import path from 'path'
import { promisify } from 'util'
import { v4 } from 'uuid'

import { CacheManager, ILocation } from './cache-amanger.class'
import { Deferred } from './deffered.class'

const PREFIX = '__functionLocation__'

export interface ILocateOptions {
	closure: string
	paramName?: string
	parser?: (param: any, scopes: any) => Promise<any>
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
		// @ts-ignore
		delete global[PREFIX]
		this.session = undefined
		this.cache.clear()

		return true
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

		// Push a deffered location into the cache
		this.cache.add({ ref: fn, location: deferred })

		// Create a function location object to put referencies into it
		// So that we can easilly access to them
		// @ts-ignore
		if (typeof global[PREFIX] === 'undefined') {
			// @ts-ignore
			global[PREFIX] = {}
		}

		// Create a reference of the function inside the global object
		const uuid = v4()
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

		let resultProperties = { result: [] as any }
		if (opts?.closure) {
			if (opts?.parser && typeof opts.parser === 'function') {
				resultProperties = await opts.parser(this, scopes)
			} else {
				const properties2 = await this.post$('Runtime.getProperties', {
					objectId: scopes.value.objectId
				})

				const closure = `Closure (${opts.closure})`
				const properties2Object = properties2.result.find((el: any) => el.value.description === closure)

				if (!properties2Object) {
					throw Error(`Middleware not found for closure: ${closure}`)
				}

				const properties3 = await this.post$('Runtime.getProperties', {
					objectId: properties2Object.value.objectId
				})

				const properties3Object = properties3.result.find((el: any) => el.name === opts.paramName)

				if (!properties3Object) {
					throw Error(`Middleware params ${opts.paramName} not found`)
				}
				if (properties3Object.value.objectId) {
					resultProperties = await this.post$('Runtime.getProperties', {
						objectId: properties3Object.value.objectId,
						ownProperties: true
					})
				}
			}
		}
		return {
			resultProperties,
			post: this.post$,
			path: importPath
		}
	}
}
