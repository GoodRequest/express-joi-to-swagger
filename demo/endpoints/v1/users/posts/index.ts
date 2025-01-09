import express from 'express'
import { validationMiddleware } from '../../../../middlewares/validationMiddleware'
import * as getPosts from './get.posts'

const router = express.Router()

export default () => {
	router.get('/', validationMiddleware(getPosts.requestSchema), getPosts.businessLogic)

	return router
}
