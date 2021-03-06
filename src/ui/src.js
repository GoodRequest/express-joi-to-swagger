import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

import spec from './data.json'

const CaseInsensitiveFilterPlugin = () => ({
	fn: {
		opsFilter: (taggedOps, phrase) => taggedOps.filter((tagObj, tag) => tag.toLowerCase().indexOf(phrase.toLowerCase()) !== -1)
	}
})

SwaggerUI({
	spec,
	dom_id: '#swagger',
	filter: true,
	plugins: [CaseInsensitiveFilterPlugin]
})
