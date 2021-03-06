import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'

import spec from './data.json'

const CaseInsensitiveFilterPlugin = () => ({
	fn: {
		opsFilter: (taggedOps, phrase) => taggedOps.filter((tagObj, tag) => tag.toLowerCase().indexOf(phrase.toLowerCase()) !== -1)
	}
})

/* eslint-disable */
const AdvancedFilterPlugin = (system) => ({
	fn: {
		opsFilter: (taggedOps, phrase) => {
			phrase = phrase.toLowerCase()
			const normalTaggedOps = JSON.parse(JSON.stringify(taggedOps))
			for (tagObj in normalTaggedOps) {
				const operations = normalTaggedOps[tagObj].operations
				const i = operations.length;
				while (i--) {
					const operation = operations[i].operation
				if ((operations[i].path.toLowerCase().indexOf(phrase) === -1)
					&& (operation.summary.toLowerCase().indexOf(phrase) === -1)
					&& (operation.description.toLowerCase().indexOf(phrase) === -1)
				) {
					operations.splice(i, 1)
				}
				}
				if (operations.length == 0 ) {
					delete normalTaggedOps[tagObj]
				}
				else {
					normalTaggedOps[tagObj].operations = operations;
				}
			}

			return system.Im.fromJS(normalTaggedOps);
			}
		}
	})

/* eslint-enable */

SwaggerUI({
	spec,
	dom_id: '#swagger',
	filter: true,
	plugins: [CaseInsensitiveFilterPlugin]
})
