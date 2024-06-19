import express from 'express'
import passport from 'passport'
import { validationMiddleware } from '../../middlewares/validationMiddleware'
import permissionMiddleware from '../../middlewares/permissionMiddleware'
import * as getUsers from './get.users'
import * as getUser from './get.user'
import * as postUser from './post.user'

const router = express.Router()

export default () => {
	router.get('/', validationMiddleware(getUsers.requestSchema), getUsers.businessLogic)

	router.get(
		'/:userID',
		passport.authenticate('local'),
		permissionMiddleware({ admin: { allowedPermissions: ['SUPERADMIN', 'TRIAL_ADMIN'] }, user: { allowedPermissions: ['SUPERUSER', 'COMMON_USER'] } }),
		validationMiddleware(getUser.requestSchema),
		getUser.businessLogic
	)

	router.get('/:userID/dashboard', validationMiddleware(getUser.requestSchema), getUser.businessLogic)

	router.post('/', validationMiddleware(postUser.requestSchema), postUser.businessLogic)

	return router
}
