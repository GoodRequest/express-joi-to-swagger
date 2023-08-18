import path from 'path'
import { IConfig } from '../../src/parser'
import { getSwaggerEditable } from '../../src/utils/editableSwagger'

const config: IConfig = {
	outputPath: path.join(__dirname, '../outputSwagger.json'),
	generateUI: false,
	permissions: [{
		middlewareName: 'permission',
		closure: 'permissionMiddleware',
		paramName: 'allowPermissions'
	}],
	requestSchemaName: 'requestSchema',
	responseSchemaName: 'responseSchema',
	errorResponseSchemaName: 'errorResponseSchemas',
	businessLogicName: 'businessLogic',
	swaggerInitInfo: {
		info: {
			description: 'Generated Store',
			title: 'Shaker'
		}
	},
	tags: {}
}

// Use case example for adding responses in tests
// be aware
function workflow() {
	// init in globals, as this variable should be accessible

	// Optional: add alternative output path
	// const swaggerEdit = getSwaggerEditable(config, path.join(__dirname, 'outputSwagger2.json'))
	const swaggerEdit = getSwaggerEditable(config)

	// in local test create editablePath object in beforeAll section, or execute before test
	// so you wont need to call complicated object by every call
	const swaggerPath = swaggerEdit.getEditablePath('get', '/api/v1/users/{userID}')

	// use in single test, as you need to add particular data
	swaggerPath.addResponse({
		joiSchema: {},
		code: 404,
		description: 'Unfortunately you did not put your password correctly my friend'
	})

	// after all test save
	swaggerEdit.save()
}

// Start script
workflow()
