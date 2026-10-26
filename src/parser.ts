import { Express } from 'express'
import { compact, forEach, trimStart, uniq } from 'lodash'
import { Schema } from 'joi'

import { locate } from './func-loc'
import { ILocation } from './func-loc/cache-amanger.class'
import { HttpCode, HttpMethod, IEndpoint, IEndpointMiddleware, IGenerateSwaggerConfig, ISecurity } from './types/interfaces'
import { AUTH_SCOPE, httpCodes } from './utils/enums'

// #region types
type RouteHandler = Parameters<typeof locate>[0]

/**
 * Handler registered on the route (e.g. middleware or business logic)
 */
interface IRouteStackItem {
	name: string
	handle: RouteHandler
}

/**
 * Express route (same shape in express 4 router and router v2)
 */
interface IExpressRoute {
	path: string
	methods: { [method: string]: boolean }
	stack: IRouteStackItem[]
}

type LayerPath = string | RegExp

/**
 * Layer of express 4 router
 */
interface IExpress4Layer {
	name: string
	regexp: RegExp
	keys: { name: string }[]
	path?: string
	route?: IExpressRoute
	handle: IExpress4App
}

/**
 * Express 4 app (router is in `_router`), express 4 router or other handler (e.g. mounted app) which is not traversable
 */
interface IExpress4App {
	stack?: IExpress4Layer[]
	_router?: { stack: IExpress4Layer[] }
}

/**
 * Layer of router with `listRoutes` support (pillarjs/router#174)
 */
interface IListRoutesLayer {
	rawPath: LayerPath | LayerPath[]
	route?: IExpressRoute
	handle: { stack?: unknown }
}

/**
 * Router with `listRoutes` support (pillarjs/router#174)
 */
interface IListRoutesRouter {
	stack: IListRoutesLayer[]
	listRoutes: () => { path: LayerPath; methods?: string[]; router?: unknown }[]
}

interface IExpress4PathParsers {
	regexpExpressRegexp: RegExp
	regexpExpressParamRegexp: RegExp
	regexpExpressParamReplace: RegExp
}
// #endregion

// #region common
const getHttpCode = (code?: string | null | undefined) => {
	if (code) {
		const codeInt = +code

		const isKnownCode = httpCodes.includes(codeInt as HttpCode)
		if (isKnownCode) {
			return codeInt as HttpCode
		}
	}

	return null
}

/**
 * Returns all http methods detected for the provided route
 *
 * @param {IExpressRoute} route Express route object from which to extract the methods
 * @returns {HttpMethod[]} Array of extracted http methods
 */
const getRouteMethods = (route: IExpressRoute) => {
	const methods: HttpMethod[] = []

	Object.keys(route?.methods ?? {}).forEach((method) => {
		if (method !== 'get' && method !== 'post' && method !== 'patch' && method !== 'put' && method !== 'delete') {
			throw new Error(`Unsupported method: ${method}`)
		}

		methods.push(method)
	})

	return methods
}

/**
 * Adds new endpoints to the array of current endpoints.
 * If the newEndpoint path is already in the currentEndpoint array, it merges newEndpoint with currentEndpoint. Otherwise it just adds newEndpoint to the array.
 * Merge means that it adds newEndpoint's methods (only ones which do not already exist in currentEndpoint's methods) to the currentEndpoint's methods array.
 *
 * @param {IEndpoint[]} currentEndpoints Array of current endpoints
 * @param {IEndpoint} newEndpoint New endpoint to be added to current endpoints
 */
const addEndpoints = (currentEndpoints: IEndpoint[], newEndpoint: IEndpoint) => {
	const existingEndpoint = currentEndpoints.find((currentEndpoint) => currentEndpoint.path === newEndpoint.path)

	if (existingEndpoint) {
		newEndpoint.methods.forEach((newEndpointMethod) => {
			const existingMethod = existingEndpoint.methods.find((existingEndpointMethod) => existingEndpointMethod.method === newEndpointMethod.method)

			if (!existingMethod) {
				existingEndpoint.methods.push(newEndpointMethod)
			}
		})
	} else {
		currentEndpoints.push(newEndpoint)
	}
}

/**
 * Checks if provided path segment contains a path parameter
 *
 * @param {string} pathSegment Path segment
 * @return {boolean} Returns true if path segment contains ':', false otherwise
 */
const isPathParam = (pathSegment: string) => pathSegment.indexOf(':') > -1

