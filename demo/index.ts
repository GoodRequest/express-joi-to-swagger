import path from 'path'
import getSwagger from '../src'
import app from './app'
import { IConfig } from '../src/parser'
import { AUTH_METHOD, AUTH_SCOPE } from '../src/utils/authSchemes'

const mockTranslateFn = (v: any) => v

const config: IConfig = {
	outputPath: path.join(__dirname, 'dist'),
	generateUI: true,
	permissions: [{
		middlewareName: 'permission',
		closure: 'permissionMiddleware',
		paramName: 'allowPermissions'
	}],
	requestSchemaName: 'requestSchema',
	requestSchemaParams: [mockTranslateFn],
	responseSchemaName: 'responseSchema',
	businessLogicName: 'businessLogic',
	swaggerInitInfo: {
		info: {
			description: 'Generated Store',
			title: 'Test app',
			version: '1.0.0-demo'
		},
		security: {
			methods: [{
				name: AUTH_METHOD.BASIC
			}, {
				name: AUTH_METHOD.BEARER,
				config: {
					bearerFormat: 'JWT'
				}
			}],
			scope: AUTH_SCOPE.ENDPOINT,
			authMiddlewareName: 'authenticate'
		}
	},
	tags: {},
	// filter: '.*users.*'
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
