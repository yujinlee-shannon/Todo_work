"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "todo" | "progress" | "done";
type Priority = "high" | "medium" | "low";
type Task = {
  id: string;
  key: string;
  title: string;
  status: Status;
  priority: Priority;
  createdAt: number;
};

const STORAGE_KEY = "one-step-todos";
const BOARD_INIT_KEY = "one-step-board-initialized";
const STARTER_TASKS: Task[] = [
  { id: "starter-1", key: "TASK-001", title: "이번 주 업무 우선순위 정리", status: "todo", priority: "high", createdAt: Date.now() },
  { id: "starter-2", key: "TASK-002", title: "프로젝트 README 정리", status: "todo", priority: "medium", createdAt: Date.now() },
  { id: "starter-3", key: "TASK-003", title: "보드 화면 디자인 적용", status: "progress", priority: "high", createdAt: Date.now() },
  { id: "starter-4", key: "TASK-004", title: "미리보기 동작 확인", status: "progress", priority: "medium", createdAt: Date.now() },
  { id: "starter-5", key: "TASK-005", title: "GitHub 저장소 연결", status: "done", priority: "low", createdAt: Date.now() },
  { id: "starter-6", key: "TASK-006", title: "기본 투두 기능 구현", status: "done", priority: "medium", createdAt: Date.now() },
];
const COLUMNS: { id: Status; label: string; hint: string }[] = [
  { id: "todo", label: "할 일", hint: "아직 시작하지 않은 업무" },
  { id: "progress", label: "진행 중", hint: "지금 집중하고 있는 업무" },
  { id: "done", label: "완료", hint: "마무리된 업무" },
];
const PRIORITY_LABEL: Record<Priority, string> = { high: "높음", medium: "보통", low: "낮음" };

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTasks(parsed.map((item, index) => ({
          id: String(item.id ?? crypto.randomUUID()),
          key: item.key ?? `TASK-${String(index + 1).padStart(3, "0")}`,
          title: String(item.title ?? "제목 없는 업무"),
          status: item.status ?? (item.completed ? "done" : "todo"),
          priority: item.priority ?? "medium",
          createdAt: Number(item.createdAt ?? Date.now()),
        })));
      } else if (!window.localStorage.getItem(BOARD_INIT_KEY)) {
        setTasks(STARTER_TASKS);
        window.localStorage.setItem(BOARD_INIT_KEY, "true");
      }
    } catch {}
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, isReady]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !term || task.title.toLowerCase().includes(term) || task.key.toLowerCase().includes(term);
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, search, priorityFilter]);

  const counts = {
    todo: tasks.filter((task) => task.status === "todo").length,
    progress: tasks.filter((task) => task.status === "progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
  const progress = tasks.length ? Math.round((counts.done / tasks.length) * 100) : 0;

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const maxNumber = tasks.reduce((max, task) => {
      const value = Number(task.key.split("-")[1]);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    setTasks((current) => [{
      id: crypto.randomUUID(),
      key: `TASK-${String(maxNumber + 1).padStart(3, "0")}`,
      title,
      status: "todo",
      priority: newPriority,
      createdAt: Date.now(),
    }, ...current]);
    setNewTitle("");
    setNewPriority("medium");
    setIsCreateOpen(false);
  }

  function moveTask(id: string, status: Status) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const title = editingTitle.trim();
    if (title) setTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task));
    setEditingId(null);
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <button className="icon-button app-switcher" aria-label="앱 전환"><span /><span /><span /><span /></button>
          <a className="brand" href="#" aria-label="Workly 홈"><span className="brand-mark">W</span><strong>workly</strong></a>
        </div>
        <nav className="global-nav" aria-label="전체 메뉴">
          <button>최근 항목</button><button>프로젝트</button><button>필터</button>
        </nav>
        <div className="top-actions">
          <label className="global-search"><span aria-hidden="true">⌕</span><input aria-label="전체 검색" placeholder="검색" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <button className="create-primary" type="button" onClick={() => setIsCreateOpen(true)}>만들기</button>
          <button className="icon-button help-button" aria-label="도움말">?</button>
          <span className="avatar" aria-label="사용자 Yujin Lee">YL</span>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="project-summary">
            <span className="project-icon">O</span>
            <div><strong>One Step</strong><small>개인 업무 프로젝트</small></div>
          </div>
          <nav className="side-nav" aria-label="프로젝트 메뉴">
            <button><span>⌂</span>요약</button>
            <button className="active"><span>▦</span>TO-DO</button>
          </nav>
          <div className="side-divider" />
          <nav className="side-nav secondary">
            <button><span>⚙</span>프로젝트 설정</button>
          </nav>
          <p className="storage-note"><span /> 이 기기에 자동 저장됨</p>
        </aside>

        <section className="main-content" aria-labelledby="board-title">
          <div className="breadcrumbs"><span>프로젝트</span><b>/</b><span>One Step</span><b>/</b><strong>TO-DO</strong></div>
          <div className="board-heading">
            <div><h1 id="board-title">나의 업무 보드</h1><p>오늘의 업무를 한눈에 확인하고 다음 단계로 이동하세요.</p></div>
            <div className="heading-actions"><button className="secondary-button">공유</button><button className="more-button" aria-label="추가 메뉴">•••</button></div>
          </div>

          <div className="summary-row">
            <div className="summary-card"><span className="summary-icon todo-icon">□</span><div><strong>{counts.todo}</strong><small>할 일</small></div></div>
            <div className="summary-card"><span className="summary-icon progress-icon">↻</span><div><strong>{counts.progress}</strong><small>진행 중</small></div></div>
            <div className="summary-card"><span className="summary-icon done-icon">✓</span><div><strong>{counts.done}</strong><small>완료</small></div></div>
            <div className="completion-card"><div><span>전체 진행률</span><strong>{progress}%</strong></div><div className="completion-track"><span style={{ width: `${progress}%` }} /></div></div>
          </div>

          <div className="board-toolbar">
            <label className="board-search"><span aria-hidden="true">⌕</span><input aria-label="보드 검색" placeholder="이 보드 검색" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <div className="quick-filters">
              <button className={priorityFilter === "all" ? "active" : ""} onClick={() => setPriorityFilter("all")}>모든 업무</button>
              <button className={priorityFilter === "high" ? "active" : ""} onClick={() => setPriorityFilter("high")}>높은 우선순위</button>
            </div>
            <div className="toolbar-spacer" />
            <span className="result-count">{visibleTasks.length}개 업무</span>
            <button className="view-button" aria-label="보기 설정">☷ 보기</button>
          </div>

          <div className="board" aria-live="polite">
            {COLUMNS.map((column) => {
              const columnTasks = visibleTasks.filter((task) => task.status === column.id);
              return (
                <section
                  className={`board-column ${draggingId ? "drag-active" : ""}`}
                  key={column.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (draggingId) moveTask(draggingId, column.id); setDraggingId(null); }}
                >
                  <header className="column-header">
                    <div><h2>{column.label}<span>{columnTasks.length}</span></h2><p>{column.hint}</p></div>
                    <button aria-label={`${column.label} 메뉴`}>•••</button>
                  </header>
                  <div className="card-list">
                    {!isReady ? <div className="column-empty">업무를 불러오는 중...</div> : columnTasks.length === 0 ? (
                      <div className="column-empty"><span>＋</span><p>여기에 업무를 놓으세요</p></div>
                    ) : columnTasks.map((task) => (
                      <article
                        className="task-card"
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <div className="task-card-top">
                          <span className={`type-icon ${task.status}`}>{task.status === "done" ? "✓" : "□"}</span>
                          <span className="task-key">{task.key}</span>
                          <button className="card-more" aria-label={`${task.title} 삭제`} onClick={() => deleteTask(task.id)}>×</button>
                        </div>
                        {editingId === task.id ? (
                          <form className="edit-task" onSubmit={(event) => saveEdit(event, task.id)}>
                            <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditingId(null); }} />
                            <button>저장</button>
                          </form>
                        ) : <button className="task-title" onDoubleClick={() => { setEditingId(task.id); setEditingTitle(task.title); }}>{task.title}</button>}
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`} title={`우선순위 ${PRIORITY_LABEL[task.priority]}`}>{task.priority === "high" ? "↑" : task.priority === "low" ? "↓" : "＝"}</span>
                          <div className="status-control">
                            <label className="sr-only" htmlFor={`status-${task.id}`}>상태 변경</label>
                            <select id={`status-${task.id}`} value={task.status} onChange={(event) => moveTask(task.id, event.target.value as Status)}>
                              <option value="todo">할 일</option><option value="progress">진행 중</option><option value="done">완료</option>
                            </select>
                          </div>
                          <span className="mini-avatar">YL</span>
                        </div>
                      </article>
                    ))}
                    {column.id === "todo" && <button className="add-in-column" onClick={() => setIsCreateOpen(true)}>＋ 업무 만들기</button>}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}>
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <header><div><span className="modal-type-icon">□</span><div><small>ONE STEP</small><h2 id="create-title">새 업무 만들기</h2></div></div><button aria-label="닫기" onClick={() => setIsCreateOpen(false)}>×</button></header>
            <form onSubmit={createTask}>
              <label htmlFor="task-summary">요약 <b>*</b></label>
              <input id="task-summary" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="해야 할 업무를 입력하세요" maxLength={100} />
              <label htmlFor="task-priority">우선순위</label>
              <select id="task-priority" value={newPriority} onChange={(event) => setNewPriority(event.target.value as Priority)}>
                <option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option>
              </select>
              <div className="modal-actions"><button type="button" onClick={() => setIsCreateOpen(false)}>취소</button><button className="create-submit" disabled={!newTitle.trim()}>업무 만들기</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

