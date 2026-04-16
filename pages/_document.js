import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh">
      <Head>
        {/* model-viewer: handles AR on Android (Scene Viewer) and iOS (AR Quick Look) */}
        <script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
        />
        {/* Tailwind CDN for rapid PoC styling */}
        <script src="https://cdn.tailwindcss.com" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
