module.exports = {
	extends: ['@goodrequest/eslint-config-typescript'],
	parserOptions: {
		project: 'tsconfig.eslint.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module'
	}
}
