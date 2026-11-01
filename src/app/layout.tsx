import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { journal } from "@/config/journal";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${journal.name} · ${journal.tagline}`, template: `%s · ${journal.name}` },
  description: journal.description,
  applicationName: journal.name,
  openGraph: { siteName: journal.name, type: "website", locale: "en_US" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

/** Clerk's components wear the journal's tokens (square, black, no shadow). */
const clerkAppearance = {
  variables: {
    colorPrimary: "#0a0a0a",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#0a0a0a",
    colorMutedForeground: "#6e6e6e",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorBorder: "#8c8c8c",
    colorRing: "#0a0a0a",
    colorDanger: "#b42318",
    colorShadow: "transparent",
    borderRadius: "0px",
    fontFamily: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html
        lang="en"
        className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}
      >
        <body className="flex min-h-dvh flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
