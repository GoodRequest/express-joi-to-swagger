import fs from 'node:fs'
import path from 'node:path'
import { Express } from 'express'

import generateUI from './ui'
import parseEndpoints from './parser'
import { generateSwaggerSchema } from './baseSwagger'
import { IGenerateSwaggerConfig } from './types/interfaces'

const generateSwagger = async (app: Express, config: IGenerateSwaggerConfig) => {
	// extract endpoints data from express app
	const endpoints = await parseEndpoints(app, config)

	// generate swagger schema from endpoints data
	const swaggerSchema = generateSwaggerSchema(endpoints, config)

	const outputPath = config.outputPath || process.cwd()
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath)
	}

	// generate swagger ui (if enabled)
	if (config.generateUI) {
		await generateUI(outputPath, config)
	}

	// save swagger schema to file
	await fs.promises.writeFile(path.join(outputPath, 'data.json'), JSON.stringify(swaggerSchema, null, '\t'))
}

export default generateSwagger
