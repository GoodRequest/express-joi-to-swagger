import { forEach } from 'lodash'
import { Express } from 'express'
import path from 'path'
import fs from 'fs'
import generateUi from './ui'
import parser, { IConfig } from './parser'
import {
	getPathSwagger,
	getSwaggerSchema
} from './baseSwagger'

const getSwagger = async (app: Express, config: IConfig) => {
	const endpoints = await parser(app, config)

	let resultSwagger = {}
	forEach(endpoints, (endpoint) => {
		resultSwagger = {
			...resultSwagger,
			...getPathSwagger(endpoint)
		}
	})

	const result = getSwaggerSchema({
		paths: resultSwagger,
		swaggerInitI: config.swaggerInitInfo
	})
	const outputPath = config.outputPath || process.cwd()
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath)
	}

	if (config.generateUI) {
		fs.writeFileSync(path.join(__dirname, 'ui', 'data.json'), JSON.stringify(result, null, '\t'))
		await generateUi(outputPath)
	} else {
		fs.writeFileSync(path.join(outputPath, 'data.json'), JSON.stringify(result, null, '\t'))
	}
}

export default getSwagger
