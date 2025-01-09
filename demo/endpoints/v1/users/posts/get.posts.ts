import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object()
}).description("Endpoint returns list of user's posts.")

export const responseSchema = Joi.array().items(
	Joi.object({
		posts: Joi.array().items(
			Joi.object({
				id: Joi.number()
			})
		)
	})
)

export const businessLogic = (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			posts: [
				{
					id: 1
				}
			]
		})
	} catch (e) {
		return next(e)
	}
}
