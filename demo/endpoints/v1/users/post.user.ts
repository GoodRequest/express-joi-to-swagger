import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	body: Joi.object({
		name: Joi.string().required(),
		surname: Joi.string().required()
	}).meta({ className: 'CreateUserSchema' })
})

export const responseSchema = Joi.object({
	id: Joi.number().integer().required()
}).description('201')

export const errorResponseSchemas = [
	Joi.object({
		messages: Joi.array().items(
			Joi.object({
				type: Joi.string().required(),
				message: Joi.string().required().example('Not found')
			})
		)
	}).description('404'),
	Joi.object({
		messages: Joi.array().items(
			Joi.object({
				type: Joi.string().required(),
				message: Joi.string().required().example('Conflict')
			})
		)
	}).description('409')
]

export const businessLogic = (req: Request, res: Response, next: NextFunction) => {
	try {
		return res.json({
			id: 1
		})
	} catch (e) {
		return next(e)
	}
}
