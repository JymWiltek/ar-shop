/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@imgly/background-removal'],
  webpack: (config) => {
    // Handle import.meta used by @imgly/background-removal
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules\/@imgly/,
      resolve: { fullySpecified: false },
    })

    // Replace import.meta.url with a browser-compatible shim
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        'import.meta.url': JSON.stringify(''),
      })
    )

    return config
  },
}

module.exports = nextConfig
