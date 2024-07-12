import fs from 'node:fs'
import path from 'node:path'
import { Express } from 'express'
import { basicArrayFormatter, defaultFormatter } from './utils/formatters'

import generateUI from './ui'
import parseExpressApp from './parser'
import { generateSwaggerSchema } from './baseSwagger'
import { markOldEndpointsAsDeprecated } from './deprecationHandler'
import { IGenerateSwaggerConfig } from './types/interfaces'

const generateSwagger = async (app: Express, config: IGenerateSwaggerConfig) => {
	// extract endpoints data from express app
	const endpoints = await parseExpressApp(app, config)
	// generate swagger schema from endpoints data
	const generationResult = generateSwaggerSchema(endpoints, config)

	const { deprecationPathPattern } = config
	if (deprecationPathPattern) {
		markOldEndpointsAsDeprecated(generationResult.swaggerSchema, deprecationPathPattern)
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
	await fs.promises.writeFile(path.join(outputPath, 'data.json'), JSON.stringify(generationResult.swaggerSchema, null))

	return generationResult.swaggerSchemaErrors
}

export default generateSwagger
export const formatters = { basicArrayFormatter, defaultFormatter }