/**
 * Parses tags for provided endpoint path
 *
 * @param {string[]} basePath Array of base path segments
 * @param {string[]} path Array of path segments
 * @param {IGenerateSwaggerConfig['tags']} [tagsConfig={}]
 * @return {string[]} Returns parsed tags
 */
const parseTags = (basePath: string[], path: string[], tagsConfig: IGenerateSwaggerConfig['tags'] = {}) => {
	if (tagsConfig.baseUrlSegmentsLength && basePath.length !== tagsConfig.baseUrlSegmentsLength) {
		if (tagsConfig.baseUrlSegmentsLength > basePath.length) {
			path.unshift(...basePath)
		} else {
			path.unshift(...basePath.slice(tagsConfig.baseUrlSegmentsLength))
		}
	}

	let tags: string[]
	const paramIndex = path.findIndex(isPathParam)

	if (paramIndex > 0) {
		tags = path.slice(0, paramIndex)
	} else if (paramIndex === 0 || path.length === 1) {
		tags = tagsConfig.baseUrlSegmentsLength ? ['default'] : [basePath.pop() || '']
	} else {
		tags = path.slice(0, path.length)
	}

	if (tagsConfig.versioning && tagsConfig.versionSeparator) {
		if (tagsConfig.versionLength) {
			const cutLength = tagsConfig.versionLength < basePath.length ? tagsConfig.versionLength : basePath.length
			const basePathEnd = tagsConfig.baseUrlSegmentsLength ?? 0
			const withoutBasePath = basePath.slice(basePathEnd, basePath.length)
			const tempTags = withoutBasePath.slice(0, cutLength)

			tags = [tempTags.join(tagsConfig.versionSeparator), ...tags]
		} else {
			tags = [basePath.pop() || '', ...tags]
		}
	}

	tags = compact(uniq(tags.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))))

	let result = tagsConfig.joinTags ? [tags.join(tagsConfig.tagSeparator)] : tags

	if (tagsConfig.versioning) {
		const [version] = tags
		result = [version]
	}

	return result
}

/**
 * Parses all endpoints from provided express route.
 * It will extract request/response schemas, security, middlewares with their parameter values and other information from the route.
 *
 * @param {IExpressRoute} route
 * @param {string} basePath
 * @param {IGenerateSwaggerConfig} config
 * @param {string} routePath path of the route
 * @returns {Promise<IEndpoint>}
 */
