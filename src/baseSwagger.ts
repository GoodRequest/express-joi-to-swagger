import joiToSwagger from 'joi-to-swagger'
import Joi from 'joi'
import { includes, map, camelCase } from 'lodash'

// eslint-disable-next-line import/no-cycle
import getSecurityScheme, { AUTH_METHOD, AUTH_SCOPE, IAuthenticationSchemeConfig } from './utils/authSchemes'
/* eslint-disable import/no-cycle */
import { IConfig } from './parser'

interface ExternalDocsS {
	name?: string // Apache 2.0
	url: string // http://www.apache.org/licenses/LICENSE-2.0.html
	description: string
}

interface ILicense {
	name: string // Apache 2.0
	url: string // http://www.apache.org/licenses/LICENSE-2.0.html
}

interface ITag {
	name: string // Apache 2.0
	description: string
	externalDocs?: ExternalDocsS
}

interface IContact {
	email: string // apiteam@swagger.io
}

interface IInfo {
	description?: string // This is a sample Pet Store
	version?: string // 1.0.6-SNAPSHOT
	title?: string // Swagger Petstore - OpenAPI 3.0
	termsOfService?: string // http://swagger.io/terms/
	contact?: IContact // http://swagger.io/terms/
	license?: ILicense // http://swagger.io/terms/
}

