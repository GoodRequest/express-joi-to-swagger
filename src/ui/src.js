import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

import spec from './data.json'

SwaggerUI({
	spec,
	dom_id: '#swagger'
})
