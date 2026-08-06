"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AssetForm = { team: string; name: string; asset: string; assetNumber: string };
type ValidationStatus = "일치" | "불일치" | "대상 없음";
type Activity = AssetForm & { id: number; checkedAt: string; status: ValidationStatus };
type SheetState = { checking: boolean; connected: boolean; count: number; updatedAt?: string; sheetUrl: string; message?: string };
type ValidationResult = { status: ValidationStatus | "오류"; message: string; expectedAsset?: string | null; expectedAssetNumber?: string | null };

const initialForm: AssetForm = { team: "", name: "", asset: "", assetNumber: "" };
const sheetUrl = "https://docs.google.com/spreadsheets/d/1LiCy1EMhT2-nO4S15ymDtD4OR96Rzk_BZYdcQTtnajg/edit?gid=0#gid=0";
const sampleAsset: AssetForm = { team: "AI비즈솔루션팀", name: "홍길동", asset: "PC", assetNumber: "PC-001" };

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span>A</span></span>; }

export default function Home() {
  const [form, setForm] = useState<AssetForm>(initialForm);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ checking: true, connected: false, count: 0, sheetUrl });
  const isComplete = useMemo(() => Object.values(form).every((value) => value.trim().length > 0), [form]);

  useEffect(() => {
    let active = true;
    fetch("/api/assets", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        setSheet({ checking: false, connected: response.ok && data.connected === true, count: Number(data.count ?? 0), updatedAt: data.updatedAt, sheetUrl: data.sheetUrl ?? sheetUrl, message: data.message });
      })
      .catch(() => active && setSheet({ checking: false, connected: false, count: 0, sheetUrl, message: "연결 상태를 확인하지 못했습니다." }));
    return () => { active = false; };
  }, []);

  function updateField(field: keyof AssetForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setResult(null);
    const payload = { ...form, assetNumber: form.assetNumber.trim().toUpperCase() };
    try {
      const response = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "검증 요청을 완료하지 못했습니다.");
      const status = data.status as ValidationStatus;
      const expected = data.expectedAsset && data.expectedAssetNumber ? `기준 정보: ${data.expectedAsset} · ${data.expectedAssetNumber}` : undefined;
      setResult({
        status,
        message: status === "일치" ? "기준 데이터와 일치하며 결과가 시트에 기록되었습니다." : status === "불일치" ? `등록된 정보와 다릅니다. ${expected ?? "입력값을 확인해 주세요."}` : "해당 팀과 이름을 기준표에서 찾지 못했습니다. 검증기록 시트에 남겼습니다.",
        expectedAsset: data.expectedAsset,
        expectedAssetNumber: data.expectedAssetNumber,
      });
      const entry: Activity = { id: Date.now(), ...payload, checkedAt: data.checkedAt ? String(data.checkedAt).slice(5) : "방금 전", status };
      setActivities((current) => [entry, ...current].slice(0, 5));
    } catch (error) {
      setResult({ status: "오류", message: error instanceof Error ? error.message : "검증 중 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  function fillSample() { setForm(sampleAsset); setResult(null); }
  function resetForm() { setForm(initialForm); setResult(null); }
  const connectedLabel = sheet.checking ? "연결 확인 중" : sheet.connected ? "Google Sheets 연결됨" : "Google Sheets 설정 필요";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><BrandMark /><span className="brand-name">Assetly</span></div>
        <div className="header-actions"><div className={`sync-pill ${sheet.connected ? "" : "offline"}`}><span className="sync-dot" />{connectedLabel}</div><button className="avatar" aria-label="내 계정">YL</button></div>
      </header>
      <section className="workspace">
        <aside className="sidebar" aria-label="주요 메뉴">
          <nav>
            <a className="nav-item active" href="#register"><span className="nav-icon">＋</span>자산 등록</a>
            <a className="nav-item" href="#history"><span className="nav-icon">⌕</span>검증 기록</a>
            <a className="nav-item" href="#source"><span className="nav-icon">▦</span>기준 데이터</a>
          </nav>
          <div className="sidebar-bottom">
            <a className="nav-item" href="#help"><span className="nav-icon">?</span>도움말</a>
            <div className="sheet-mini">
              <div className="sheet-mini-title"><span className="sheet-icon">S</span><div><b>2026 자산 관리 현황</b><small>{sheet.connected ? "실시간 연결" : "연결 설정 필요"}</small></div></div>
              <div className="sheet-mini-row"><span>기준 데이터</span><b>{sheet.checking ? "—" : `${sheet.count}개`}</b></div>
            </div>
          </div>
        </aside>
        <div className="content">
          <section className="intro" id="register">
            <div><span className="eyebrow">ASSET VERIFICATION</span><h1>자산 정보를 확인해 주세요</h1><p>입력한 정보를 2026 인크로스 자산 관리 현황과 대조하고, 결과를 같은 시트에 자동 기록합니다.</p></div>
            <div className="flow-indicator" aria-label="현재 검증 단계">
              <div className="flow-step current"><span>1</span><div><b>정보 입력</b><small>사용자 자산 정보</small></div></div><span className="flow-line" />
              <div className="flow-step"><span>2</span><div><b>자동 검증</b><small>시트 데이터 대조</small></div></div><span className="flow-line" />
              <div className="flow-step"><span>3</span><div><b>결과 기록</b><small>F·G열 자동 저장</small></div></div>
            </div>
          </section>
          <section className="main-grid">
            <form className="form-card" onSubmit={handleSubmit}>
              <div className="card-heading"><div><span className="section-number">01</span><h2>기본 정보</h2></div><button type="button" className="text-button" onClick={fillSample}>시트 예시 채우기</button></div>
              <div className="field-grid">
                <label className="field"><span>팀 이름 <em>*</em></span><div className="input-wrap"><span className="input-glyph">T</span><input value={form.team} onChange={(e) => updateField("team", e.target.value)} placeholder="예: AI비즈솔루션팀" required /></div></label>
                <label className="field"><span>이름 <em>*</em></span><div className="input-wrap"><span className="input-glyph">P</span><input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="예: 홍길동" required /></div></label>
                <label className="field"><span>자산 <em>*</em></span><div className="input-wrap"><span className="input-glyph">A</span><input value={form.asset} onChange={(e) => updateField("asset", e.target.value)} placeholder="예: PC" required /></div></label>
                <label className="field"><span>자산 번호 <em>*</em></span><div className="input-wrap"><span className="input-glyph">#</span><input value={form.assetNumber} onChange={(e) => updateField("assetNumber", e.target.value)} placeholder="예: PC-001" required /></div><small>자산에 부착된 관리 번호를 입력해 주세요.</small></label>
              </div>
              {result && <div className={`result-box ${result.status === "일치" ? "success" : result.status === "오류" ? "error" : "warning"}`} role="status"><span className="result-symbol">{result.status === "일치" ? "✓" : "!"}</span><div><b>{result.status === "일치" ? "자산 정보가 확인되었습니다" : result.status === "불일치" ? "자산 정보가 일치하지 않습니다" : result.status === "대상 없음" ? "등록 대상을 찾지 못했습니다" : "연결을 확인해 주세요"}</b><p>{result.message}</p></div></div>}
              <div className="form-footer"><div className="privacy-note"><span>✓</span>검증 결과는 자산 관리 시트의 F·G열에 기록됩니다.</div><div className="button-row"><button className="secondary-button" type="button" onClick={resetForm}>초기화</button><button className="primary-button" type="submit" disabled={!isComplete || submitting}>{submitting ? "확인 중..." : "정보 확인하기"} <span>→</span></button></div></div>
            </form>
            <aside className="side-stack" id="source">
              <section className="status-card"><div className="status-top"><span className="status-icon">↻</span><span className={`live-badge ${sheet.connected ? "" : "pending"}`}>{sheet.checking ? "확인 중" : sheet.connected ? "정상" : "설정 필요"}</span></div><h3>2026 인크로스 자산 관리 현황</h3><p>Google Sheets 기준 데이터 연결 상태</p><div className="status-line"><span>연동 상태</span><b>{sheet.connected ? "실시간 연결" : "연결 대기"}</b></div><div className="status-line"><span>기준 데이터</span><b>{sheet.checking ? "확인 중" : `${sheet.count}개 행`}</b></div>{sheet.message && !sheet.connected && <p className="connection-message">{sheet.message}</p>}<a className="link-button" href={sheet.sheetUrl} target="_blank" rel="noreferrer">스프레드시트 열기 <span>↗</span></a></section>
              <section className="tip-card"><span className="tip-label">검증 기준</span><h3>팀·이름으로 대상 확인</h3><p>해당 행의 자산과 자산번호를 비교한 뒤, 일치 여부와 입력 번호를 F·G열에 기록합니다.</p></section>
            </aside>
          </section>
          <section className="history-card" id="history">
            <div className="history-heading"><div><h2>이번 세션 검증 기록</h2><p>이 화면에서 방금 실행한 검증 결과입니다. 원본 결과는 Google Sheets에 저장됩니다.</p></div><a className="text-button" href={sheet.sheetUrl} target="_blank" rel="noreferrer">전체 기록 보기 <span>→</span></a></div>
            <div className="table-wrap"><table><thead><tr><th>사용자</th><th>팀</th><th>자산</th><th>자산 번호</th><th>검증 시간</th><th>결과</th></tr></thead><tbody>
              {activities.length === 0 ? <tr><td colSpan={6} className="empty-cell">아직 검증 기록이 없습니다. 위에서 자산 정보를 확인해 주세요.</td></tr> : activities.map((item) => <tr key={item.id}><td><span className="user-cell"><span className="mini-avatar">{item.name.slice(-2)}</span><b>{item.name}</b></span></td><td>{item.team}</td><td>{item.asset}</td><td><code>{item.assetNumber}</code></td><td>{item.checkedAt}</td><td><span className={`status-badge ${item.status === "일치" ? "matched" : "review"}`}><i />{item.status}</span></td></tr>)}
            </tbody></table></div>
          </section>
        </div>
      </section>
    </main>
  );
}