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

export const httpCodes = [
	100, 101, 102, 200, 201, 202, 203, 204, 205, 206, 207, 300, 301, 302, 303, 304, 305, 307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415,
	416, 417, 418, 419, 420, 422, 423, 424, 428, 429, 431, 500, 501, 502, 503, 504, 505, 507, 511
] as const
