import joiToSwagger, { ComponentsSchema, SwaggerSchema } from 'joi-to-swagger'
import Joi from 'joi'
import { includes, map, camelCase, merge, forEach, isEqual } from 'lodash'

import getSecuritySchemes, { ISecuritySchemes } from './utils/authSchemes'
import { AUTH_SCOPE } from './utils/enums'
import {
	HttpCode,
	HttpMethod,
	IEndpoint,
	IEndpointMiddleware,
	IExternalDocs,
	IGenerateSwaggerConfig,
	ISwaggerMiddlewareConfig,
	IInfo,
	ISecurity,
	IServer,
	ITag
} from './types/interfaces'

interface IRequestParameter {
	name: string
	in: 'header' | 'query' | 'path'
	schema: SwaggerSchema
	required: boolean
	description: string | undefined
}

interface IRequestBody {
	content: {
		'application/json': {
			schema: SwaggerSchema
		}
	}
}

interface IResponse {
	description: string
	content: {
		'application/json': {
			schema: SwaggerSchema
		}
	}
}

interface IRequest {
	operationId: string
	description: string
	summary: string | undefined
	deprecated: boolean
	tags: string[]
	security: ISecurity[]
	parameters: IRequestParameter[]
	requestBody?: IRequestBody
	responses: {
		[code in HttpCode]?: IResponse
	}
}
interface IErrorRequest {
	description: string
	error: Error
}

interface IPaths {
	[key: string]: {
		[method in HttpMethod]?: IRequest | IErrorRequest
	}
}

export interface IErrorPaths {
	[key: string]: {
		[method in HttpMethod]?: IErrorRequest['error']
	}
}

interface IComponents {
	securitySchemes: ISecuritySchemes
	schemas?: SwaggerSchema
	requestBodies?: string
}

export interface ISwaggerSchema {
	openapi: string
	servers: IServer[]
	info: Required<IInfo>
	tags?: ITag[]
	paths: IPaths
	externalDocs: IExternalDocs
	components: IComponents
	security: ISecurity[]
}

const formatResponseDescription = (code: HttpCode, description?: string) => {
	if (description) {
		return description
	}

	if (code >= 400) {
		return 'Error response'
	}

	if (code >= 300) {
		return 'Redirect response'
	}

	return 'Success response'
}

export const createResponseSwaggerSchema = (responseSchema: SwaggerSchema, code: HttpCode, description?: string) => ({
	[code]: {
		description: formatResponseDescription(code, description),
		content:
			// do not include response schema for 3xx codes (redirects)
			code < 300 || code >= 400
				? {
						'application/json': {
							schema: responseSchema
						}
				  }
				: undefined
	}
})

const createRequestBodySwaggerSchema = (requestBodyDataSchema: SwaggerSchema) => ({
	content: {
		'application/json': {
			schema: requestBodyDataSchema
		}
	}
})

const getMiddlewareDescription = (endpointMiddleware: IEndpointMiddleware | undefined, configMiddleware: ISwaggerMiddlewareConfig) => {
	let value = 'false'
	const middlewareName = configMiddleware.middlewareName.charAt(0).toUpperCase() + configMiddleware.middlewareName.slice(1).toLowerCase()
	if (!endpointMiddleware) {
		return `${middlewareName}: ${value}`
	}

	if (endpointMiddleware.middlewareArguments.length > 0) {
		value = ''
		endpointMiddleware.middlewareArguments.forEach((middlewareArgument) => {
			value += `<li>${middlewareArgument.argumentName}: ${JSON.stringify(middlewareArgument.value, null, 2)}</li>`
		})
	} else {
		value = 'true'
	}

	return `${middlewareName}: ${value === 'true' ? value : `<ul>${value}</ul>`}`
}

const checkUniqueSharedSchema = (existingComponents: ComponentsSchema, newComponents: ComponentsSchema) => {
	forEach(newComponents, (schemas, schemaType) => {
		if (existingComponents[schemaType]) {
			forEach(schemas, (schema, schemaName) => {
				const existingComponentSchema = existingComponents[schemaType]?.[schemaName]

				if (existingComponentSchema && !isEqual(schema, existingComponentSchema)) {
					throw new Error(`Duplicate name for shared schema ${schemaName}`)
				}
			})
		}
	})
}

