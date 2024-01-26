import express from 'express'
import animalsRouter from './animals'
import usersRouter from './users'

const router = express.Router()

export default () => {
	router.use('/animals', animalsRouter())
	router.use('/users', usersRouter())

	return router
}
