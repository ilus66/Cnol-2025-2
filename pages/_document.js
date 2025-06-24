import * as React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import createEmotionCache from '../utils/createEmotionCache';

const theme = createTheme();

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="fr">
        <Head>
          {/* PWA Manifest */}
          <script type="application/manifest+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "name": "CNOL 2025", "short_name": "CNOL", "description": "Congrès National d'Optique Lunetterie 2025", "start_url": "/", "display": "standalone", "background_color": "#0d47a1", "theme_color": "#1976d2", "orientation": "portrait-primary", "icons": [{ "src": "/logo-cnol.png", "sizes": "192x192", "type": "image/png" }, { "src": "/logo-cnol.png", "sizes": "512x512", "type": "image/png" }] }) }} />
          
          {/* PWA Icons */}
          <link rel="icon" type="image/png" sizes="32x32" href="/logo-cnol.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/logo-cnol.png" />
          <link rel="apple-touch-icon" href="/logo-cnol.png" />
          
          {/* PWA Meta Tags */}
          <meta name="application-name" content="CNOL 2025" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="CNOL 2025" />
          <meta name="description" content="Application officielle du Congrès National d'Optique Lunetterie 2025 à Rabat" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
          <meta name="msapplication-TileColor" content="#0070f3" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#0070f3" />
          
          {/* PWA Splash Screens */}
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
          <link rel="apple-touch-startup-image" href="/splash/apple-splash-640-1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
          
          {/* Preconnect to external domains */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* DNS Prefetch */}
          <link rel="dns-prefetch" href="//otmttpiqeehfquoqycol.supabase.co" />

          {/* Inject MUI styles first */}
          <meta name="emotion-insertion-point" content="" />
          {this.props.emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

MyDocument.getInitialProps = async (ctx) => {
  const originalRenderPage = ctx.renderPage;
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) =>
        function EnhanceApp(props) {
          return <App emotionCache={cache} {...props} />;
        },
    });

  const initialProps = await Document.getInitialProps(ctx);
  const emotionStyles = extractCriticalToChunks(initialProps.html);
  const emotionStyleTags = emotionStyles.styles.map((style) => (
    <style
      data-emotion={`${style.key} ${style.ids.join(' ')}`}
      key={style.key}
      dangerouslySetInnerHTML={{ __html: style.css }}
    />
  ));

  return {
    ...initialProps,
    emotionStyleTags,
  };
}; 