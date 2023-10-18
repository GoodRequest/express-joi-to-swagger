export enum AUTH_METHOD {
	BASIC = 'basicAuth',
	BEARER = 'bearerAuth',
	API_KEY = 'ApiKeyAuth'
}

export enum AUTH_SCOPE {
	GLOBAL = 'global',
	ENDPOINT = 'endpoint'
}

export enum API_KEY_LOCATION {
	HEADER = 'header',
	QUERY = 'query',
	COOKIE = 'cookie'
}
