import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CreateFileWebpack from 'create-file-webpack'

import { IGenerateSwaggerConfig } from '../types/interfaces'

export default (outputPath: string, config: IGenerateSwaggerConfig) =>
	new Promise((resolve, reject) => {
		const archiveJson = [{ name: config.swaggerInitInfo?.info?.version || 'apidoc', url: 'data.json' }]
		webpack(
			{
				mode: 'development',
				entry: {
					app: path.join(__dirname, 'src.tsx')
				},
				module: {
					rules: [
						{
							test: /\.css$/i,
							use: ['style-loader', 'css-loader']
						},
						{
							test: /\.tsx?$/,
							use: 'ts-loader',
							exclude: /node_modules/
						}
					]
				},
				resolve: {
					extensions: ['.tsx', '.ts', '.js'],
					alias: {
						stream: 'stream-browserify',
						react: path.resolve(__dirname, '..', '..', 'node_modules', 'react')
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
						APP_VERSION: config.swaggerInitInfo?.info?.version ? JSON.stringify(config.swaggerInitInfo.info.version) : undefined
					})
				],
				output: {
					filename: '[name].[contenthash].bundle.js',
					path: outputPath,
					clean: true
				}
			},
			(err, info) => {
				if (err) {
					return reject(err)
				}
				return resolve(info)
			}
		)
	})