function generateEndpointSwaggerSchema(endpoint: IEndpoint, sharedComponents: ComponentsSchema, config: IGenerateSwaggerConfig) {
	const { path, tags, methods } = endpoint
	const endpointSwaggerSchema = methods
		.map((methodData) => {
			try {
				const { method, responses, security, middlewares } = methodData
				// handle responses
				const responsesSwaggerSchema = responses
					.map((response) => {
						const { responseJoiSchema, code } = response
						const { swagger: responseJoiSchemaSwagger, components } = joiToSwagger(responseJoiSchema)

						if (components) {
							checkUniqueSharedSchema(sharedComponents, components)
							merge(sharedComponents, components)
						}

						return createResponseSwaggerSchema(responseJoiSchemaSwagger, code)
					})
					.reduce(
						(prev, responseSwaggerSchema) => ({
							...prev,
							...responseSwaggerSchema
						}),
						{}
					)

				// handle request

				// if request does not contain joi schema, define empty one (since it is needed)
				const requestJoiSchema =
					methodData.requestJoiSchema ||
					Joi.object({
						body: Joi.object(),
						query: Joi.object(),
						params: Joi.object(),
						headers: Joi.object()
					})

				const { swagger: requestJoiSchemaSwagger, components } = joiToSwagger(requestJoiSchema)

				if (components) {
					checkUniqueSharedSchema(sharedComponents, components)
					merge(sharedComponents, components)
				}

				const requestHeaderParametersSwaggerSchema = map(requestJoiSchemaSwagger.properties.headers?.properties, (schema, name) => ({
					name,
					in: 'header' as const,
					schema,
					required: includes(requestJoiSchemaSwagger.properties.headers.required, name),
					description: (schema.description as string) || undefined
				}))

				const requestQueryParametersSwaggerSchema = map(requestJoiSchemaSwagger.properties.query?.properties, (schema, name) => ({
					name,
					in: 'query' as const,
					schema,
					required: includes(requestJoiSchemaSwagger.properties.query.required, name),
					description: (schema.description as string) || undefined
				}))

				const requestPathParametersSwaggerSchema = map(requestJoiSchemaSwagger.properties.params?.properties, (schema, name) => ({
					name,
					in: 'path' as const,
					schema,
					required: true,
					description: (schema.description as string) || undefined
				}))

				// handle description
				let description: string = requestJoiSchemaSwagger.description || ''

				const hasDeprecatedFlag = description.startsWith('@deprecated')
				if (hasDeprecatedFlag) {
					description = description.replace('@deprecated', '').trim()
				}

				let middlewaresDescription = ''
				config.middlewares?.forEach((configMiddleware) => {
					const endpointMiddleware = middlewares.find((middleware) => middleware.name === configMiddleware.middlewareName)
					if (endpointMiddleware && configMiddleware.extractor && typeof configMiddleware.extractor === 'function') {
						middlewaresDescription += `<p>${configMiddleware.extractor(endpointMiddleware, configMiddleware)}</p>`
					} else {
						middlewaresDescription += `<p>${getMiddlewareDescription(endpointMiddleware, configMiddleware)}</p>`
					}
				})

				const resultDescription = [description, middlewaresDescription].filter((v) => !!v).join('<br>')

				const operationId = camelCase(`${method}${path}`)

				// TODO: implement summary in the future
				const summary: string | undefined = undefined

				const endpointMethodSwaggerSchema: IRequest = {
					operationId,
					description: resultDescription,
					summary,
					deprecated: hasDeprecatedFlag,
					tags,
					security,
					parameters: [...requestHeaderParametersSwaggerSchema, ...requestQueryParametersSwaggerSchema, ...requestPathParametersSwaggerSchema],
					responses: responsesSwaggerSchema
				}

				// handle request body
				if (method !== 'get') {
					const requestBodyDataJoiSchemaSwagger = requestJoiSchemaSwagger.properties.body

					endpointMethodSwaggerSchema.requestBody = createRequestBodySwaggerSchema(requestBodyDataJoiSchemaSwagger)
				}

				return {
					[method]: endpointMethodSwaggerSchema
				}
			} catch (err) {
				return {
					[methodData.method]: {
						error: err,
						description: `***\n${err.message}\n***`
					}
				}
			}
		})
		.reduce(
			(prev, currentValue) => ({
				...prev,
				...currentValue
			}),
			{}
		)

	return endpointSwaggerSchema as { [key in HttpMethod]: IRequest | IErrorRequest }
}

