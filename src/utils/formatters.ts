import { isArray } from 'lodash'
import { IMiddleware } from '../types/interfaces'

/**
 * Works only with first middleware argument and prints his value if it consists of a primitive value array or an object containing such arrays
 * @param {string} middlewareName
 * @param {IMiddleware} middleware object containing all necessary information about actual middleware
 * @return { string } middleware's description
 * */
export const basicArrayFormatter = (middlewareName: string, middleware: IMiddleware): string => {
	const middlewareResult = `${middlewareName}: `

	if (!middleware.isUsed) {
		return `${middlewareResult}NO`
	}

	const { value } = middleware.middlewareArguments[0]

	if (isArray(value)) {
		return `${middlewareResult} ${value}`
	}

	return `${middlewareResult}<ul>${Object.keys(value)
		.map((key) => {
			let result = ''

			Object.values(value[key]).forEach((array) => {
				if (isArray(array)) {
					result += `<li>${key}${array.length > 0 ? `: [${array.join(', ')}]` : ''}</li>`
				}
			})

			if (result === '' && value[key]) {
				const keyValue = Object.values(value[key]).at(0)
				if (keyValue) {
					result += `<li>${key}: ${keyValue}</li>`
				}
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
