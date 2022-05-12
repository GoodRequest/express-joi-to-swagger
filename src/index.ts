import { forEach } from 'lodash'
import { Express } from 'express'
import path from 'path'
import fs from 'fs'
import generateUi from './ui'
import parser, { IConfig } from './parser'
import { getPathSwagger, getSwaggerSchema } from './baseSwagger'

const getSwagger = async (app: Express, config: IConfig) => {
	const endpoints = await parser(app, config)

	let resultSwagger = {}
	forEach(endpoints, (endpoint) => {
		resultSwagger = {
			...resultSwagger,
			...getPathSwagger(endpoint, config)
		}
	})

	const result = getSwaggerSchema(resultSwagger, config)
	const outputPath = config.outputPath || process.cwd()
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath)
	}
	if (config.generateUI) {
		await new Promise((resolve, reject) => {
			fs.writeFile(path.join(__dirname, 'ui', 'data.json'), JSON.stringify(result, null, '\t'), (err) => {
				if (err) {
					return reject(err)
				}
				return resolve(true)
			})
		})
		await generateUi(outputPath)
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
