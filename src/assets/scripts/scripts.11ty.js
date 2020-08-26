const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const MemoryFileSystem = require('memory-fs')

const isProd = process.env.ELEVENTY_ENV === 'production'
const mfs = new MemoryFileSystem()

// main entry point name
const ENTRY_FILE_NAME = 'main.js'

module.exports = class {
    // Configure Webpack in Here
    async data() {
        const entryPath = path.join(__dirname, `/${ENTRY_FILE_NAME}`)
        const outputPath = path.resolve(__dirname, '../../memory-fs/js/')

        // Transform .js files, run through Babel
        const rules = [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-transform-runtime']
                    }
                }
            }
        ]

        // pass environment down to scripts
        const envPlugin = new webpack.EnvironmentPlugin({
            ELEVENTY_ENV: process.env.ELEVENTY_ENV
        })

        // Main Config
        const webpackConfig = {
            mode: isProd ? 'production' : 'development',
            entry: entryPath,
            output: { path: outputPath },
            module: { rules },
            plugins: [envPlugin]
        }

        return {
            permalink: `/assets/scripts/${ENTRY_FILE_NAME}`,
            eleventyExcludeFromCollections: true,
            webpackConfig
        }
    }

    // Compile JS with Webpack, write the result to Memory Filesystem.
    compile(webpackConfig) {
        const compiler = webpack(webpackConfig)
        compiler.outputFileSystem = mfs
        compiler.inputFileSystem = fs
        compiler.resolvers.normal.fileSystem = mfs

        return new Promise((resolve, reject) => {
            compiler.run((err, stats) => {
                if (err || stats.hasErrors()) {
                    const errors =
                        err ||
                        (stats.compilation ? stats.compilation.errors : null)

                    reject(errors)
                    return
                }

                const { assets } = stats.compilation
                const file = assets[ENTRY_FILE_NAME].source()

                resolve(file)
            })
        })
    }

    // render the JS file
    async render({ webpackConfig }) {
        try {
            const result = await this.compile(webpackConfig)
            return result
        } catch (err) {
            console.log(err)
            return null
        }
    }
}
