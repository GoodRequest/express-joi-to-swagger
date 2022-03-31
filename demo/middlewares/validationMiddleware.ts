import { Request, Response, NextFunction } from 'express'
import { Schema } from 'joi'

const options = {
	abortEarly: false
}

export default (schema: Schema | ((translateFn: any) => Schema)) => function validate(req: Request, res: Response, next: NextFunction) {
	if (!schema) {
		throw new Error('Validation schema is not provided')
	}
	const { query, body, params } = req

	Object.keys(query || {}).forEach((key) => {
		if (query[key] === 'null') {
			query[key] = null
		}
	})

	let resultSchema: Schema = null
		if (typeof schema === 'function') {
			const translateFn = () => {}
			resultSchema = schema(translateFn)
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
