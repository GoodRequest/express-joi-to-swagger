import { trim, every } from 'lodash'

import { SwaggerUIBundle, SwaggerUIStandalonePreset } from 'swagger-ui-dist'
import 'swagger-ui-dist/swagger-ui.css'

const AdvancedFilterPlugin = () => ({
	fn: {
		opsFilter: (taggedOps, phrase) => {
			const normPhrases = trim(phrase)
				.toLowerCase()
				.split(' ')
				.filter((v) => !!v)
				.map((v) => trim(v))

			const filteredData = taggedOps
				.map((entities) => {
					const newentities = entities.map((entity, key) => {
						if (key === 'operations') {
							const operations = entity.filter((operation) => {
								const hasEvery = every(normPhrases, (normPhrase) => {
									// search on path
									const path = operation.get('path').toLowerCase().indexOf(normPhrase) !== -1

									// search on tags
									const tags = operation
										.get('operation')
										.get('tags')
										.filter((tag) => tag.toLowerCase().indexOf(normPhrase) !== -1)

									if (!path && tags.size <= 0) {
										return false
									}
									return true
								})
								return hasEvery
							})
							return operations
						}
						return entity
					})
					return newentities
				})
				.filter((entities) => !(entities.get('operations').size <= 0))

			return filteredData
		}
	}
})

// eslint-disable-next-line no-undef, no-void
void fetch(`archive.json?v=${APP_VERSION}`)
	.then((response) => response.json())
	.then((data) => {
		SwaggerUIBundle({
			dom_id: '#swagger',
			filter: true,
			deepLinking: true,
			layout: 'StandaloneLayout', // NOTE: turn on for topbar
			operationsSorter: 'alpha',
			onComplete: () => {
				// NOTE: workaround for expand schema after page is loaded just first level https://github.com/swagger-api/swagger-ui/issues/6494
				// eslint-disable-next-line no-undef
				document.querySelectorAll('#swagger button.model-box-control[aria-expanded="false"]').forEach((btn) => btn.click())
			},
			plugins: [AdvancedFilterPlugin, SwaggerUIBundle.plugins.DownloadUrl],
			presets: [
				SwaggerUIBundle.presets.apis,
				SwaggerUIStandalonePreset // // NOTE: turn on for topbar
			],
			urls: data,
			'urls.primaryName': data?.[0]?.name // default spec
		})
	})
