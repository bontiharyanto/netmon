"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/components/layout/locale-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LocaleProvider>
          {children}
          <Toaster theme="dark" position="top-right" />
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
