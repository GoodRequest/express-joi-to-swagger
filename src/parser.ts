import { Express, IRoute, IRouter } from 'express'
import { compact, filter, forEach, get, has, includes, isInteger, isNaN, join, map, reduce, set, startsWith, trimStart, uniq } from 'lodash'
import Joi, { Schema } from 'joi'
// @ts-ignore
import Values from 'joi/lib/values'
import { locate } from './func-loc'
// eslint-disable-next-line import/no-cycle
import { ISwaggerInit } from './baseSwagger'
// eslint-disable-next-line import/no-cycle
import { AUTH_SCOPE } from './utils/authSchemes'

const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
const expressRootRegexp = '/^\\/?(?=\\/|$)/i'
const regexpExpressParam = /\(\?:\(\[\^\\\/]\+\?\)\)/g
const stackItemValidNames = ['router', 'bound dispatch', 'mounted_app']

export interface IConfig {
	outputPath: string
	generateUI: boolean
	permissions?: {
		middlewareName: string
		closure: string
		paramName: string
	}
	requestSchemaName?: string
	requestSchemaParams?: any[]
	responseSchemaName?: string
	responseSchemaParams?: any[]
	businessLogicName: string
	swaggerInitInfo?: ISwaggerInit
	tags?: {
		baseUrlSegmentsLength?: number
		joinTags?: boolean
		tagSeparator?: string
		versioning?: boolean
		versionSeparator?: string
	}
	filter?: string
}

/*
 * @deprecated
 */
export const getJoiSchema = async (schemaProperties: any, sessionPostFunction: (param: string, options: any) => any) => {
	const removeProperties = (propertyItems: any[]) => filter(propertyItems, (propertyItem) => !includes(['__proto__', 'prototype', 'override'], propertyItem.name))
	const resultSchema = <Schema>{}

	const processSchemaProperties = (propertyItems: any[], path: string[]) =>
		reduce(
			propertyItems,
			async (promise: Promise<any>, propertyItem): Promise<any> =>
				promise.then(async () => {
					try {
						const propertyItemName = propertyItem.name

						if (propertyItem.value.objectId) {
							const propertiesItems = await sessionPostFunction('Runtime.getProperties', {
								objectId: propertyItem.value.objectId,
								ownProperties: true,
								generatePreview: true
							})

							if (propertyItem.value.className === 'Set') {
								set(resultSchema, `${join([...path, propertyItemName], '.')}`, new Set())
							}

							const filteredPropertiesItems = removeProperties([
								...propertiesItems.result,
								...(propertyItem.value.className === 'Set' ? propertiesItems.internalProperties : [])
							])

							if (filteredPropertiesItems.length) {
								await processSchemaProperties(filteredPropertiesItems, [...path, propertyItemName])
							} else {
								set(resultSchema, `${join([...path, propertyItemName], '.')}`, {})
							}
						} else {
							const prevPathKey1 = path[path.length - 1]
							const prevPathKey2 = path[path.length - 2]
							const prevPathKey3 = path[path.length - 3]

							// path = _values -> [[Entries]] -> key -> value
							if (propertyItemName === 'value' && isInteger(parseInt(prevPathKey1, 10)) && prevPathKey2 === '[[Entries]]' && prevPathKey3 === '_values') {
								const prevPath = path.slice(0, path.length - 2)
								const entitiesSet = get(resultSchema, join(prevPath, '.'))
								entitiesSet.add(propertyItem.value.value)
							} else if (propertyItemName === 'length' && prevPathKey1 === '[[Entries]]' && prevPathKey2 === '_values') {
								const prevPath = path.slice(0, path.length - 2)
								const item = get(resultSchema, join(prevPath, '.'))
								Object.setPrototypeOf(item, Object.getPrototypeOf(new Values()))
							} else {
								set(resultSchema, `${join([...path, propertyItemName], '.')}`, propertyItem.value.value)
								// path = keys -> key -> schema -> type
								// if (propertyItemName === 'type' && prevPathKey1 === 'schema' && isInteger(parseInt(prevPathKey2, 10)) && prevPathKey3 === 'keys') {
								if (propertyItemName === 'type') {
									const type = propertyItem.value.value
									const item = path.length > 0 ? get(resultSchema, join(path, '.')) : resultSchema

									if (type === 'string') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.string()))
									} else if (type === 'number') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.number()))
									} else if (type === 'object') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.object()))
									} else if (type === 'array') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.array()))
									} else if (type === 'boolean') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.boolean()))
									} else if (type === 'date') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.date()))
									} else if (type === 'value') {
										// TODO: figure out value Prototype from Joi
									} else if (type === 'any') {
										Object.setPrototypeOf(item, Object.getPrototypeOf(Joi.any()))
									}

									set(resultSchema, `${join([...path, '_valids'], '.')}`, null)
								}
							}
						}
						return true
					} catch (err) {
						return Promise.reject(err)
					}
				}),
			Promise.resolve()
		)

	await processSchemaProperties(removeProperties(schemaProperties), [])

	return resultSchema
}

