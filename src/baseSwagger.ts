import joiToSwagger, { ComponentsSchema, SwaggerSchema } from 'joi-to-swagger'
import Joi from 'joi'
import { includes, map, camelCase, merge, forEach, isEqual } from 'lodash'

import getSecuritySchemes, { ISecuritySchemes } from './utils/authSchemes'
import { AUTH_SCOPE } from './utils/enums'
import { HttpCode, HttpMethod, IEndpoint, IExternalDocs, IGenerateSwaggerConfig, IInfo, ISecurity, IServer, ITag } from './types/interfaces'

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
export interface IErrorRequest {
	description: string
	error: Error
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

const getPermissionDescription = (permissions: { [groupName: string]: string[] }) => {
	const permissionsResult = 'Permissions:'

	const permissionGroupNames = Object.keys(permissions)
	const hasDefaultGroup = includes(permissionGroupNames, 'default')

	if (permissionGroupNames.length === 0) {
		return `${permissionsResult} NO`
	}

	if (hasDefaultGroup && Object.keys(permissions).length === 1) {
		return `${permissionsResult} [${permissions.default.join(', ')}]`
	}

	return `${permissionsResult}<ul>${map(
		permissions,
		(permissionGroup, permissionGroupName) => `<li>${permissionGroupName}${permissionGroup.length > 0 ? `: [${permissionGroup.join(', ')}]` : ''}</li>`
	).join('')}</ul>`
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

function generateEndpointSwaggerSchema(endpoint: IEndpoint, sharedComponents: ComponentsSchema, config: IGenerateSwaggerConfig): { [key: string]: IRequest | IErrorRequest } {
	const { path, tags, methods } = endpoint
	const endpointSwaggerSchema = methods
		.map((methodData, index) => {
			try {
				const { method, responses, permissions, security } = methodData
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

				let permissionDescription = ''
				if (config.permissions) {
					if (config.permissionsDescriptionFormatter && typeof config.permissionsDescriptionFormatter === 'function') {
						permissionDescription = config.permissionsDescriptionFormatter(permissions)
					} else {
						permissionDescription = getPermissionDescription(permissions)
					}
				}

				const resultDescription = [description, permissionDescription].filter((v) => !!v).join('<br>')

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
					[endpoint.methods[index].method]: {
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

	return endpointSwaggerSchema
}

/**
 * Generates swagger schema for API documentation
 * @param endpoints is an array of endpoints used in a project
 * @param config swagger configuration
 * @return { swaggerSchema, swaggerSchemaErrors } object which contains an attr. 'swaggerSchema' with all generated swagger schemas
 * and an attr. 'swaggerSchemaErrors' with the same structure, which contains all errors occurred during API schemas generation
 * */
export const generateSwaggerSchema = (
	endpoints: IEndpoint[],
	config: IGenerateSwaggerConfig
): { swaggerSchema: ISwaggerSchema; swaggerSchemaErrors: { [path: string]: { [method: string]: Error } } } => {
	const swaggerInitInfoConfig = config.swaggerInitInfo || {}

	const endpointsSwaggerSchema: IPath = {}
	const sharedComponents: ComponentsSchema = {}
	let swaggerSchemaErrors: null | NonNullable<any> = null
	forEach(endpoints, (endpoint) => {
		const swaggerSchema = generateEndpointSwaggerSchema(endpoint, sharedComponents, config)
		endpointsSwaggerSchema[endpoint.path] = { ...swaggerSchema }
		Object.keys(swaggerSchema).forEach((methodKey) => {
			if ((swaggerSchema[methodKey] as any).error) {
				if (!swaggerSchemaErrors) {
					swaggerSchemaErrors = {}
				}
				if (!swaggerSchemaErrors[endpoint.path]) {
					swaggerSchemaErrors[endpoint.path] = {}
				}
				swaggerSchemaErrors[endpoint.path][methodKey] = (swaggerSchema[methodKey] as any).error
			}
		})
	})

	const swaggerSchema = {
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

	return {
		swaggerSchema,
		swaggerSchemaErrors
	}
}
