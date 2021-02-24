import joiToSwagger from 'joi-to-swagger'
import Joi from 'joi'
import { includes, isEmpty, map } from 'lodash'

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
	description: string,
	externalDocs?: ExternalDocsS
}

interface IContact {
	email: string // apiteam@swagger.io
}

interface IInfo {
	description?: string, // This is a sample Pet Store
	version?: string, // 1.0.6-SNAPSHOT
	title?: string, // Swagger Petstore - OpenAPI 3.0
	termsOfService?: string, // http://swagger.io/terms/
	contact?: IContact, // http://swagger.io/terms/
	license?: ILicense, // http://swagger.io/terms/
}

interface IServer {
	url: string // '/v3'
}

interface ISchema {

}

interface IResponse {
	description?: string,
	content: any,
	'application/json'?: ISchema
	'application/xml'?: ISchema
}

interface IRequestBody {
	description: string,
	required: boolean,
	content: any,
	operationId: string,
	responses: {
		'200': IResponse
	},
	security: any[],
	requestBody: any[],
}

interface IRequest {
	tags: string[],
	summary: string,
	description: string,
	operationId: string,
	responses: {
		'200'?: IResponse,
		'405'?: IResponse
	},
	security: any[],
	requestBody: IRequestBody,
}

interface IComponents {
	schemas: any,
	requestBodies?: string,
	securitySchemes?: string,
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

export interface ISwagger {
	openapi: string // '3.0.2'
	servers: IServer[] // '3.0.2'
	info: IInfo,
	tags: ITag[],
	externalDocs: ExternalDocsS,
	paths: IPath, // requests
	components: IComponents
}

export const getPathSchema: any = (
	pathName: string,
	methodsOfPaths: IPathMethods
) => ({
	[pathName]: {
		...methodsOfPaths
	}
})

export interface ISwaggerInit {
	servers?: IServer[]
	info?: IInfo
	tags?: ITag[]
}

export interface ISwaggerSchemaInput {
	paths: IPath,
	schemas?: any,
	swaggerInitI?: ISwaggerInit
}

export function getSwaggerSchema(
	input: ISwaggerSchemaInput
): ISwagger {
	const {
		schemas,
		paths,
		swaggerInitI
	} = input

	return {
		openapi: '3.0.3',
		servers: swaggerInitI?.servers || [
			{
				url: 'localhost:8080'
			}
		],
		info: {
			description: swaggerInitI?.info?.description || 'This is a sample Pet Store',
			version: swaggerInitI?.info?.version || '1.0.6-SNAPSHOT',
			title: swaggerInitI?.info?.title || 'Swagger Petstore - OpenAPI 3.0',
			termsOfService: swaggerInitI?.info?.termsOfService || 'http://swagger.io/terms/',
			contact: swaggerInitI?.info?.contact || {
				email: 'apiteam@swagger.io'
			},
			license: swaggerInitI?.info?.license || {
				name: 'Apache 2.0',
				url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
			}
		},
		tags: swaggerInitI?.tags,
		paths,
		externalDocs: {
			description: 'Find out more about Swagger',
			url: 'http://swagger.io'
		},
		components: {
			schemas
		}
	}
}

export type methodType = 'get' | 'post' | 'patch' | 'delete'

export function getBaseMethod(
	method: methodType,
	tags: string[],
	pathParameterArray: any,
	queryParameterSchema: any,
	responses: any,
	requestBody: any,
	description: string
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
			// summary: 'Finds Pets by status', // TODO: endpoint description
			description,
			parameters: [
				...pathParameterArray,
				...queryParameterSchema
			],
			responses,
			...requestBodyObject
		}
	}
}

interface Response {
	outputJoiSchema: any,
	code: 200 | 300 | 400 | 401
}

interface SwaggerMethod {
	method: methodType,
	responses: Response[],
	requestJoiSchema?: any,
	permissions?: any,
}

interface SwaggerInput {
	path: string,
	tags: string[],
	methods: SwaggerMethod[],
}

export type ResponseCode = 200 | 300 | 400 | 401 | 403 | 404

export const createResponse = (
	responseSchema: any,
	code: ResponseCode, // TODO dopisat dalsie relevantne kody
	description: string = 'successful operation'
) => ({
	[code]: {
		description,
		content: {
			'application/json': {
				schema: responseSchema
			}
		}
	}
})

const getPermissionDescription = (permissions: string[]): string => {
	const permissionsResult = 'PERMISSION:'
	if (!isEmpty(permissions)) {
		return `${permissionsResult} [${permissions.join(', ')}]`
	}
	return `${permissionsResult} NO`
}

export function getPathSwagger(swagger: SwaggerInput) {
	const {
		path,
		tags,
		methods
	} = swagger

	const methodsSwaggerObjects = methods.map((data: SwaggerMethod) => {
		try {
			const {
				method,
				responses,
				requestJoiSchema,
				permissions: permissionObject
			} = data

			const responsesSwagger = responses.map((response: Response) => {
				const {
					outputJoiSchema,
					code
				} = response
				const { swagger: responseSwagger } = joiToSwagger(outputJoiSchema, null)
				return createResponse(responseSwagger, code)
			}).reduce((previousValue, currentValue) => ({
				...previousValue,
				...currentValue
			}), {})

			// if request does not register schema, the empty one is needed
			const requestSchema = requestJoiSchema || Joi.object().keys({
				body: Joi.object(),
				query: Joi.object(),
				params: Joi.object()
			})

			const { swagger: requestSwagger } = joiToSwagger(requestSchema, null)
			const queryParameterArray = map(requestSwagger.properties.query.properties, (schema, name) => ({
				name,
				in: 'query',
				schema,
				required: includes(requestSwagger.properties.query.required, name)
			}))

			const pathParameterArray = map(requestSwagger.properties.params.properties, (schema, name) => ({
				name,
				in: 'path',
				required: true,
				schema
			}))

			let requestBody: {
				type: string,
				properties: any,
				required: boolean
			}
			if (method !== 'get' && method !== 'delete') {
				requestBody = {
					type: 'object',
					properties: requestSwagger.properties.body.properties,
					required: requestSwagger.properties.body.required
				}
			}

			const permissionDescriptions = getPermissionDescription(permissionObject)
			return getBaseMethod(
				method,
				tags,
				pathParameterArray,
				queryParameterArray,
				responsesSwagger,
				requestBody,
				permissionDescriptions
			)
		} catch (e) {
			console.log(`ERROR with method:${data.method} ${path}`, e)
			return null
		}
	}).reduce((previousValue, currentValue) => ({
		...previousValue,
		...currentValue
	}), {})

	return getPathSchema(path, methodsSwaggerObjects)
}
