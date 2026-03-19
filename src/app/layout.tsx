import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/theme-color-provider";
import { SessionProvider } from "@/components/session-provider";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { FaviconUpdater } from "@/components/favicon-updater";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agent Studio",
    template: "%s | Agent Studio",
  },
  description: "Build and manage AI agents with ease",
  keywords: ["AI", "agents", "automation", "workflow"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        {/* DM Sans for Zenith theme (weights 300/400/700) */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        {/* Inline script runs before React — cannot import COLOR_THEMES. Keep the theme list below in sync with src/lib/themes.ts when adding new themes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("agent-studio-color-theme");if(t==="lingon"||t==="fjord"||t==="skog"||t==="zenith"){document.documentElement.setAttribute("data-theme",t)}else{document.documentElement.setAttribute("data-theme","lingon")}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthErrorBoundary>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ColorThemeProvider>
                <FaviconUpdater />
                {children}
                <Toaster />
              </ColorThemeProvider>
            </ThemeProvider>
          </SessionProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
