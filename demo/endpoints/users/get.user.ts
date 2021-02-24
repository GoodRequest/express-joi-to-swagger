import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'

export const requestSchema = Joi.object({
	params: Joi.object({
		userID: Joi.number()
	}),
	query: Joi.object({
		search: Joi.string().required()
	}),
	body: Joi.object({
		name: Joi.string().required()
	})
})

export const responseSchema = Joi.object({
	user: Joi.object({
		id: Joi.number(),
		name: Joi.string(),
		surname: Joi.string()
	}),
})

export const businessLogic = (req: Request, res: Response, next: NextFunction) => {
	try {
		const { userID } = req.params
		return res.json({
			user: {
				id: userID,
				name: 'John',
				surname: 'Snow'
			}
		})
	} catch (e) {
		return next(e)
	}
}
