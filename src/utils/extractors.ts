import { isArray } from 'lodash'
import { IEndpointMiddleware, ISwaggerMiddlewareConfig } from '../types/interfaces'

function extractMiddlewareName(configMiddleware: ISwaggerMiddlewareConfig): string {
	const tempName = configMiddleware.middlewareName.replace('<', '').replace('>', '')

	return `${tempName.charAt(0).toUpperCase() + tempName.slice(1).toLowerCase()}`
}

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * @param configMiddleware config information of a middleware wich should be processed
 * @param endpointMiddleware object containing all necessary information about actual middleware
 * or undefined in case the middleware is not used in a given endpoint.
 * @return { string } middleware's description
 * */
export const firstVersionExtractor = (configMiddleware: ISwaggerMiddlewareConfig, endpointMiddleware: IEndpointMiddleware | undefined): string => {
	if (!endpointMiddleware || endpointMiddleware.middlewareArguments.length === 0) {
		return `NO`
	}

	const permissionsResult = `${extractMiddlewareName(configMiddleware)}: `

	const { value } = endpointMiddleware.middlewareArguments[0]

	if (isArray(value)) {
		return `${permissionsResult} ${value}`
	}

	return `${permissionsResult}<ul>${Object.keys(value)
		.map((key) => {
			let result = ''

			Object.values(value[key]).forEach((array) => {
				if (isArray(array)) {
					result += `<li>${key}${array.length > 0 ? `: [${array.join(', ')}]` : ''}</li>`
				}
			})

			return result
		})
		.join('')}</ul>`
}

/**
 * Default extractor
 * @param configMiddleware config information of a middleware wich should be processed
 * @param endpointMiddleware object containing all necessary information about actual middleware
 * or undefined in case the middleware is not used in a given endpoint.
 * @return { string } middleware's description
 * */
export const defaultExtractor = (configMiddleware: ISwaggerMiddlewareConfig, endpointMiddleware: IEndpointMiddleware | undefined) => {
	let value = 'false'
	const middlewareName = extractMiddlewareName(configMiddleware)
	if (!endpointMiddleware) {
		return `${middlewareName}: ${value}`
	}

	if (endpointMiddleware.middlewareArguments.length > 0) {
		value = ''
		endpointMiddleware.middlewareArguments.forEach((middlewareArgument) => {
			value += `<li>${middlewareArgument.argumentName}: ${JSON.stringify(middlewareArgument.value, null, 2)}</li>`
		})
	} else {
		value = 'true'
	}

	return `${middlewareName}: ${value === 'true' ? value : `<ul>${value}</ul>`}`
}
