import { isArray } from 'lodash'
import { IEndpointMiddleware, ISwaggerMiddlewareConfig } from '../types/interfaces'

function extractMiddlewareName(configMiddleware: ISwaggerMiddlewareConfig): string {
	const tempName = configMiddleware.middlewareName.replace('<', '').replace('>', '')

	return `${tempName.charAt(0).toUpperCase() + tempName.slice(1).toLowerCase()}`
}

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * */
export const firstVersionExtractor = (endpointMiddleware: IEndpointMiddleware | undefined, configMiddleware: ISwaggerMiddlewareConfig): string => {
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

export const defaultExtractor = (endpointMiddleware: IEndpointMiddleware | undefined, configMiddleware: ISwaggerMiddlewareConfig) => {
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