const parseRouteEndpoint = async (route: IExpressRoute, basePath: string, config: IGenerateSwaggerConfig, routePath: string): Promise<IEndpoint> => {
	const routeMethods = getRouteMethods(route)

	const methods = await Promise.all(
		routeMethods.map(async (method) => {
			// get middlewares and workflow of endpoint
			const middlewaresHandlerPromises: Promise<{ middlewareName: string } & ILocation>[] = []
			let workflowHandlerPromise: Promise<ILocation> | null = null
			let security: ISecurity[] = []

			route.stack.forEach((handler) => {
				forEach(config.middlewares, (middleware) => {
					if (handler.name === middleware.middlewareName) {
						middlewaresHandlerPromises.push(
							// eslint-disable-next-line no-async-promise-executor
							new Promise(async (resolve) => {
								const location = await locate(handler.handle, {
									closure: middleware.closure === 'default' ? 'exports.default' : middleware.closure,
									maxParamDepth: middleware.maxParamDepth
								})

								resolve({
									middlewareName: handler.name,
									...location
								})
							})
						)
					}
				})

				if (handler.name === config.businessLogicName) {
					workflowHandlerPromise = locate(handler.handle)
				}
				if (config.swaggerInitInfo?.security?.scope === AUTH_SCOPE.ENDPOINT && config.swaggerInitInfo.security.authMiddlewareName === handler.name) {
					security = config.swaggerInitInfo.security.methods.map((securityMethod) => ({ [securityMethod.name]: [] }))
				}
			})

			const [workflowHandler, ...middlewareHandlers] = await Promise.all([workflowHandlerPromise as Promise<ILocation> | null, ...middlewaresHandlerPromises])

			// handle middleware attributeValues
			const middlewares: IEndpointMiddleware[] = middlewareHandlers.map((middlewareHandler) => ({
				name: middlewareHandler.middlewareName,
				middlewareArguments: middlewareHandler.resultProperties
			}))

			// handle request and response
			let requestJoiSchema: Schema | null = null
			const responses: { responseJoiSchema: Schema; code: HttpCode }[] = []

			if (workflowHandler) {
				const workflow = await import(workflowHandler.path)

				// Handle request schema
				if (config.requestSchemaName && workflow[config.requestSchemaName]) {
					const auxRequestJoiSchema = workflow[config.requestSchemaName]
					if (typeof auxRequestJoiSchema === 'function') {
						const params = config.requestSchemaParams || []
						requestJoiSchema = auxRequestJoiSchema(...params)
					} else {
						requestJoiSchema = auxRequestJoiSchema
					}
				}

				// Handle response schema
				if (config.responseSchemaName && workflow[config.responseSchemaName]) {
					let responseJoiSchema = workflow[config.responseSchemaName]
					if (typeof responseJoiSchema === 'function') {
						const params = config.responseSchemaParams || []
						responseJoiSchema = responseJoiSchema(...params)
					}

					// eslint-disable-next-line no-underscore-dangle
					const httpCodeFromDesc = responseJoiSchema?._flags?.description

					responses.push({
						responseJoiSchema,
						code: getHttpCode(httpCodeFromDesc) || 200
					})
				}

				// Handle error response schemas
				if (config.errorResponseSchemaName) {
					const errorResponseJoiSchemas: Schema[] | Record<string, Schema> | undefined = workflow[config.errorResponseSchemaName]
					forEach(errorResponseJoiSchemas, (errorResponseJoiSchema: Schema) => {
						// eslint-disable-next-line no-underscore-dangle
						const httpCodeFromDesc = errorResponseJoiSchema?._flags?.description

						responses.push({
							responseJoiSchema: errorResponseJoiSchema,
							// Accessing schema property
							code: getHttpCode(httpCodeFromDesc) || 500
						})
					})
				}
			}

			return {
				method,
				security,
				requestJoiSchema,
				responses,
				middlewares
			}
		})
	)

	const pathSegments = (basePath && routePath === '/' ? '' : routePath).replace(/\/$/, '').replace(/^\//, '').split('/')
	const basePathSegments = basePath.replace(/\/$/, '').replace(/^\//, '').split('/')

	const resultPath = ['/', ...basePathSegments, ...pathSegments]
		.map((tempPath) => {
			if (tempPath.startsWith(':')) {
				const temp = trimStart(tempPath, ':')
				return `{${temp}}`
			}
			return tempPath
		})
		.join('/')
		.replace('//', '/')

	const tags = parseTags(basePathSegments, pathSegments, config.tags)

	return {
		path: resultPath,
		tags,
		methods
	}
}

/**
 * Parses the provided express route and returns an array of endpoints
 *
 * @param {IExpressRoute} route Express route object to be parsed
 * @param {string} basePath The basePath the route is on
 * @param {IGenerateSwaggerConfig} config Parser config
 * @param {string} routePath path of the route
 * @return {Promise<IEndpoint | null>}
 */
const parseExpressRoute = async (route: IExpressRoute, basePath: string, config: IGenerateSwaggerConfig, routePath: string) => {
	const filterRegex = config.filter ? new RegExp(config.filter) : null
	if (filterRegex && !filterRegex.test(`${basePath}/${routePath}`)) {
		return null
	}

	const endpoints = await parseRouteEndpoint(route, basePath, config, routePath)

	return endpoints
}
// #endregion

// #region express 4 router (mount paths are parsed from layer.regexp)
const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/ // before express v4.20.0
const regexpExpressRegexp2 = /^\/\^\\?\/?(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\\?\/?\([^)]+\)\)))\\\/.*/ // after express v4.20.0

const expressRootRegexp = '/^\\/?(?=\\/|$)/i'

const regexpExpressParamRegexp = /\(\?:\(\[\^\\\/]\+\?\)\)/g // before express v4.20.0
const regexpExpressParamRegexp2 = /\(\?:\\?\\?\/?\([^)]+\)\)/g // after express v4.20.0

const regexpExpressParamReplace = /\(\?:\(\[\^\\\/]\+\?\)\)/ // before express v4.20.0
const regexpExpressParamReplace2 = /\(\?:\\?\\?\/?\([^)]+\)\)/ // after express v4.20.0

const stackItemValidNames = ['router', 'bound dispatch', 'mounted_app']

/**
 * Checks if provided path segment contains a param regexp
 *
 * @param {string} pathRegexp Path segment
 * @returns {boolean} Returns true if path regexp is matched by regexpExpressParamRegexp, false otherwise
 */
const hasParams = (pathRegexp: string, parser: RegExp) => parser.test(pathRegexp)