interface IServer {
	url: string // '/v3'
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ISchema {}

interface IResponse {
	description?: string
	content: any
	'application/json'?: ISchema
	'application/xml'?: ISchema
}

interface IRequestBody {
	description: string
	required: boolean
	content: any
	operationId: string
	responses: {
		'200': IResponse
	}
	security: any[]
	requestBody: any[]
}

interface IRequest {
	tags: string[]
	summary: string
	description: string
	operationId: string
	responses: {
		'200'?: IResponse
		'405'?: IResponse
	}
	security: any[]
	requestBody: IRequestBody
}

interface IComponents {
	schemas: any
	requestBodies?: string
	securitySchemes?: any
}

interface IPathMethods {
	get?: IRequest
	post?: IRequest
	put?: IRequest
	delete?: IRequest
	patch?: IRequest
}

interface IPath {
	[key: string]: IPathMethods
}

export interface ISecurityMethod {
	name: AUTH_METHOD
	config?: IAuthenticationSchemeConfig
}

export interface ISecurity {
	methods: ISecurityMethod[]
	scope: AUTH_SCOPE
	authMiddlewareName?: string
}

export interface ISwagger {
	openapi: string // '3.0.2'
	servers: IServer[] // '3.0.2'
	info: IInfo
	tags: ITag[]
	externalDocs: ExternalDocsS
	paths: IPath // requests
	components: IComponents
	security: any
}

export interface ISwaggerInit {
	servers?: IServer[]
	info?: IInfo
	tags?: ITag[]
	security?: ISecurity
}

export function getSwaggerSchema(paths: IPath, config: IConfig): ISwagger {
	const { swaggerInitInfo } = config

	return {
		openapi: '3.1.0',
		servers: swaggerInitInfo?.servers || [
			{
				url: 'localhost:8080'
			}
		],
		info: {
			description: swaggerInitInfo?.info?.description || 'This is a sample Pet Store',
			version: swaggerInitInfo?.info?.version || '1.0.6-SNAPSHOT',
			title: swaggerInitInfo?.info?.title || 'Swagger Petstore - OpenAPI 3.0',
			termsOfService: swaggerInitInfo?.info?.termsOfService || 'http://swagger.io/terms/',
			contact: swaggerInitInfo?.info?.contact || {
				email: 'apiteam@swagger.io'
			},
			license: swaggerInitInfo?.info?.license || {
				name: 'Apache 2.0',
				url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
			}
		},
		tags: swaggerInitInfo?.tags,
		paths,
		externalDocs: {
			description: 'Find out more about Swagger',
			url: 'http://swagger.io'
		},
		components: {
			securitySchemes: swaggerInitInfo?.security ? getSecurityScheme(swaggerInitInfo.security.methods) : {},
			schemas: undefined
		},
		security: swaggerInitInfo?.security?.scope === AUTH_SCOPE.GLOBAL ? map(swaggerInitInfo?.security?.methods, (method) => ({ [method.name]: [] })) : []
	}
}

export type methodType = 'get' | 'post' | 'patch' | 'delete'

export function getBaseMethod(
	method: methodType,
	tags: string[],
	security: any,
	headerParameterArray: any,
	pathParameterArray: any,
	queryParameterSchema: any,
	responses: any,
	requestBody: any,
	description: string,
	operationId: string,
	summary?: string
): IPathMethods {
	let requestBodyObject: any = null
	if (requestBody) {
		requestBodyObject = {
			requestBody: {
				content: {
					'application/json': {
						schema: requestBody
					}
				}
			}
		}
	}

	return {
		[method]: {
			tags,
			security,
			summary,
			operationId,
			description,
			parameters: [...headerParameterArray, ...pathParameterArray, ...queryParameterSchema],
			responses,
			...requestBodyObject
		}
	}
}

interface Response {
	outputJoiSchema: any
	code: 200 | 300 | 400 | 401
}

interface SwaggerMethod {
	method: methodType
	responses: Response[]
	requestJoiSchema?: any
	permissions?: any
	security: any
}

interface SwaggerInput {
	path: string
	tags: string[]
	methods: SwaggerMethod[]
	security: any
}

export type ResponseCode = 200 | 300 | 400 | 401 | 403 | 404 | 409

const formatResponseDescription = (code: ResponseCode, description?: string) => {
	if (description) {
		return description
	}

	if (code >= 400) {
		return 'Error response'
	}

	return 'Success response'
}

export const createResponse = (
	responseSchema: any,
	code: ResponseCode, // TODO: add more response codes
	description?: string
) => ({
	[code]: {
		description: formatResponseDescription(code, description),
		content: {
			'application/json': {
				schema: responseSchema
			}
		}
	}
})

const prepAlternativesArray = (alts: any[]) =>
	alts.reduce(
		(acc: any, curr: any, index: number) => {
			acc[`option_${index}`] = curr
			return acc
		},
		{
			warning: {
				type: 'string',
				enum: ['.alternatives() object - select 1 option only']
			}
		}
	)

const getPermissionDescription = (permissions: { [groupName: string]: string[] }) => {
	const permissionsResult = 'permissions:'

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
		(permisisonGroup, permisisonGroupName) => `<li>${permisisonGroupName}${permisisonGroup.length > 0 ? `: [${permisisonGroup.join(', ')}]` : ''}</li>`
	).join('')}</ul>`
}

export function getPathSwagger(swagger: SwaggerInput, config: IConfig) {
	const { path, tags, methods } = swagger

	const methodsSwaggerObjects = methods
		.map((data: SwaggerMethod) => {
			try {
				const { method, responses, requestJoiSchema, permissions: permissionObject, security } = data

				const responsesSwagger = responses
					.map((response: Response) => {
						const { outputJoiSchema, code } = response
						const { swagger: responseSwagger } = joiToSwagger(outputJoiSchema, null)
						return createResponse(responseSwagger, code)
					})
					.reduce(
						(previousValue, currentValue) => ({
							...previousValue,
							...currentValue
						}),
						{}
					)

				// if request does not register schema, the empty one is needed
				const requestSchema =
					requestJoiSchema ||
					Joi.object().keys({
						body: Joi.object(),
						query: Joi.object(),
						params: Joi.object(),
						headers: Joi.object()
					})

				const { swagger: requestSwagger } = joiToSwagger(requestSchema, null)

				const headerParameterArray =
					map(requestSwagger.properties.headers?.properties, (schema, name) => ({
						name,
						in: 'header',
						schema,
						required: includes(requestSwagger.properties.headers.required, name),
						description: schema.description || undefined
					})) || []

				const queryParameterArray =
					map(requestSwagger.properties.query?.properties, (schema, name) => ({
						name,
						in: 'query',
						schema,
						required: includes(requestSwagger.properties.query.required, name),
						description: schema.description || undefined
					})) || []

				const pathParameterArray =
					map(requestSwagger.properties.params?.properties, (schema, name) => ({
						name,
						in: 'path',
						schema,
						required: true,
						description: schema.description || undefined
					})) || []

				let requestBody: {
					type: string
					properties: any
					required: boolean
				}
				if (method !== 'get') {
					requestBody = {
						type: 'object',
						properties: requestSwagger.properties.body.anyOf ? prepAlternativesArray(requestSwagger.properties.body.anyOf) : requestSwagger.properties.body.properties,
						required: requestSwagger.properties.body.required
					}
				}

				const { description } = requestSwagger
				// Print permission label only if is define in config
				let permissionDescriptions = config.permissions ? getPermissionDescription(permissionObject) : ''
				if (config.permissions) {
					if (config.permissionsDescriptionFormatter && typeof config.permissionsDescriptionFormatter === 'function') {
						permissionDescriptions = config.permissionsDescriptionFormatter(permissionObject)
					} else {
						permissionDescriptions = getPermissionDescription(permissionObject)
					}
				}
				const resultDescription = [description, permissionDescriptions].filter((v) => !!v).join(', ')
				const operationId = camelCase(`${method}${path}`)
				// TODO: implement summary in the future
				const summary: any = undefined

				return getBaseMethod(
					method,
					tags,
					security,
					headerParameterArray,
					pathParameterArray,
					queryParameterArray,
					responsesSwagger,
					requestBody,
					resultDescription,
					operationId,
					summary
				)
			} catch (e) {
				console.log(`ERROR with method:${data.method} ${path}`, e)
				return null
			}
		})
		.reduce(
			(previousValue, currentValue) => ({
				...previousValue,
				...currentValue
			}),
			{}
		)

	return {
		[path]: {
			...methodsSwaggerObjects
		}
	}
}
