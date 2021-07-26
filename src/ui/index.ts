import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'

export default (outputPath: string) => new Promise((resolve, reject) => {
	webpack({
		mode: 'production',
		entry: {
			app: path.join(__dirname, 'src.js'),
		},
		module: {
			rules: [
				{
					test: /\.json$/,
					loader: 'json-loader',
					type: 'javascript/auto'
				},
				{
					test: /\.css$/,
					use: [
						{ loader: 'style-loader' },
						{ loader: 'css-loader' },
					]
				}
			]
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: path.join(__dirname, 'index.html')
			})
		],
		output: {
			filename: '[name].[contenthash].bundle.js',
			path: outputPath,
			clean: true
		}
	}, (err: any, info: any) => {
		if (err) {
			return reject(err)
		}
		return resolve(info)
	})
})
