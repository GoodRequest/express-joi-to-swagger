import webpack from 'webpack'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'

export default (outputPath: string) =>
	new Promise((resolve, reject) => {
		webpack(
			{
				mode: 'development',
				entry: {
					app: path.join(__dirname, 'src.js')
				},
				module: {
					rules: [
						{
							test: /\.json$/,
							type: 'json'
						},
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
						stream: require.resolve('stream-browserify')
					}
				},
				plugins: [
					new HtmlWebpackPlugin({
						template: path.join(__dirname, 'index.html')
					}),
					new webpack.ProvidePlugin({
						Buffer: ['buffer', 'Buffer']
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
