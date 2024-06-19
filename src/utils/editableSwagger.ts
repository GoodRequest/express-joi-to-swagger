/* eslint-disable max-classes-per-file */
import * as fs from 'node:fs'

import { ISwaggerSchema, createResponseSwaggerSchema } from '../baseSwagger'
import { HttpCode, HttpMethod, IGenerateSwaggerConfig } from '../types/interfaces'

export interface IResponse {
	joiSchema: any
	code: HttpCode
	description?: string
}

export class PathEditable {
	pathToSwaggerMethod: any
	errorPath?: string

	constructor(pathToSwaggerMethod: unknown, errorPath?: string) {
		this.pathToSwaggerMethod = pathToSwaggerMethod
		this.errorPath = errorPath
	}

	addResponse(response: IResponse) {
		const newResponse = createResponseSwaggerSchema(response.joiSchema, response.code, response.description)
		if (!this.pathToSwaggerMethod) {
			// eslint-disable-next-line no-console
			console.error(`PathEditable init error for path: ${this.errorPath}`)
			return
		}
		this.pathToSwaggerMethod.responses[response.code] = newResponse[response.code]
	}
}

export class SwaggerEditable {
	config: IGenerateSwaggerConfig
	alternativeOutputPath: string | null
	instance: ISwaggerSchema

	constructor(config: IGenerateSwaggerConfig, alternativeOutputPath: string | null = null) {
		this.config = config
		this.alternativeOutputPath = alternativeOutputPath
		this.instance = this.get()
	}

	get() {
		const obj = JSON.parse(fs.readFileSync(this.config.outputPath, 'utf8'))
		const swaggerObj = obj as ISwaggerSchema
		return swaggerObj
	}

	getEditablePath(method: HttpMethod, endpointPath: string): PathEditable {
		const pathDescription = `${method} '${endpointPath}'`
		if (!this.instance) {
			return new PathEditable(null, pathDescription)
		}
		if (!this.instance?.paths[endpointPath]) {
			// eslint-disable-next-line no-console
			console.error(`Path not registered: ${endpointPath} `)
			return new PathEditable(null, pathDescription)
		}
		if (!this.instance?.paths[endpointPath]?.[method]) {
			// eslint-disable-next-line no-console
			console.error(`Method ${method} at path ${endpointPath} not registered`)
			return new PathEditable(null, pathDescription)
		}
		return new PathEditable(this.instance.paths[endpointPath]?.[method])
	}

	save() {
		const outputPath = this.alternativeOutputPath || this.config.outputPath
		fs.createWriteStream(outputPath)
		fs.appendFileSync(outputPath, JSON.stringify(this.instance, null, '\t'))
	}
}

export const getSwaggerEditable = (config: IGenerateSwaggerConfig, alternativeOutputPath: string | null = null) => new SwaggerEditable(config, alternativeOutputPath)
