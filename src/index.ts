import fs from 'node:fs'
import path from 'node:path'
import { Express } from 'express'
import { forEach } from 'lodash'

import generateUI from './ui'
import parseEndpoints from './parser'
import { ISwaggerSchema, generateSwaggerSchema } from './baseSwagger'
import { IGenerateSwaggerConfig } from './types/interfaces'

const markOldEndpointsAsDeprecated = (swaggerSchema: ISwaggerSchema, groupVersionRegex: RegExp) => {
	const groupEndpoints = {} as {
		[groupKey: string]: {
			[method: string]: string[]
		}
	}
	forEach(swaggerSchema.paths, (methods, endpointPath) => {
		const newVersion = 'v*'
		// create group key for endpoitn with multiple versions for example GET api/v1/users, GET api/v2/users, GET api/v3/users group key would be api/v*/users for groupVersionRegex /api\/(?<version>v\d+)\/.+/d
		const groupKey = endpointPath.replace(groupVersionRegex, (match, version, offset, string, groups) => match.replace(groups.version, newVersion))

		forEach(methods, (item, method) => {
			const previousMethods = groupEndpoints?.[groupKey] ?? {}
			const previousPaths = groupEndpoints?.[groupKey]?.[method] ?? []
			groupEndpoints[groupKey] = {
				...previousMethods,
				[method]: [...previousPaths, endpointPath].sort((a, b) => a.localeCompare(b)) // ASC order
			}
		})
	})
	forEach(groupEndpoints, (methods) => {
		forEach(methods, (endpointPaths, endpointMethod) => {
			if (endpointPaths.length > 1) {
				forEach(endpointPaths, (endpointPath, index) => {
					// do not mark last item as deprecated
					if (index < endpointPaths.length - 1) {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						const target = swaggerSchema.paths?.[endpointPath]?.[endpointMethod]
						if (!target.deprecated) {
							// mark previous versions of endpoint as deprecated
							target.deprecated = true
						}
					}
				})
			}
		})
	})
}

const generateSwagger = async (app: Express, config: IGenerateSwaggerConfig) => {
	// extract endpoints data from express app
	const endpoints = await parseEndpoints(app, config)
	// generate swagger schema from endpoints data
	const generationResult = generateSwaggerSchema(endpoints, config)

	const { groupVersionRegex } = config
	if (groupVersionRegex && groupVersionRegex instanceof RegExp) {
		markOldEndpointsAsDeprecated(generationResult.swaggerSchema, groupVersionRegex)
	}

	const outputPath = config.outputPath || process.cwd()
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath)
	}

	// generate swagger ui (if enabled)
	if (config.generateUI) {
		await generateUI(outputPath, config)
	}

	// save swagger schema to file
	await fs.promises.writeFile(path.join(outputPath, 'data.json'), JSON.stringify(generationResult.swaggerSchema, null, '\t'))
	return generationResult.swaggerSchemaErrors
}

export default generateSwagger