/**
 * Generates swagger schema for API documentation
 * @param {IEndpoint[]} endpoints is an array of endpoints used in a project
 * @param {IGenerateSwaggerConfig} config swagger configuration
 * @return {{ swaggerSchema: ISwaggerSchema; swaggerSchemaErrors: IErrorPaths }}
 * 	- swaggerSchema - contains all generated swagger schemas
 * 	- swaggerSchemaErrors - contains all errors occurred during API schemas generation (same structure as swaggerSchema)
 * */
export const generateSwaggerSchema = (endpoints: IEndpoint[], config: IGenerateSwaggerConfig) => {
	const start = new Date().valueOf()
	// eslint-disable-next-line no-console
	console.log('Swagger builder started')

	const swaggerInitInfoConfig = config.swaggerInitInfo || {}

	const endpointsSwaggerSchema: IPaths = {}
	const sharedComponents: ComponentsSchema = {}
	let swaggerSchemaErrors: IErrorPaths | undefined

	forEach(endpoints, (endpoint) => {
		const endpointSwaggerSchema = generateEndpointSwaggerSchema(endpoint, sharedComponents, config)

		forEach(endpointSwaggerSchema, (endpointSwaggerSchemaItem, method: HttpMethod) => {
			if ('error' in endpointSwaggerSchemaItem) {
				swaggerSchemaErrors = {
					...(swaggerSchemaErrors || {}),
					[endpoint.path]: {
						...(swaggerSchemaErrors?.[endpoint.path] || {}),
						[method]: endpointSwaggerSchemaItem
					}
				}
			} else {
				endpointsSwaggerSchema[endpoint.path] = {
					...(endpointsSwaggerSchema[endpoint.path] || {}),
					[method]: endpointSwaggerSchemaItem
				}
			}
		})
	})

	const swaggerSchema: ISwaggerSchema = {
		openapi: '3.1.0',
		servers: swaggerInitInfoConfig.servers || [
			{
				url: 'http://localhost:8080'
			}
		],
		info: {
			description: swaggerInitInfoConfig.info?.description || 'This is a sample Pet Store',
			version: swaggerInitInfoConfig.info?.version || '1.0.6-SNAPSHOT',
			title: swaggerInitInfoConfig.info?.title || 'Swagger Petstore - OpenAPI 3.0',
			termsOfService: swaggerInitInfoConfig.info?.termsOfService || 'http://swagger.io/terms/',
			contact: swaggerInitInfoConfig.info?.contact || {
				email: 'apiteam@swagger.io'
			},
			license: swaggerInitInfoConfig.info?.license || {
				name: 'Apache 2.0',
				url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
			}
		},
		tags: swaggerInitInfoConfig.tags,
		paths: endpointsSwaggerSchema,
		externalDocs: {
			description: 'Find out more about Swagger',
			url: 'http://swagger.io'
		},
		components: {
			...sharedComponents,
			securitySchemes: getSecuritySchemes(swaggerInitInfoConfig.security?.methods || [])
		},
		security: swaggerInitInfoConfig.security?.scope === AUTH_SCOPE.GLOBAL ? map(swaggerInitInfoConfig.security?.methods, (method) => ({ [method.name]: [] })) : []
	}

	// eslint-disable-next-line no-console
	console.log(`\tSwagger builder finished (duration = ${new Date().valueOf() - start}ms)`)

	return {
		swaggerSchema,
		swaggerSchemaErrors
	}
}
