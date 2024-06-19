import express from 'express'

import endpoints from './endpoints'

const app = express()

app.use('/api', endpoints())

export default app
