import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object()
}).description('@deprecated Endpoint returns list of users.')

export const responseSchema = Joi.array().items(Joi.object({
	users: Joi.object({
		id: Joi.number(),
		name: Joi.string(),
		surname: Joi.string()
	})
}))

export const businessLogic = (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			users: [{
				id: 1,
				name: 'John',
				surname: 'Snow'
			}]
		})
	} catch (e) {
		return next(e)
	}
}