/**
 * Returns parsers matching the format of provided express layer regexp (it differs before and after express v4.20.0)
 *
 * @param {string} pathRegexp Stringified express layer regexp
 * @returns {IExpress4PathParsers | null} Returns null if regexp does not match any known format
 */
const getPathRegexpParsers = (pathRegexp: string): IExpress4PathParsers | null => {
	if (regexpExpressRegexp.test(pathRegexp)) {
		return { regexpExpressRegexp, regexpExpressParamRegexp, regexpExpressParamReplace }
	}
	if (regexpExpressRegexp2.test(pathRegexp)) {
		return { regexpExpressRegexp: regexpExpressRegexp2, regexpExpressParamRegexp: regexpExpressParamRegexp2, regexpExpressParamReplace: regexpExpressParamReplace2 }
	}
	return null
}

/**
 * Parses endpoint path from provided express path regexp
 *
 * @param {string} expressPathRegexp Stringified regexp from express layer
 * @param {{ name: string }[]} params Path params from express layer
 * @param {IExpress4PathParsers} parsers for processing express regexp path
 * @returns {string | undefined}
 */
const parseExpressPath = (expressPathRegexp: string, params: { name: string }[], parsers: IExpress4PathParsers) => {
	let parsedPath = parsers.regexpExpressRegexp.exec(expressPathRegexp)
	let parsedRegexp = expressPathRegexp
	let paramIdx = 0

	while (hasParams(parsedRegexp, parsers.regexpExpressParamRegexp)) {
		const paramId = `:${params[paramIdx].name}`

		parsedRegexp = parsedRegexp.replace(parsers.regexpExpressParamReplace, paramId)

		paramIdx += 1
	}

	if (parsedRegexp !== expressPathRegexp) {
		parsedPath = parsers.regexpExpressRegexp.exec(parsedRegexp)
	}

	return parsedPath?.[1].replace(/\\\//g, '/')
}

/**
 * Returns base path of the router mounted by provided express 4 layer
 *
 * @param {string} basePath Base path of the parent router
 * @param {IExpress4Layer} layer Layer of mounted router
 * @returns {string}
 */
const getExpress4MountPath = (basePath: string, layer: IExpress4Layer) => {
	const layerRegexp = String(layer.regexp)

	const parsers = getPathRegexpParsers(layerRegexp)
	if (parsers) {
		return `${basePath}/${parseExpressPath(layerRegexp, layer.keys, parsers)}`
	}

	if (!layer.path && layer.regexp && layerRegexp !== expressRootRegexp) {
		return `${basePath}/ RegExp(${layerRegexp}) `
	}

	return basePath
}

/**
 * Traverses all the routes defined in the provided express 4 app or router and parses endpoints from them
 *
 * @param {IExpress4App} app Express 4 app or router
 * @param {IGenerateSwaggerConfig} config
 * @param {string} basePath
 * @param {IEndpoint[]} endpoints
 * @returns {Promise<IEndpoint[]>}
 */
const parseExpress4Endpoints = async (app: IExpress4App, config: IGenerateSwaggerConfig, basePath: string, endpoints: IEndpoint[]): Promise<IEndpoint[]> => {
	// eslint-disable-next-line no-underscore-dangle
	const stack = app.stack || app._router?.stack

	if (!stack) {
		addEndpoints(endpoints, { path: basePath, tags: [], methods: [] })
	} else {
		await Promise.all(
			stack.map(async (layer) => {
				if (layer.route) {
					const newEndpoint = await parseExpressRoute(layer.route, basePath, config, layer.route.path)

					if (newEndpoint) {
						addEndpoints(endpoints, newEndpoint)
					}
				} else if (stackItemValidNames.includes(layer.name)) {
					await parseExpress4Endpoints(layer.handle, config, getExpress4MountPath(basePath, layer), endpoints)
				}
			})
		)
	}

	return endpoints
}
// #endregion

// #region router with listRoutes (pillarjs/router#174, mount paths are read from layer.rawPath)
/**
 * Joins base path with the path a router is mounted on (layer `rawPath`)
 *
 * @param {string} basePath
 * @param {LayerPath} mountPath
 * @returns {string}
 */
const joinMountPath = (basePath: string, mountPath: LayerPath) => {
	if (mountPath instanceof RegExp) {
		return `${basePath}/ RegExp(${mountPath}) `
	}

	const parsedPath = mountPath.replace(/\/$/, '').replace(/^\//, '')

	return parsedPath ? `${basePath}/${parsedPath}` : basePath
}

/**
 * Traverses all the routes defined in the provided router with `listRoutes` support and parses endpoints from them
 * Layers do not expose regexp, so mount paths of nested routers are read from `layer.rawPath` (the path the layer was registered with)
 *
 * @param {IListRoutesRouter} router
 * @param {IGenerateSwaggerConfig} config
 * @param {string} basePath
 * @param {IEndpoint[]} endpoints
 * @returns {Promise<IEndpoint[]>}
 */
const parseListRoutesRouterEndpoints = async (router: IListRoutesRouter, config: IGenerateSwaggerConfig, basePath: string, endpoints: IEndpoint[]): Promise<IEndpoint[]> => {
	await Promise.all(
		router.stack.map(async (layer) => {
			const layerPaths = [layer.rawPath].flat()

			const { route } = layer

			if (route) {
				await Promise.all(
					layerPaths.map(async (layerPath) => {
						if (layerPath instanceof RegExp) {
							return
						}

						const newEndpoint = await parseExpressRoute(route, basePath, config, layerPath)

						if (newEndpoint) {
							addEndpoints(endpoints, newEndpoint)
						}
					})
				)
			} else if (Array.isArray(layer.handle.stack)) {
				const mountedRouter = layer.handle as IListRoutesRouter

				await Promise.all(layerPaths.map((layerPath) => parseListRoutesRouterEndpoints(mountedRouter, config, joinMountPath(basePath, layerPath), endpoints)))
			}
		})
	)

	return endpoints
}
// #endregion

// #region router detection
interface IAppLike {
	lazyrouter?: unknown
	_router?: unknown
	router?: unknown
	stack?: unknown
}

/**
 * Checks if provided app is express 4 app (it has `lazyrouter` method) or express 4 router (its layers have `regexp`)
 *
 * @param {IAppLike} app Express app or router
 * @returns {boolean}
 */
const isExpress4 = (app: IAppLike) => {
	if (typeof app.lazyrouter === 'function') {
		return true
	}

	return Array.isArray(app.stack) && app.stack.every((layer: { regexp?: unknown }) => layer.regexp instanceof RegExp)
}

/**
 * Returns root router of provided express app (or the router itself, if router is provided)
 * NOTE: `app.router` must not be accessed in express 4, because its getter throws
 *
 * @param {IAppLike} app Express app or router
 * @returns {unknown}
 */
const getRootRouter = (app: IAppLike) => {
	if (Array.isArray(app.stack)) {
		return app
	}

	if (typeof app.lazyrouter === 'function') {
		// eslint-disable-next-line no-underscore-dangle
		return app._router
	}

	return app.router
}

/**
 * Checks if provided router supports `listRoutes` (pillarjs/router#174)
 *
 * @param {unknown} router
 * @returns {boolean}
 */
const hasListRoutes = (router: unknown): router is IListRoutesRouter => typeof (router as Partial<IListRoutesRouter> | undefined)?.listRoutes === 'function'

/**
 * Traverses all the routes defined in the provided express app and parses endpoints from them
 * - router with `listRoutes` support (pillarjs/router#174) -> mount paths are read from layer.rawPath
 * - express 4 -> mount paths are parsed from layer.regexp
 * - otherwise (e.g. express 5 with router without `listRoutes`) routes can not be parsed
 *
 * @param {Express} app
 * @param {IGenerateSwaggerConfig} config
 * @returns {Promise<IEndpoint[]>}
 */
const parseEndpoints = (app: Express, config: IGenerateSwaggerConfig) => {
	const appLike = app as unknown as IAppLike

	const router = getRootRouter(appLike)
	if (hasListRoutes(router)) {
		return parseListRoutesRouterEndpoints(router, config, '', [])
	}

	if (isExpress4(appLike)) {
		return parseExpress4Endpoints(appLike as IExpress4App, config, '', [])
	}

	throw new Error('Express router does not support listing routes. Use router version which contains pillarjs/router#174 (listRoutes, layer.rawPath)')
}
// #endregion

/**
 * Traverses all the routes defined in the provided express app and parses endpoints from them
 *
 * @param {Express} app
 * @param {IGenerateSwaggerConfig} config
 * @returns {Promise<IEndpoint[]>}
 */
const parseExpressApp = async (app: Express, config: IGenerateSwaggerConfig) => {
	const start = new Date().valueOf()
	// eslint-disable-next-line no-console
	console.log('Parser started')

	const endpoints = await parseEndpoints(app, config)

	// eslint-disable-next-line no-console
	console.log(`\tParser finished (duration = ${new Date().valueOf() - start}ms)`)

	return endpoints
}

export default parseExpressApp
