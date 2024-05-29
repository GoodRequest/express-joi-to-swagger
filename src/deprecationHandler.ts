import { forEach } from 'lodash'

import { ISwaggerSchema } from './baseSwagger'
import { HttpMethod } from './types/interfaces'

// eslint-disable-next-line import/prefer-default-export
export const markOldEndpointsAsDeprecated = (swaggerSchema: ISwaggerSchema, deprecationPathPattern: string) => {
	const start = new Date().valueOf()
	// eslint-disable-next-line no-console
	console.log('Deprecation handler started')

	// validate deprecationPathPattern format
	const vPattersMatchResult = deprecationPathPattern.match(/v\*/g)
	if (!vPattersMatchResult) {
		throw new Error('Invalid deprecationPathPattern format. It have to contain "v*" pattern at the end')
	}
	// TODO: vyriesit napr. takyto case: api/v*/v*/ -> kedy je pattern \/v\*\/ a vysledok nezachyti vsetky v* patterny
	if (vPattersMatchResult.length > 1) {
		throw new Error('Invalid deprecationPathPattern format. It can contain only one "v*" pattern')
	}
	// TODO: doplnit mozno nejake dalsie overenia

	// build groupVersionRegex
	let normalizedDeprecationPathPattern: string = deprecationPathPattern
	if (!normalizedDeprecationPathPattern.startsWith('/')) {
		normalizedDeprecationPathPattern = `/${normalizedDeprecationPathPattern}`
	}
	if (!normalizedDeprecationPathPattern.endsWith('/')) {
		normalizedDeprecationPathPattern = `${normalizedDeprecationPathPattern}/`
	}

	normalizedDeprecationPathPattern = normalizedDeprecationPathPattern.replace(/\/v\*\//, '/(?<version>v\\d+)/')

	const groupVersionRegex = new RegExp(`^${normalizedDeprecationPathPattern}.+`)
	const groupKeyVersionReplacement = 'v*'

	const groupedEndpoints = {} as {
		[groupKey: string]: {
			[method in HttpMethod]: string[]
		}
	}

	// group all versioned endpoints by group key
	forEach(swaggerSchema.paths, (methods, endpointPath) => {
		/**
		 * check if endpoint path matches groupVersionRegex
		 * if it does, generate group key for endpoint
		 *
		 * @example
		 * - groupVersionRegex: /api\/(?<version>v\d+)\/.+/
		 * - endpoints
		 * 	- GET api/v1/users
		 * 	- GET api/v2/users
		 * 	- GET api/v3/users
		 * - generated group key: api/v*\/users
		 */
		const matchResult = endpointPath.match(groupVersionRegex)
		if (matchResult && matchResult.groups) {
			const groupKey = endpointPath.replace(matchResult.groups.version, groupKeyVersionReplacement)

			forEach(methods, (_item, method: HttpMethod) => {
				const previousMethods = groupedEndpoints[groupKey] ?? {}
				const previousMethodEndpointPaths = previousMethods[method] ?? []

				groupedEndpoints[groupKey] = {
					...previousMethods,
					[method]: [...previousMethodEndpointPaths, endpointPath]
				}
			})
		}
	})

	// mark previous versions of endpoint as deprecated
	forEach(groupedEndpoints, (methods) => {
		forEach(methods, (endpointPaths, method: HttpMethod) => {
			if (endpointPaths.length > 1) {
				const orderedEndpointPaths = endpointPaths.sort((a, b) => a.localeCompare(b)) // ASC order

				forEach(orderedEndpointPaths, (endpointPath, index) => {
					// mark all versions of endpoint as deprecated (except last one -> latest version)
					if (index < endpointPaths.length - 1) {
						const target = swaggerSchema.paths[endpointPath][method]
						if (target) {
							target.deprecated = true
						}
					}
				})
			}
		})
	})

	// eslint-disable-next-line no-console
	console.log(`\tDeprecation handler finished (duration = ${new Date().valueOf() - start}ms)`)
}
