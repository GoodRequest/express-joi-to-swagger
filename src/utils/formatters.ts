import { isArray } from 'lodash'
import { IMiddleware } from '../types/interfaces'

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * @param {string} middlewareName
 * @param {IMiddleware} middleware object containing all necessary information about actual middleware
 * @return { string } middleware's description
 * */
export const basicArrayFormatter = (middlewareName: string, middleware: IMiddleware): string => {
	const permissionsResult = `${middlewareName}: `

	if (!middleware.isUsed) {
		return `${permissionsResult}NO`
	}

	const { value } = middleware.middlewareArguments[0]

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

			if (result === '' && value[key].allowedPermissions) {
				result += `<li>${key}: ${value[key].allowedPermissions}</li>`
			}

			return result
		})
		.join('')}</ul>`
}

/**
 * Default formatter
 * @param {string} middlewareName
 * @param {IMiddleware} middleware object containing all necessary information about actual middleware
 * @return { string } middleware's description
 * */
export const defaultFormatter = (middlewareName: string, middleware: IMiddleware) => {
	return `${middlewareName}: ${middleware.isUsed}`
}
