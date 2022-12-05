import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object({
		name: Joi.string().min(1).example('This is name').required(),
		color: Joi.string().valid('BLUE', 'PINK', 'RED').optional(),
		durationFrom: Joi.number().integer().min(0).max(999).optional().allow(null).example(10),
		durationTo: Joi.number().integer().min(Joi.ref('durationFrom')).max(999).optional().allow(null).example(10),
	})
})

export const responseSchema = Joi.object({
	message: Joi.string().min(1).required()
})

export const businessLogic = (req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			message: 'OK'
		})
	} catch (e) {
		return next(e)
	}
}
