import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1LiCy1EMhT2-nO4S15ymDtD4OR96Rzk_BZYdcQTtnajg/edit?gid=0#gid=0";
type AssetPayload = { team?: unknown; name?: unknown; asset?: unknown; assetNumber?: unknown };

function configuration() {
  return { endpoint: process.env.GOOGLE_SHEETS_WEB_APP_URL?.trim(), token: process.env.GOOGLE_SHEETS_TOKEN?.trim() };
}
function clean(value: unknown, field: string) {
  if (typeof value !== "string") throw new Error(`${field} 값이 올바르지 않습니다.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) throw new Error(`${field} 값을 확인해 주세요.`);
  return normalized;
}
async function parseGoogleResponse(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error("Google Sheets 응답을 받지 못했습니다.");
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error("Google Sheets 응답 형식이 올바르지 않습니다."); }
}

export async function GET() {
  const { endpoint, token } = configuration();
  if (!endpoint || !token) return NextResponse.json({ connected: false, count: 0, sheetUrl: SHEET_URL, message: "Google Sheets 연결 설정이 필요합니다." }, { status: 503 });
  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "status");
    url.searchParams.set("token", token);
    const data = await parseGoogleResponse(await fetch(url, { cache: "no-store", redirect: "follow" }));
    if (data.ok !== true) throw new Error(typeof data.error === "string" ? data.error : "연결을 확인할 수 없습니다.");
    return NextResponse.json({ connected: true, count: Number(data.count ?? 0), updatedAt: data.updatedAt, sheetUrl: SHEET_URL });
  } catch (error) {
    return NextResponse.json({ connected: false, count: 0, sheetUrl: SHEET_URL, message: error instanceof Error ? error.message : "연결 오류가 발생했습니다." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const { endpoint, token } = configuration();
  if (!endpoint || !token) return NextResponse.json({ message: "Google Sheets 연결 설정이 필요합니다." }, { status: 503 });
  try {
    const body = (await request.json()) as AssetPayload;
    const payload = { action: "validate", token, team: clean(body.team, "팀"), name: clean(body.name, "이름"), asset: clean(body.asset, "자산"), assetNumber: clean(body.assetNumber, "자산 번호").toUpperCase() };
    const data = await parseGoogleResponse(await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), cache: "no-store", redirect: "follow" }));
    if (data.ok !== true) throw new Error(typeof data.error === "string" ? data.error : "검증에 실패했습니다.");
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "검증 중 오류가 발생했습니다.";
    const status = message.includes("확인해") || message.includes("올바르지") ? 400 : 502;
    return NextResponse.json({ message }, { status });
  }
}