/**
 * Returns all the verbs detected for the passed route
 */
export const getRouteMethods = (route: any) => {
	const methods: any[] = []

	map(Object.keys(route.methods), (method) => {
		if (method !== '_all') {
			methods.push(method)
		}
	})

	return methods
}

/**
 * Ensures the path of the new endpoints isn't yet in the array.
 * If the path is already in the array merges the endpoints with the existing
 * one, if not, it adds them to the array.
 *
 * @param {Array} endpoints Array of current endpoints
 * @param {Object[]} newEndpoints New endpoints to be added to the array
 * @returns {Array} Updated endpoints array
 */

export const addEndpoints = (endpoints: any[], newEndpoints: any[]) => {
	newEndpoints.forEach((newEndpoint: any) => {
		const foundEndpointIdx = endpoints.findIndex((item: any) => item.path === newEndpoint.path)
		if (foundEndpointIdx > -1) {
			const foundEndpoint = endpoints[foundEndpointIdx]
			const newMethods = newEndpoint.methods.filter((method: any) => foundEndpoint.methods.indexOf(method) === -1)
			foundEndpoint.methods = foundEndpoint.methods.concat(newMethods)
		} else {
			endpoints.push(newEndpoint)
		}
	})
	return endpoints
}

/**
 * Returns the names (or anonymous) of all the middleware attached to the
 * passed route
 */
export const getRouteMiddleware = (route: any) => route.stack.map((item: any) => item.handle.name || 'anonymous')

/**
 * Returns true if found regexp related with express params
 */
export const hasParams = (pathRegexp: any) => regexpExpressParam.test(pathRegexp)

/**
 * @param {string} text The basePath the route is on
 * @return {boolean} Returns true if text contains ':' false otherwise
 */
export const isPathParam = (text: string) => text.indexOf(':') > -1

/**
 * @param {string[]} basePath Array of base path segments
 * @param {string[]} path Array of path segments
 * @param {IConfig} config
 * @return {boolean} Returns true if text contains ':' false otherwise
 */
export const parseTags = (basePath: string[], path: string[], config: IConfig) => {
	if (basePath.length !== config.tags?.baseUrlSegmentsLength && config.tags?.baseUrlSegmentsLength) {
		if (config.tags?.baseUrlSegmentsLength > basePath.length) {
			path.unshift(...basePath)
		} else {
			path.unshift(...basePath.slice(config.tags?.baseUrlSegmentsLength))
		}
	}
	let tags: string[]
	const paramIndex = path.findIndex(isPathParam)

	if (paramIndex > 0) {
		tags = path.slice(0, paramIndex)
	} else if (paramIndex === 0 || path.length === 1) {
		tags = config.tags?.baseUrlSegmentsLength ? ['default'] : [basePath.pop()]
	} else {
		tags = path.slice(0, path.length)
	}

	if (config.tags?.versioning && config.tags?.versionSeparator) {
		tags.push(basePath.pop(), ...tags)
	}

	tags = compact(uniq(map(tags, (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1))))
	let result: string[] = config.tags?.joinTags ? [tags.join(config.tags?.tagSeparator)] : tags

	if (config.tags?.versioning) {
		const [version, ...restTags] = tags
		result = [[version, restTags.join(config.tags?.tagSeparator)].join(config.tags?.versionSeparator)]
	}

	return result
}

/**
 * @param {Object} route Express route object to be parsed
 * @param {string} basePath The basePath the route is on
 * @param {Object} config parser config
 * @return {Object[]} Endpoints info
 */

