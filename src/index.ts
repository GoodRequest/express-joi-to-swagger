import { forEach } from 'lodash'
import { Express } from 'express'
import path from 'path'
import fs from 'fs'
import { ComponentsSchema } from 'joi-to-swagger'
import generateUi from './ui'
import parser, { IConfig } from './parser'
import { getPathSwagger, getSwaggerSchema } from './baseSwagger'

const getSwagger = async (app: Express, config: IConfig) => {
	const endpoints = await parser(app, config)

	let resultSwagger = {}
	const sharedComponents: ComponentsSchema = {}
	forEach(endpoints, (endpoint) => {
		resultSwagger = {
			...resultSwagger,
			...getPathSwagger(endpoint, sharedComponents, config)
		}
	})

	const result = getSwaggerSchema(resultSwagger, sharedComponents, config)
	const outputPath = config.outputPath || process.cwd()
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath)
	}
	if (config.generateUI) {
		await generateUi(outputPath, config)
	}
	await new Promise((resolve, reject) => {
		fs.writeFile(path.join(outputPath, 'data.json'), JSON.stringify(result, null, '\t'), (err) => {
			if (err) {
				return reject(err)
			}
			return resolve(true)
		})
	})
}

export default getSwagger
