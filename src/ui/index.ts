import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CreateFileWebpack from 'create-file-webpack'
import { IConfig } from '../parser'

export default (outputPath: string, config: IConfig) =>
	new Promise((resolve, reject) => {
		const archiveJson = [{ name: config.swaggerInitInfo.info?.version || 'apidoc', url: 'data.json' }]
		webpack(
			{
				mode: 'production',
				entry: {
					app: path.join(__dirname, 'src.js')
				},
				module: {
					rules: [
						{
							test: /\.css$/i,
							use: ['style-loader', 'css-loader']
						}
					]
				},
				resolve: {
					alias: {
						stream: 'stream-browserify'
					},
					fallback: {
						fs: false,
						path: false,
						stream: require.resolve('stream-browserify')
					}
				},
				plugins: [
					new HtmlWebpackPlugin({
						template: path.join(__dirname, 'index.html')
					}),
					new webpack.ProvidePlugin({
						Buffer: ['buffer', 'Buffer']
					}),
					new CreateFileWebpack({
						path: outputPath,
						fileName: 'archive.json',
						content: JSON.stringify(archiveJson)
					}),
					new webpack.DefinePlugin({
						APP_VERSION: config.swaggerInitInfo.info?.version ? JSON.stringify(config.swaggerInitInfo.info?.version) : undefined
					})
				],
				output: {
					filename: '[name].[contenthash].bundle.js',
					path: outputPath,
					clean: true
				}
			},
			(err: any, info: any) => {
				if (err) {
					return reject(err)
				}
				return resolve(info)
			}
		)
	})