export const parseExpressRoute = async (route: IRoute, basePath: string, config: IConfig) => {
	const endpoints = [] as any[]
	let security: any = []

	const pathArray = Array.isArray(route.path) ? route.path : [route.path]

	const filterRegex = config.filter ? new RegExp(config.filter) : null

	if (filterRegex && !filterRegex.test(`${basePath}/${route.path}`)) {
		return []
	}
	const pathArrayPromises = map(pathArray, async (path) => {
		const methodsPromises = getRouteMethods(route).map(async (method) => {
			let permissionHandlerPromise: any
			let workflowHandlerPromise: any

			forEach(route.stack, (handle) => {
				if (config.permissions && handle.name === config.permissions.middlewareName) {
					permissionHandlerPromise = locate(handle.handle, {
						closure: config.permissions.closure === 'default' ? 'exports.default' : config.permissions.closure,
						paramName: config.permissions.paramName
					})
				}
				if (handle.name === config.businessLogicName) {
					workflowHandlerPromise = locate(handle.handle)
				}
				if (config.swaggerInitInfo.security?.scope === AUTH_SCOPE.ENDPOINT && config.swaggerInitInfo.security?.authMiddlewareName === handle.name) {
					security = map(config.swaggerInitInfo?.security?.methods, (methodName) => ({ [methodName.name]: [] }))
				}
			})
			const permissions = [] as string[]
			let requestJoiSchema
			const [permissionResult, workflowResult] = await Promise.all([permissionHandlerPromise, workflowHandlerPromise])
			if (permissionResult) {
				permissionResult.resultProperties.result.forEach((value: any) => {
					if (!isNaN(parseInt(value.name, 10))) {
						const permission = value.value
						permissions.push(permission.value)
					}
				})
			}

			const responses = []
			if (workflowResult) {
				const workflow = await import(workflowResult.path)
				if (has(workflow, config.requestSchemaName)) {
					requestJoiSchema = get(workflow, config.requestSchemaName)
					if (typeof requestJoiSchema === 'function') {
						const params = config.requestSchemaParams || []
						requestJoiSchema = requestJoiSchema(...params)
					}
				}
				if (has(workflow, config.responseSchemaName)) {
					let outputJoiSchema = get(workflow, config.responseSchemaName)
					if (typeof outputJoiSchema === 'function') {
						const params = config.responseSchemaParams || []
						outputJoiSchema = outputJoiSchema(...params)
					}
					responses.push({
						outputJoiSchema,
						code: 200
					})
				}
			}
			return {
				method,
				permissions,
				security,
				requestJoiSchema,
				responses,
				middlewares: getRouteMiddleware(route)
			}
		})
		const methods = await Promise.all(methodsPromises)

		const pathSegments = (basePath && path === '/' ? '' : path).replace(/\/$/, '').replace(/^\//, '').split('/')
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

		const tags = parseTags(basePathSegments, pathSegments, config)

		const endpoint = {
			path: resultPath,
			tags,
			methods
		}
		endpoints.push(endpoint)
	})
	await Promise.all(pathArrayPromises)
	return endpoints
}

export const parseExpressPath = (expressPathRegexp: string, params: any) => {
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

	return parsedPath[1].replace(/\\\//g, '/')
}

export const parseEndpoints = async (app: Express, config: IConfig, basePath?: string, endpoints?: any[]) => {
	// eslint-disable-next-line no-underscore-dangle
	const stack = app.stack || ((app._router && app._router.stack) as IRouter['stack'][])

	endpoints = endpoints || []
	basePath = basePath || ''

	if (!stack) {
		addEndpoints(endpoints, [
			{
				path: basePath,
				methods: []
			}
		])
	} else {
		const stackPromises = map(stack, async (stackItem) => {
			if (stackItem.route) {
				const newEndpoints = await parseExpressRoute(stackItem.route, basePath, config)
				endpoints = addEndpoints(endpoints, newEndpoints)
			} else if (stackItemValidNames.indexOf(stackItem.name) > -1) {
				if (regexpExpressRegexp.test(stackItem.regexp)) {
					const parsedPath = parseExpressPath(stackItem.regexp, stackItem.keys)

					await parseEndpoints(stackItem.handle, config, `${basePath}/${parsedPath}`, endpoints)
				} else if (!stackItem.path && stackItem.regexp && stackItem.regexp.toString() !== expressRootRegexp) {
					const regEcpPath = ` RegExp(${stackItem.regexp}) `

					await parseEndpoints(stackItem.handle, config, `${basePath}/${regEcpPath}`, endpoints)
				} else {
					await parseEndpoints(stackItem.handle, config, basePath, endpoints)
				}
			}
		})

		await Promise.all(stackPromises)
	}
	return endpoints
}

export default parseEndpoints
