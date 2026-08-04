import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "ONE STEP — 나의 업무 보드",
    description: "할 일, 진행 중, 완료 상태로 업무 흐름을 한눈에 관리하는 개인 업무 보드",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "ONE STEP — 나의 업무 보드",
      description: "오늘의 업무를 한눈에 확인하고 다음 단계로 이동하세요.",
      images: [{ url: `${origin}/og-board.png`, width: 1659, height: 948, alt: "ONE STEP 나의 업무 보드" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ONE STEP — 나의 업무 보드",
      description: "오늘의 업무를 한눈에 확인하고 다음 단계로 이동하세요.",
      images: [`${origin}/og-board.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}

