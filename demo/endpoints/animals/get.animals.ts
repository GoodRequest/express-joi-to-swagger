import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object()
})

export const responseSchema = Joi.object({
	animals: Joi.array().items({
		id: Joi.number().integer().min(1).required(),
		name: Joi.string().min(1).required(),
		color: Joi.string().valid('BLUE', 'PINK', 'RED').optional()
	})
})

export const businessLogic = (req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			animals: [{
				id: 1,
				name: 'Monkey',
				color: 'PINK'
			}, {
				id: 2,
				name: 'Dog'
			}]
		})
	} catch (e) {
		return next(e)
	}
}
