import express from 'express'
import { permissionMiddleware } from '../middlewares/permissions'
import validationMiddleware from '../middlewares/validationMiddleware'
import { businessLogic, requestSchema } from './users/get.user'

const router = express.Router()

export default () => {
	router.get(
		'/users/:userID',
		permissionMiddleware(['SUPERADMIN', 'TEST']),
		validationMiddleware(requestSchema),
		businessLogic
	)

	return router
}
