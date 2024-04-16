module.exports = {
	extends: ['@goodrequest/eslint-config-typescript'],
	parserOptions: {
		project: 'tsconfig.eslint.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module'
	},
	overrides: [
		{
			files: ['*.ts'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'warn'
			}
		}
	]
}
