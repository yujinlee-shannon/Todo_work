import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "ONE STEP — 오늘의 할 일",
    description: "해야 할 일을 가볍게 기록하고 하나씩 완료하는 나만의 투두 리스트",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "ONE STEP — 오늘의 할 일",
      description: "오늘 할 일을 가볍게 기록하고 하나씩 완료해 보세요.",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "ONE STEP 투두 리스트" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ONE STEP — 오늘의 할 일",
      description: "오늘 할 일을 가볍게 기록하고 하나씩 완료해 보세요.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}

