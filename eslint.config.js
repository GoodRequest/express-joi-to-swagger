const js = require('@eslint/js')
const { FlatCompat } = require('@eslint/eslintrc')
const tseslint = require('typescript-eslint')
const prettierRecommended = require('eslint-plugin-prettier/recommended')
const globals = require('globals')

// airbnb configs are eslintrc-only, so they are translated to flat config via FlatCompat.
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended
})

const tsPluginRules = tseslint.plugin.rules

const airbnbConfigs = compat.extends('airbnb-base', 'airbnb-typescript/base').map((config) => {
	if (config.plugins && config.plugins['@typescript-eslint']) {
		config.plugins['@typescript-eslint'] = tseslint.plugin
	}
	if (config.rules) {
		Object.keys(config.rules).forEach((ruleName) => {
			if (ruleName.startsWith('@typescript-eslint/')) {
				const ruleKey = ruleName.slice('@typescript-eslint/'.length)
				if (!tsPluginRules[ruleKey]) {
					delete config.rules[ruleName]
				}
			}
		})
	}
	return config
})

module.exports = [
	{
		ignores: ['**/node_modules/**', '**/dist/**']
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...airbnbConfigs,
	prettierRecommended,
	{
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...globals.node,
				...globals.es2024
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname
			}
		},
		linterOptions: {
			reportUnusedDisableDirectives: true
		},
		rules: {
			'no-shadow': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-shadow': ['error'],
			'@typescript-eslint/no-floating-promises': 'error'
		}
	},
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	}
]
