const HTMLPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const ManifestVersionSyncPlugin = require('webpack-manifest-version-sync-plugin');

module.exports = {
    entry: {
        devtools: './entries/devtools.ts',
        'devtools-panel': './entries/devtools-panel.tsx',
        content: './entries/content.ts',
        background: './entries/background.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        mainFields: ['source', 'browser', 'module', 'main'],
    },
    module: {
        rules: [
            {
                test: /\.(t|j)sx?$/,
                use: [
                    {
                        loader: 'babel-loader',
                    },
                ],
            },
            {
                test: /\.svg$/,
                use: ['@svgr/webpack'],
            },
        ],
    },
    plugins: [
        new HTMLPlugin({
            chunks: ['devtools'],
            filename: 'devtools.html',
        }),
        new HTMLPlugin({
            chunks: ['devtools-panel'],
            filename: 'devtools-panel.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: './assets', to: './assets' },
                { from: './manifest.json', to: './manifest.json' },
            ],
        }),
        new ManifestVersionSyncPlugin(),
    ].filter(Boolean),
    devtool: false,
    optimization: {
        minimize: false,
    },
    mode: 'production',
    stats: 'minimal',
};
