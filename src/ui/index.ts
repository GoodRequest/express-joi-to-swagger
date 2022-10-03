import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { IConfig } from '../parser'

export default (outputPath: string, config: IConfig) =>
	new Promise((resolve, reject) => {
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
