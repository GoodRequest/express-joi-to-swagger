import { Express, IRoute, IRouter } from 'express'
import { compact, forEach, map, slice, startsWith, trimStart, uniq } from 'lodash'
import { Schema } from 'joi'

import { locate } from './func-loc'
import { ILocation } from './func-loc/cache-amanger.class'
import { HttpCode, HttpMethod, IEndpoint, IEndpointMiddleware, IGenerateSwaggerConfig, ISecurity } from './types/interfaces'
import { AUTH_SCOPE, httpCodes } from './utils/enums'

const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
const expressRootRegexp = '/^\\/?(?=\\/|$)/i'
const regexpExpressParamRegexp = /\(\?:\(\[\^\\\/]\+\?\)\)/g
const stackItemValidNames = ['router', 'bound dispatch', 'mounted_app']

const getHttpCode = (code?: string | null | undefined) => {
	if (code) {
		const codeInt = +code

		const isKnownCode = httpCodes.includes(<any>codeInt)
		if (isKnownCode) {
			return codeInt as HttpCode
		}
	}

	return null
}

/**
 * Returns all http methods detected for the provided route
 *
 * @param {IRoute & { methods: { [method: string]: boolean } }} route Express route object from which to extract the methods
 * @returns {HttpMethod[]} Array of extracted http methods
 */
const getRouteMethods = (route: IRoute & { methods?: { [method: string]: boolean } }) => {
	const methods: HttpMethod[] = []

	map(Object.keys(route?.methods || {}), (method) => {
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
 * Checks if provided path segment contains a param regexp
 *
 * @param {string} pathRegexp Path segment
 * @returns {boolean} Returns true if path regexp is matched by regexpExpressParamRegexp, false otherwise
 */
const hasParams = (pathRegexp: string) => regexpExpressParamRegexp.test(pathRegexp)

/**
 * Checks if provided path segment contains a path parameter
 *
 * @param {string} pathSegment Path segment
 * @return {boolean} Returns true if path segment contains ':', false otherwise
 */
const isPathParam = (pathSegment: string) => pathSegment.indexOf(':') > -1

/**
 * Parses endpoint path from provided express path regexp
 *
 * @param {string} expressPathRegexp Regex patch from express route item
 * @param {{ name: string }[]} params Path params from express route item
 * @returns string
 */
const parseExpressPath = (expressPathRegexp: string, params: { name: string }[]) => {
	let parsedPath = regexpExpressRegexp.exec(expressPathRegexp)
	let parsedRegexp = expressPathRegexp
	let paramIdx = 0

	while (hasParams(parsedRegexp)) {
		const paramId = `:${params[paramIdx].name}`

		parsedRegexp = parsedRegexp.toString().replace(/\(\?:\(\[\^\\\/]\+\?\)\)/, paramId)

		paramIdx += 1
	}

	if (parsedRegexp !== expressPathRegexp) {
		parsedPath = regexpExpressRegexp.exec(parsedRegexp)
	}

	return parsedPath?.[1].replace(/\\\//g, '/')
}

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
			const withoutBasePath = slice(basePath, basePathEnd, basePath.length)
			const tempTags = slice(withoutBasePath, 0, cutLength)

			tags = [tempTags.join(tagsConfig.versionSeparator), ...tags]
		} else {
			tags = [basePath.pop() || '', ...tags]
		}
	}

	tags = compact(uniq(map(tags, (tag) => tag.charAt(0).toUpperCase() + tag.slice(1))))

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
 * @param {IRoute} route
 * @param {string} basePath
 * @param {string} path
 * @param {IGenerateSwaggerConfig} config
 * @returns {Promise<IEndpoint>}
 */
const parseRouteEndpoint = async (route: IRoute, basePath: string, config: IGenerateSwaggerConfig) => {
	const routeMethods = getRouteMethods(route)

	const methods = await Promise.all(
		map(routeMethods, async (method) => {
			// get middlewares and workflow of endpoint
			const middlewaresHandlerPromises: Promise<{ middlewareName: string } & ILocation>[] = []
			let workflowHandlerPromise: Promise<ILocation> | null = null
			let security: ISecurity[] = []

			forEach(route.stack, (handler) => {
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
					security = map(config.swaggerInitInfo.security.methods, (securityMethod) => ({ [securityMethod.name]: [] }))
				}
			})

			const [workflowHandler, ...middlewareHandlers] = await Promise.all([workflowHandlerPromise as Promise<ILocation> | null, ...middlewaresHandlerPromises])

			// handle middleware attributeValues
			const middlewares: IEndpointMiddleware[] = []
			forEach(middlewareHandlers, (middlewareHandler) => {
				middlewares.push({
					name: middlewareHandler.middlewareName,
					middlewareArguments: middlewareHandler.resultProperties
				})
			})

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
					const errorResponseJoiSchemas = workflow[config.errorResponseSchemaName]
					forEach(errorResponseJoiSchemas, (errorResponseJoiSchema) => {
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

	const pathSegments = (basePath && route.path === '/' ? '' : route.path).replace(/\/$/, '').replace(/^\//, '').split('/')
	const basePathSegments = basePath.replace(/\/$/, '').replace(/^\//, '').split('/')

	const resultPath = ['/', ...basePathSegments, ...pathSegments]
		.map((tempPath) => {
			if (startsWith(tempPath, ':')) {
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
 * @param {Object} route Express route object to be parsed
 * @param {string} basePath The basePath the route is on
 * @param {Object} config Parser config
 * @return {IEndpoint}
 */
const parseExpressRoute = async (route: IRoute, basePath: string, config: IGenerateSwaggerConfig) => {
	const filterRegex = config.filter ? new RegExp(config.filter) : null
	if (filterRegex && !filterRegex.test(`${basePath}/${route.path}`)) {
		return null
	}

	const endpoints = await parseRouteEndpoint(route, basePath, config)

	return endpoints
}

/**
 * Traverses all the routes defined in the provided express app and parses endpoints from them
 *
 * @param {Express} app
 * @param {IGenerateSwaggerConfig} config
 * @param {string} [basePath='']
 * @param {IEndpoint[]} [endpoints=[]]
 * @returns {Promise<IEndpoint[]>}
 */
const parseEndpoints = async (app: Express, config: IGenerateSwaggerConfig, basePath = '', endpoints: IEndpoint[] = []) => {
	// eslint-disable-next-line no-underscore-dangle
	const stack = app.stack || ((app._router && app._router.stack) as IRouter['stack'][])

	if (!stack) {
		addEndpoints(endpoints, { path: basePath, tags: [], methods: [] })
	} else {
		await Promise.all(
			map(stack, async (stackItem) => {
				if (stackItem.route) {
					const newEndpoint = await parseExpressRoute(stackItem.route, basePath, config)

					if (newEndpoint) {
						addEndpoints(endpoints, newEndpoint)
					}
				} else if (stackItemValidNames.indexOf(stackItem.name) > -1) {
					let resultBasePath = basePath
					if (regexpExpressRegexp.test(stackItem.regexp)) {
						const parsedPath = parseExpressPath(stackItem.regexp, stackItem.keys)

						resultBasePath = `${basePath}/${parsedPath}`
					} else if (!stackItem.path && stackItem.regexp && stackItem.regexp.toString() !== expressRootRegexp) {
						const regEcpPath = ` RegExp(${stackItem.regexp}) `

						resultBasePath = `${basePath}/${regEcpPath}`
					}

					await parseEndpoints(stackItem.handle, config, resultBasePath, endpoints)
				}
			})
		)
	}

	return endpoints
}

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
