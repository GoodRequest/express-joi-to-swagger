import { Compiler } from 'webpack'

declare class CreateFilePlugin {
	constructor(options: CreateFilePlugin.IOptions)

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void
}

export = CreateFilePlugin

declare namespace CreateFilePlugin {
	interface IOptions {
		path: string
		fileName: string
		content: string
	}
}
