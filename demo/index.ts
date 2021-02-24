import path from 'path'
import getSwagger from '../src'
import app from './app'
import { IConfig } from '../src/parser'

const config: IConfig = {
	outputPath: path.join(__dirname, 'dist'),
	generateUI: true,
	permissions: {
		middlewareName: 'permission',
		closure: 'permissionMiddleware',
		paramName: 'allowPermissions'
	},
	requestSchemaName: 'requestSchema',
	responseSchemaName: 'responseSchema',
	businessLogicName: 'businessLogic',
	swaggerInitInfo: {
		info: {
			description: 'Generated Store',
			title: 'Test app'
		}
	},
	tags: {}
}

// Use case example
function workflow() {
	getSwagger(app, config).then(() => {
		console.log('DONE')
	}).catch((e) => {
		console.log('ERROR', e)
	})
}

// Start script
workflow()
