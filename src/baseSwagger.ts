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

interface IPath {
	[key: string]: {
		[method in HttpMethod]?: IRequest
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
	paths: IPath
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

	if (endpointMiddleware && endpointMiddleware.middlewareArguments && endpointMiddleware.middlewareArguments.length > 0) {
		value = ''
		endpointMiddleware.middlewareArguments.forEach((middlewareArgument, index) => {
			value += `${middlewareArgument.name} - ${JSON.stringify(middlewareArgument.value)}${index === 0 ? '' : ', '}`
		})
	} else if (endpointMiddleware) {
		value = 'true'
	}

	const permissionsResult = `${configMiddleware.middlewareName}: ${value}<br>`
	return permissionsResult
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
						middlewaresDescription += configMiddleware.extractor(endpointMiddleware, configMiddleware)
					} else {
						middlewaresDescription += getMiddlewareDescription(endpointMiddleware, configMiddleware)
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
				// eslint-disable-next-line no-console
				console.log(`ERROR with method:${methodData.method} ${path}`, err)
				return {}
			}
		})
		.reduce(
			(prev, currentValue) => ({
				...prev,
				...currentValue
			}),
			{}
		)

	return endpointSwaggerSchema
}

export const generateSwaggerSchema = (endpoints: IEndpoint[], config: IGenerateSwaggerConfig): ISwaggerSchema => {
	const swaggerInitInfoConfig = config.swaggerInitInfo || {}

	const endpointsSwaggerSchema: IPath = {}
	const sharedComponents: ComponentsSchema = {}

	forEach(endpoints, (endpoint) => {
		endpointsSwaggerSchema[endpoint.path] = generateEndpointSwaggerSchema(endpoint, sharedComponents, config)
	})

	return {
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
}
