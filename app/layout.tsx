import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = `${protocol}://${host}`;
  return {
    metadataBase: new URL(siteUrl),
    title: "Assetly | 자산관리 자동화",
    description: "Google Sheets 기준 데이터와 자산 정보를 자동으로 검증하고 기록합니다.",
    openGraph: { title: "Assetly", description: "자산 확인, 더 빠르고 정확하게", images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "Assetly", description: "자산 확인, 더 빠르고 정확하게", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={geist.variable}>{children}</body></html>;
}