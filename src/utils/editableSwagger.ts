/* eslint-disable max-classes-per-file */
import * as fs from 'fs'
import { createResponse, ISwagger, methodType, ResponseCode } from '../baseSwagger'
import { IConfig } from '../parser'

export interface IResponse {
	joiSchema: any
	code: ResponseCode
	description?: string
}

export class PathEditable {
	pathToSwaggerMethod: any
	errorPath: string

	constructor(pathToSwaggerMethod: unknown, errorPath?: string) {
		this.pathToSwaggerMethod = pathToSwaggerMethod
		this.errorPath = errorPath
	}

	addResponse(response: IResponse) {
		const newResponse = createResponse(response.joiSchema, response.code, response.description)
		if (!this.pathToSwaggerMethod) {
			console.error(`PathEditable init error for path: ${this.errorPath}`)
			return
		}
		this.pathToSwaggerMethod.responses[response.code] = newResponse[response.code]
	}
}

export class SwaggerEditable {
	config: IConfig
	alternativeOutputPath?: string
	instance: ISwagger

	constructor(config: IConfig, alternativeOutputPath: string = null) {
		this.config = config
		this.alternativeOutputPath = alternativeOutputPath
		this.instance = this.get()
	}

	get() {
		const obj = JSON.parse(fs.readFileSync(this.config.outputPath, 'utf8'))
		const swaggerObj = obj as ISwagger
		return swaggerObj
	}

	getEditablePath(method: methodType, endpointPath: string): PathEditable {
		const pathDescription = `${method} '${endpointPath}'`
		if (!this.instance) {
			return new PathEditable(null, pathDescription)
		}
		if (!this.instance?.paths[endpointPath]) {
			console.error(`Path not registered: ${endpointPath} `)
			return new PathEditable(null, pathDescription)
		}
		if (!this.instance?.paths[endpointPath]?.[method]) {
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

export const getSwaggerEditable = (config: IConfig, alternativeOutputPath: string = null) => new SwaggerEditable(config, alternativeOutputPath)
