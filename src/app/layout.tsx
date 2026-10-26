import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/theme-color-provider";
import { SessionProvider } from "@/components/session-provider";
import { SessionGuard } from "@/components/session-guard";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { FaviconUpdater } from "@/components/favicon-updater";
import { cookies } from "next/headers";
import { CURRENT_TENANT_COOKIE } from "@/lib/api/with-tenant";
import { DEFAULT_FAVICON, tenantFaviconProxyUrl } from "@/lib/tenant/favicon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Self-hosted via next/font (no external <link> to fonts.googleapis.com).
// DM Sans powers the Zenith theme; weights 300/400/700.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

// Inter powers the Gaia theme; weights 400/500/600/700.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Agent Studio",
    template: "%s | Agent Studio",
  },
  description: "Build and manage AI agents with ease",
  keywords: ["AI", "agents", "automation", "workflow"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Put the current tenant's icon in the page from the start, so the tab
  // doesn't show the default icon first and then switch. With no tenant
  // selected, the default icon is used. The favicon route also falls back to
  // the default icon when the user isn't logged in.
  const tenantId = (await cookies()).get(CURRENT_TENANT_COOKIE)?.value;
  const faviconHref = tenantId ? tenantFaviconProxyUrl(tenantId) : DEFAULT_FAVICON;

  // Read at request time (this layout is dynamic because of cookies()), so the
  // value can be changed per deployment without rebuilding the image.
  const parsedIdle = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 30);
  const idleTimeoutMinutes = Number.isFinite(parsedIdle) && parsedIdle >= 0 ? parsedIdle : 30;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href={faviconHref}
          type={faviconHref === DEFAULT_FAVICON ? "image/svg+xml" : undefined}
        />
        {/* Inline script runs before React — cannot import COLOR_THEMES. Keep the theme list below in sync with src/lib/themes.ts when adding new themes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("agent-studio-color-theme");if(t==="lingon"||t==="fjord"||t==="skog"||t==="zenith"||t==="gaia"){document.documentElement.setAttribute("data-theme",t)}else{document.documentElement.setAttribute("data-theme","lingon")}})();`,
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
                <SessionGuard idleTimeoutMinutes={idleTimeoutMinutes} />
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
