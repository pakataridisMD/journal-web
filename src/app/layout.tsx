import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { ArtDefs } from "@/components/art/art-defs";
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

/** Interface sans: a newspaper grotesque, sturdy at small sizes. */
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
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
  themeColor: "#f8f6f1",
  colorScheme: "light",
};

/** Clerk's components wear the journal's tokens (square, ink, no shadow). */
const clerkAppearance = {
  variables: {
    colorPrimary: "#161512",
    colorPrimaryForeground: "#fffefb",
    colorForeground: "#161512",
    colorMutedForeground: "#67625a",
    colorBackground: "#fffefb",
    colorInput: "#fffefb",
    colorBorder: "#8f887c",
    colorRing: "#161512",
    colorDanger: "#b42318",
    colorShadow: "transparent",
    borderRadius: "0px",
    fontFamily: "var(--font-schibsted), ui-sans-serif, system-ui, sans-serif",
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
        className={`${newsreader.variable} ${schibsted.variable} ${plexMono.variable}`}
      >
        <body className="flex min-h-dvh flex-col">
          <ArtDefs />
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
