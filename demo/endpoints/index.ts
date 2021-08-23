import express from 'express'
import passport from 'passport'
import { permissionMiddleware } from '../middlewares/permissions'
import validationMiddleware from '../middlewares/validationMiddleware'
import { businessLogic, requestSchema } from './users/get.user'
import animalsRouter from './animals/index'

const router = express.Router()

export default () => {
	router.get(
		'/users/:userID',
		passport.authenticate('local'),
		permissionMiddleware(['SUPERADMIN', 'TEST']),
		validationMiddleware(requestSchema),
		businessLogic
	)
	router.use('/animals', animalsRouter())
	return router
}
