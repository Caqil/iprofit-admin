import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import { RootProvider } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FinTech Platform",
    template: "%s | FinTech Platform",
  },
  description:
    "A comprehensive financial technology platform for modern banking and investment solutions.",
  keywords: [
    "fintech",
    "banking",
    "investment",
    "loans",
    "financial services",
    "digital banking",
    "money management",
  ],
  authors: [
    {
      name: "FinTech Platform Team",
      url: "https://fintechplatform.com",
    },
  ],
  creator: "FinTech Platform",
  publisher: "FinTech Platform",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "FinTech Platform",
    title: "FinTech Platform - Modern Financial Solutions",
    description:
      "A comprehensive financial technology platform for modern banking and investment solutions.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FinTech Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FinTech Platform - Modern Financial Solutions",
    description:
      "A comprehensive financial technology platform for modern banking and investment solutions.",
    images: ["/og-image.jpg"],
    creator: "@fintechplatform",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  category: "Finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, geist.variable, "scroll-smooth")}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-inter antialiased",
          "selection:bg-primary/20 selection:text-primary-foreground"
        )}
        suppressHydrationWarning
      >
        <RootProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </RootProvider>

        {/* Prevent FOUC (Flash of Unstyled Content) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </body>
    </html>
  );
}
