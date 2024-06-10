import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object(),
	query: Joi.object(),
	body: Joi.alternatives().try(
		Joi.object({
			name: Joi.string().min(1).required(),
			animalFamily: Joi.string().valid('CANINE').invalid('FELINE').required(),
			barkType: Joi.string().valid('WOOF', 'BARK', 'AWOO').required()
		}),
		Joi.object({
			name: Joi.string().min(1).required(),
			animalFamily: Joi.string().valid('FELINE').invalid('CANINE').required(),
			meowType: Joi.string().valid('PURR', 'MEOW', 'HISS').required()
		})
	)
})

export const responseSchema = Joi.object({
	message: Joi.string().min(1).required()
})

export const businessLogic = (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			message: 'OK'
		})
	} catch (e) {
		return next(e)
	}
}
