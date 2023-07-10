const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
    const production = (argv.mode && argv.mode === 'production') ? true : false;
    console.log('\033[0mMODE \033[0;32m' + argv.mode + '\n');

    return {
        // mode specified in package.json scripts
        entry: {
            'nostr-postr-trigger': [path.resolve(__dirname, '.build/trigger/index.js')],
            'nostr-postr': [path.resolve(__dirname, '.build/nostr-postr/index.js'), path.resolve(__dirname, '.build/nostr-postr/index.scss')]
        },
        watch: !production,
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000,
            ignored: [path.resolve(__dirname, 'node_modules/'), path.resolve(__dirname, 'vendor/')],
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'assets/scripts'),
        },
        resolve: {
            extensions: ['.js', '.jsx', '.scss']
        },
        module: {
            rules: [{
                test: /\.jsx$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                        plugins: [
                            ["@babel/plugin-transform-runtime"],
                            [
                                "@babel/plugin-transform-react-jsx",
                            ],
                        ]
                    }
                }
            }, {
                test: /\.s[ac]ss$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    {
                        loader: "sass-loader",
                    },
                ],
            }]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: "../styles/[name].css"
            })
        ],
        externals: {
            'react': 'React',
            'react-dom': 'ReactDOM'
        },
        devtool: false
    }
}