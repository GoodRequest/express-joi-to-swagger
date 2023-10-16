import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'
import { userSchema } from './get.user'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object()
}).description('@deprecated Endpoint returns list of users.')

export const responseSchema = Joi.array().items(
	Joi.object({
		users: userSchema
	})
)

export const businessLogic = (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			users: [
				{
					id: 1,
					name: 'John',
					surname: 'Snow'
				}
			]
		})
	} catch (e) {
		return next(e)
	}
}
