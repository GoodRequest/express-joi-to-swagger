declare module 'create-file-webpack' {
	import { Compiler } from 'webpack'

	class CreateFilePlugin {
		constructor(options: CreateFilePlugin.IOptions)

		/**
		 * Apply the plugin
		 */
		apply(compiler: Compiler): void
	}

	namespace CreateFilePlugin {
		interface IOptions {
			path: string
			fileName: string
			content: string
		}
	}

	export = CreateFilePlugin
}
