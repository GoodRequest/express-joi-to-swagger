import express from 'express'
import passport from 'passport'
import permissionMiddleware from '../../../middlewares/permissionMiddleware'
import { validationMiddleware } from '../../../middlewares/validationMiddleware'
import * as getUsers from './get.users'
import * as getUser from './get.user'
import * as postUser from './post.user'

const router = express.Router()

export default () => {
	router.get('/', validationMiddleware(getUsers.requestSchema), getUsers.businessLogic)

	router.get('/:userID', passport.authenticate('local'), permissionMiddleware(['SUPERADMIN', 'TEST']), validationMiddleware(getUser.requestSchema), getUser.businessLogic)

	router.get('/:userID/dashboard/', validationMiddleware(getUser.requestSchema), getUser.businessLogic)

	router.post('/', validationMiddleware(postUser.requestSchema), postUser.businessLogic)

	return router
}
