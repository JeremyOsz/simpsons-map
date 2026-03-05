import type { Metadata } from "next";
import { AppQueryProvider } from "@app/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simpsons Country Mentions Explorer",
  description: "Explore country mentions across The Simpsons."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
