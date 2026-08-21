import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NETMON — Your Network, Always On",
  description: "Enterprise network visibility. On-premise and Cloud SaaS.",
  metadataBase: new URL(process.env.APP_URL || "https://netmon.click"),
  icons: {
    icon: "/brand/net-mark.svg",
    apple: "/brand/net-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
