import path from 'path'
import app from './app'
import generateSwagger from '../src'
import { IGenerateSwaggerConfig } from '../src/types/interfaces'
import { AUTH_METHOD, AUTH_SCOPE } from '../src/utils/enums'

const config: IGenerateSwaggerConfig = {
	outputPath: path.join(__dirname, 'dist'),
	generateUI: true,
	middlewares: [
		{
			middlewareName: 'permission',
			closure: 'permissionMiddleware',
			middlewareArguments: ['options']
		},
		{
			middlewareName: 'validate',
			closure: 'validationMiddleware',
			middlewareArguments: ['test']
		}
	],
	requestSchemaName: 'requestSchema',
	requestSchemaParams: [(v: string) => v],
	responseSchemaName: 'responseSchema',
	errorResponseSchemaName: 'errorResponseSchemas',
	businessLogicName: 'businessLogic',
	swaggerInitInfo: {
		info: {
			description: 'Generated Store',
			title: 'Test app',
			version: '1.0.0-demo'
		},
		security: {
			methods: [
				{
					name: AUTH_METHOD.BASIC
				},
				{
					name: AUTH_METHOD.BEARER,
					config: {
						bearerFormat: 'JWT'
					}
				}
			],
			scope: AUTH_SCOPE.ENDPOINT,
			authMiddlewareName: 'authenticate'
		}
	},
	tags: {},
	filter: '.*users.*'
}

// Use case example
function workflow() {
	generateSwagger(app, config)
		.then(() => {
			// eslint-disable-next-line no-console
			console.log('DONE')
		})
		.catch((e) => {
			// eslint-disable-next-line no-console
			console.log('ERROR', e)
		})
}

// Start script
workflow()
