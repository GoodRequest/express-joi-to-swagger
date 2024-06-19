import { Schema } from 'joi'

import { API_KEY_LOCATION, AUTH_METHOD, AUTH_SCOPE, httpCodes } from '../utils/enums'

export interface IServer {
	/**
	 * Url of the server
	 * @example http://api.example.com/v1
	 */
	url: string
}

export interface IInfo {
	/**
	 * Description of the API
	 * @example This is documentation for the XYZ API
	 */
	description?: string
	/**
	 * Version of the API
	 * @example 1.0.0
	 */
	version?: string
	/**
	 * Title of the API
	 * @example Swagger XYZ - OpenAPI 3.0
	 */
	title?: string
	/**
	 * Terms of service
	 * @example http://swagger.io/terms
	 */
	termsOfService?: string
	/**
	 * Contact information for the exposed API
	 */
	contact?: {
		/**
		 * @example apiteam@swagger.io
		 */
		email: string
	}
	/**
	 * License information for the exposed API
	 */
	license?: {
		/**
		 * @example Apache 2.0
		 */
		name: string
		/**
		 * @example http://www.apache.org/licenses/LICENSE-2.0.html
		 */
		url: string
	}
}

export interface IExternalDocs {
	/**
	 * Description of the external documentation
	 * @example Find out more about Swagger
	 */
	description: string
	/**
	 * Url of the external documentation
	 * @example http://swagger.io
	 */
	url: string
	/**
	 * Name of the external documentation
	 * @example Swagger
	 */
	name?: string
}

export interface ITag {
	name: string
	description: string
	externalDocs?: IExternalDocs
}

export type ISecurity = {
	[P in ValueOf<typeof AUTH_METHOD>]?: any[]
}

export interface ISecurityMethod {
	name: AUTH_METHOD
	config?: {
		in?: API_KEY_LOCATION
		name?: string
		bearerFormat?: string
	}
}

interface IConfigSecurity {
	methods: ISecurityMethod[]
	scope: AUTH_SCOPE
	authMiddlewareName?: string
}

interface ISwaggerInitInfo {
	servers?: IServer[]
	info?: IInfo
	tags?: ITag[]
	security?: IConfigSecurity
}

export type IEndpointMiddleware = {
	name: string
	middlewareArguments?: {
		name: string
		value: any
	}[]
}
export interface ISwaggerMiddlewareConfig {
	middlewareName: string
	closure: string
	middlewareArguments?: string[]
	extractor?: (endpointMiddleware: IEndpointMiddleware, configMiddleware: Omit<ISwaggerMiddlewareConfig, 'extractor'>) => string
}

export interface IGenerateSwaggerConfig {
	outputPath: string
	generateUI: boolean
	middlewares?: ISwaggerMiddlewareConfig[]
	requestSchemaName?: string
	requestSchemaParams?: any[]
	responseSchemaName?: string
	responseSchemaParams?: any[]
	errorResponseSchemaName?: string
	businessLogicName: string
	swaggerInitInfo?: ISwaggerInitInfo
	tags?: {
		baseUrlSegmentsLength?: number
		joinTags?: boolean
		tagSeparator?: string
		versioning?: boolean
		versionSeparator?: string
		versionLength?: number
	}
	filter?: string
}

export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

export type HttpCode = (typeof httpCodes)[number]

export type IEndpoint = {
	path: string
	tags: string[]
	methods: {
		method: HttpMethod
		security: ISecurity[]
		requestJoiSchema: Schema | null
		responses: {
			responseJoiSchema: Schema
			code: HttpCode
		}[]
		middlewares: IEndpointMiddleware[]
	}[]
}

type ValueOf<T> = T[keyof T]
