import express from 'express'
import usersRouter from './users'
import animalsRouter from './animals'

const router = express.Router()

export default () => {
	router.use('/users', usersRouter())
	router.use('/animals', animalsRouter())

	return router
}
