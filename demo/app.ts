import express from 'express'

import endpoints from './endpoints'

const app = express()

app.use('/api/v1', endpoints())

export default app
