module.exports = {
	transform: {
		'^.+\\.ts?$': 'ts-jest'
	},
	roots: [
		'<rootDir>/tests/'
	],
	moduleFileExtensions: [
		'ts',
		'js'
	],
	testEnvironment: 'node'
}
