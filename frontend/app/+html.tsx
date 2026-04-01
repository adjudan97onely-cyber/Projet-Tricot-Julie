// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* === SEO === */}
        <title>Julie Créations — Tricot & Crochet</title>
        <meta name="description" content="Votre assistante experte en tricot et crochet. Patrons, tutoriels, outils et IA." />

        {/* === PWA — Android / Desktop === */}
        <meta name="theme-color" content="#D4AF37" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* === PWA — iOS (Add to Home Screen) === */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Julie 🧶" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/images/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/icon.png" />

        {/* === Splash screens iOS === */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        {/* === Favicon === */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0A0A0A",
        }}
      >
        {children}
      </body>
    </html>
  );
}
