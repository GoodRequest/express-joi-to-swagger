import { forEach } from 'lodash'

import { API_KEY_LOCATION, AUTH_METHOD } from './enums'
import { ISecurityMethod } from '../types/interfaces'

enum AUTH_TYPE {
	HTTP = 'http',
	API_KEY = 'apiKey'
}

enum AUTH_SCHEME {
	BASIC = 'basic',
	BEARER = 'bearer'
}

export interface ISecuritySchemes {
	[AUTH_METHOD.BASIC]?: { type: AUTH_TYPE.HTTP; scheme: AUTH_SCHEME.BASIC }
	[AUTH_METHOD.BEARER]?: { type: AUTH_TYPE.HTTP; scheme: AUTH_SCHEME.BEARER; bearerFormat?: string }
	[AUTH_METHOD.API_KEY]?: { type: AUTH_TYPE.API_KEY; in?: API_KEY_LOCATION; name?: string }
}

export default (methods: ISecurityMethod[]) => {
	const result: ISecuritySchemes = {}

	forEach(methods, (method) => {
		if (method.name === AUTH_METHOD.BASIC) {
			result[AUTH_METHOD.BASIC] = {
				type: AUTH_TYPE.HTTP,
				scheme: AUTH_SCHEME.BASIC
			}
		} else if (method.name === AUTH_METHOD.BEARER) {
			result[AUTH_METHOD.BEARER] = {
				type: AUTH_TYPE.HTTP,
				scheme: AUTH_SCHEME.BEARER,
				bearerFormat: method.config?.bearerFormat
			}
		} else if (method.name === AUTH_METHOD.API_KEY) {
			result[AUTH_METHOD.API_KEY] = {
				type: AUTH_TYPE.API_KEY,
				in: method.config?.in,
				name: method.config?.name
			}
		}
	})

	return result
}
