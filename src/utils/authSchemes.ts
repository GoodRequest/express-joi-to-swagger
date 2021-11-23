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

export default (method: AUTH_METHOD, config?: IAuthenticationSchemeConfig) => {
	switch (method) {
		case AUTH_METHOD.BASIC:
			return {
				[AUTH_METHOD.BASIC]: {
					type: AUTH_TYPE.HTTP,
					scheme: AUTH_SCHEME.BASIC
				}
			}
		case AUTH_METHOD.BEARER:
			return {
				[AUTH_METHOD.BEARER]: {
					type: AUTH_TYPE.HTTP,
					scheme: AUTH_SCHEME.BEARER,
					bearerFormat: config?.bearerFormat
				}
			}
		case AUTH_METHOD.API_KEY:
			if (!config.in || !config.name) {
				return {}
			}
			return {
				[AUTH_METHOD.API_KEY]: {
					type: AUTH_TYPE.API_KEY,
					in: config.in,
					name: config.name
				}
			}
		default:
			return {}
	}
}
