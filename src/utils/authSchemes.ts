import { forEach } from 'lodash'
// eslint-disable-next-line import/no-cycle
import { ISecurityMethod } from '../baseSwagger'

enum AUTH_TYPE {
	HTTP = 'http',
	API_KEY = 'apiKey'
}

enum AUTH_SCHEME {
	BASIC = 'basic',
	BEARER = 'bearer'
}

enum API_KEY_LOCATION {
	HEADER = 'header',
	QUERY = 'query',
	COOKIE = 'cookie'
}

export interface IAuthenticationSchemeConfig {
	in?: API_KEY_LOCATION
	name?: string
	bearerFormat?: string
}

export enum AUTH_METHOD {
	BASIC = 'basicAuth',
	BEARER = 'bearerAuth',
	API_KEY = 'ApiKeyAuth'
}

export enum AUTH_SCOPE {
	GLOBAL = 'global',
	ENDPOINT = 'endpoint'
}

export default (methods: ISecurityMethod[]) => {
	let result = {}

	forEach(methods, (method) => {
		if (method.name === AUTH_METHOD.BASIC) {
			result = {
				...result,
				[AUTH_METHOD.BASIC]: {
					type: AUTH_TYPE.HTTP,
					scheme: AUTH_SCHEME.BASIC
				}
			}
		} else if (method.name === AUTH_METHOD.BEARER) {
			result = {
				...result,
				[AUTH_METHOD.BEARER]: {
					type: AUTH_TYPE.HTTP,
					scheme: AUTH_SCHEME.BEARER,
					bearerFormat: method.config?.bearerFormat
				}
			}
		} else if (method.name === AUTH_METHOD.API_KEY) {
			result = {
				...result,
				[AUTH_METHOD.API_KEY]: {
					type: AUTH_TYPE.API_KEY,
					in: method.config.in,
					name: method.config.name
				}
			}
		}
	})

	return result
}
