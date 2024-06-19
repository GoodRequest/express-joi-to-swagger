import express from 'express'
import v1Router from './v1'
import v2Router from './v2'

const router = express.Router()

export default () => {
	router.use('/v1', v1Router())
	router.use('/v2', v2Router())

	return router
}
