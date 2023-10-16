import { Request, Response, NextFunction } from 'express'
import { Schema } from 'joi'

const options = {
	abortEarly: false
}

const translateFunc = (v: string) => v
export type TranslateFunc = typeof translateFunc

export default (schema: Schema | ((translateFn: TranslateFunc) => Schema)) =>
	function validate(req: Request, _res: Response, next: NextFunction) {
		if (!schema) {
			throw new Error('Validation schema is not provided')
		}
		const { query, body, params }: { query: Record<string, unknown>; body: typeof req.body; params: typeof req.params } = req

		Object.keys(query || {}).forEach((key) => {
			if (query[key] === 'null') {
				query[key] = null
			}
		})

		let resultSchema
		if (typeof schema === 'function') {
			resultSchema = schema(translateFunc)
		} else {
			resultSchema = schema
		}

		const result = resultSchema.validate({ query, body, params }, options)
		if (result.error) {
			throw new Error(result.error.details.toString())
		}

		req.body = result.value.body
		req.query = result.value.query
		req.params = result.value.params
		return next()
	}
