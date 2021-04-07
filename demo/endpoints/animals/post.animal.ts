import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.object({
		name: Joi.string().min(1).required(),
		color: Joi.string().valid('BLUE', 'PINK', 'RED').optional()
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
