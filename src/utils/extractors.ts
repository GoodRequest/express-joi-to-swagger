import { isArray } from 'lodash'
import { IEndpointMiddleware, ISwaggerMiddlewareConfig } from '../types/interfaces'

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * */
// eslint-disable-next-line import/prefer-default-export
export const firstVersionExtractor = (endpointMiddleware: IEndpointMiddleware | undefined, configMiddleware: ISwaggerMiddlewareConfig): string => {
	if (!endpointMiddleware || endpointMiddleware.middlewareArguments.length === 0) {
		return `NO`
	}

	const permissionsResult = `${configMiddleware.middlewareName.charAt(0).toUpperCase() + configMiddleware.middlewareName.slice(1).toLowerCase()}: `

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
