"use client";

import { FormEvent, useMemo, useState } from "react";

type AssetForm = { team: string; name: string; asset: string; assetNumber: string };
type Activity = AssetForm & { id: number; checkedAt: string; status: "일치" | "확인 필요" };

const initialForm: AssetForm = { team: "", name: "", asset: "", assetNumber: "" };
const sampleAssets = [
  { team: "프로덕트팀", name: "김민지", asset: "MacBook Pro 14", assetNumber: "IT-240118" },
  { team: "마케팅팀", name: "이지훈", asset: "iPhone 15", assetNumber: "MO-240052" },
  { team: "경영지원팀", name: "박서연", asset: "LG gram 16", assetNumber: "IT-230089" },
];
const seedActivity: Activity[] = [
  { id: 1, ...sampleAssets[0], checkedAt: "오늘 09:42", status: "일치" },
  { id: 2, team: "디자인팀", name: "최유나", asset: "Dell U2723QE", assetNumber: "MN-240021", checkedAt: "오늘 09:18", status: "일치" },
  { id: 3, team: "개발팀", name: "정도현", asset: "MacBook Pro 16", assetNumber: "IT-240114", checkedAt: "어제 17:31", status: "확인 필요" },
];

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span>A</span></span>; }

export default function Home() {
  const [form, setForm] = useState<AssetForm>(initialForm);
  const [activities, setActivities] = useState<Activity[]>(seedActivity);
  const [result, setResult] = useState<Activity["status"] | null>(null);
  const [submittedName, setSubmittedName] = useState("");
  const isComplete = useMemo(() => Object.values(form).every((value) => value.trim().length > 0), [form]);

  function updateField(field: keyof AssetForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete) return;
    const normalizedNumber = form.assetNumber.trim().toUpperCase();
    const matched = sampleAssets.some((item) => item.team === form.team.trim() && item.name === form.name.trim() && item.asset === form.asset.trim() && item.assetNumber === normalizedNumber);
    const status: Activity["status"] = matched ? "일치" : "확인 필요";
    const entry: Activity = { id: Date.now(), team: form.team.trim(), name: form.name.trim(), asset: form.asset.trim(), assetNumber: normalizedNumber, checkedAt: "방금 전", status };
    setSubmittedName(entry.name);
    setResult(status);
    setActivities((current) => [entry, ...current].slice(0, 5));
  }

  function fillSample() { setForm(sampleAssets[0]); setResult(null); }
  function resetForm() { setForm(initialForm); setResult(null); }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><BrandMark /><span className="brand-name">Assetly</span></div>
        <div className="header-actions"><div className="sync-pill"><span className="sync-dot" />Google Sheets 연결됨</div><button className="avatar" aria-label="내 계정">YL</button></div>
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
              <div className="sheet-mini-title"><span className="sheet-icon">S</span><div><b>자산 기준표</b><small>마지막 동기화 2분 전</small></div></div>
              <div className="sheet-mini-row"><span>등록 자산</span><b>248개</b></div>
            </div>
          </div>
        </aside>
        <div className="content">
          <section className="intro" id="register">
            <div><span className="eyebrow">ASSET VERIFICATION</span><h1>자산 정보를 확인해 주세요</h1><p>입력한 정보가 자산 기준표와 일치하는지 바로 확인하고, 결과를 자동으로 기록합니다.</p></div>
            <div className="flow-indicator" aria-label="현재 검증 단계">
              <div className="flow-step current"><span>1</span><div><b>정보 입력</b><small>사용자 자산 정보</small></div></div><span className="flow-line" />
              <div className="flow-step"><span>2</span><div><b>자동 검증</b><small>시트 데이터 대조</small></div></div><span className="flow-line" />
              <div className="flow-step"><span>3</span><div><b>결과 기록</b><small>시트에 자동 저장</small></div></div>
            </div>
          </section>
          <section className="main-grid">
            <form className="form-card" onSubmit={handleSubmit}>
              <div className="card-heading"><div><span className="section-number">01</span><h2>기본 정보</h2></div><button type="button" className="text-button" onClick={fillSample}>예시 데이터 채우기</button></div>
              <div className="field-grid">
                <label className="field"><span>팀 이름 <em>*</em></span><div className="input-wrap"><span className="input-glyph">T</span><input value={form.team} onChange={(e) => updateField("team", e.target.value)} placeholder="예: 프로덕트팀" required /></div></label>
                <label className="field"><span>이름 <em>*</em></span><div className="input-wrap"><span className="input-glyph">P</span><input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="예: 김민지" required /></div></label>
                <label className="field"><span>자산 <em>*</em></span><div className="input-wrap"><span className="input-glyph">A</span><input value={form.asset} onChange={(e) => updateField("asset", e.target.value)} placeholder="예: MacBook Pro 14" required /></div></label>
                <label className="field"><span>자산 번호 <em>*</em></span><div className="input-wrap"><span className="input-glyph">#</span><input value={form.assetNumber} onChange={(e) => updateField("assetNumber", e.target.value)} placeholder="예: IT-240118" required /></div><small>자산에 부착된 관리 번호를 입력해 주세요.</small></label>
              </div>
              {result && <div className={`result-box ${result === "일치" ? "success" : "warning"}`} role="status"><span className="result-symbol">{result === "일치" ? "✓" : "!"}</span><div><b>{result === "일치" ? "자산 정보가 확인되었습니다" : "기준 데이터에서 일치 항목을 찾지 못했습니다"}</b><p>{result === "일치" ? `${submittedName}님의 검증 결과를 Google Sheets에 기록했습니다.` : "입력 내용을 다시 확인해 주세요. 결과는 ‘확인 필요’로 기록했습니다."}</p></div></div>}
              <div className="form-footer"><div className="privacy-note"><span>✓</span>입력한 정보는 자산 확인 목적으로만 사용됩니다.</div><div className="button-row"><button className="secondary-button" type="button" onClick={resetForm}>초기화</button><button className="primary-button" type="submit" disabled={!isComplete}>정보 확인하기 <span>→</span></button></div></div>
            </form>
            <aside className="side-stack" id="source">
              <section className="status-card"><div className="status-top"><span className="status-icon">↻</span><span className="live-badge">정상</span></div><h3>Google Sheets</h3><p>기준 데이터 연결 상태</p><div className="status-line"><span>마지막 동기화</span><b>2분 전</b></div><div className="status-line"><span>기준 데이터</span><b>248개 행</b></div><button className="link-button" type="button">스프레드시트 열기 <span>↗</span></button></section>
              <section className="tip-card"><span className="tip-label">TIP</span><h3>정확한 검증을 위해</h3><p>자산 번호의 영문과 숫자, 하이픈까지 자산 스티커와 동일하게 입력해 주세요.</p></section>
            </aside>
          </section>
          <section className="history-card" id="history">
            <div className="history-heading"><div><h2>최근 검증 기록</h2><p>검증 결과는 Google Sheets 결과 시트에 자동으로 쌓입니다.</p></div><button className="text-button" type="button">전체 기록 보기 <span>→</span></button></div>
            <div className="table-wrap"><table><thead><tr><th>사용자</th><th>팀</th><th>자산</th><th>자산 번호</th><th>검증 시간</th><th>결과</th></tr></thead><tbody>
              {activities.map((item) => <tr key={item.id}><td><span className="user-cell"><span className="mini-avatar">{item.name.slice(-2)}</span><b>{item.name}</b></span></td><td>{item.team}</td><td>{item.asset}</td><td><code>{item.assetNumber}</code></td><td>{item.checkedAt}</td><td><span className={`status-badge ${item.status === "일치" ? "matched" : "review"}`}><i />{item.status}</span></td></tr>)}
            </tbody></table></div>
          </section>
        </div>
      </section>
    </main>
  );
}