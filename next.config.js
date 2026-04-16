/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Treat @imgly/background-removal as native ESM so import.meta works
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@imgly\/background-removal/,
      type: 'javascript/esm',
    })

    // Don't attempt to bundle WASM on server side
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean)
      config.externals = [...externals, '@imgly/background-removal']
    }

    // Required for WASM
    config.experiments = { ...config.experiments, asyncWebAssembly: true }

    return config
  },
}

module.exports = nextConfig
