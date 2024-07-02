import { isArray } from 'lodash'
import { IMiddleware } from '../types/interfaces'

function extractMiddlewareName(middlewareName: string): string {
	const tempName = middlewareName.replace('<', '').replace('>', '')

	return `${tempName.charAt(0).toUpperCase() + tempName.slice(1)}`
}

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * @param {IMiddleware} middleware object containing all necessary information about actual middleware
 * @return { string } middleware's description
 * */
export const basicArrayFormatter = (middleware: IMiddleware): string => {
	const permissionsResult = `${extractMiddlewareName(middleware.name)}: `

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
 * @param {IMiddleware} middleware object containing all necessary information about actual middleware
 * @return { string } middleware's description
 * */
export const defaultExtractor = (middleware: IMiddleware) => {
	const middlewareName = extractMiddlewareName(middleware.name)

	return `${middlewareName}: ${middleware.isUsed}`
}
