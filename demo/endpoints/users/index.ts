import express from 'express'
import passport from 'passport'
import { permissionMiddleware } from '../../middlewares/permissions'
import validationMiddleware from '../../middlewares/validationMiddleware'
import * as getUsers from './get.users'
import * as getUser from './get.user'

const router = express.Router()

export default () => {
	router.get(
		'/users',
		validationMiddleware(getUsers.requestSchema),
		getUsers.businessLogic
	)

	router.get(
		'/users/:userID',
		passport.authenticate('local'),
		permissionMiddleware(['SUPERADMIN', 'TEST']),
		validationMiddleware(getUser.requestSchema),
		getUser.businessLogic
	)

	router.get(
		'/users/:userID/dashboard',
		validationMiddleware(getUser.requestSchema),
		getUser.businessLogic
	)

	return router
}
