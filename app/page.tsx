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
  description?: string;
};
type Project = {
  id: string;
  name: string;
  tasks: Task[];
};

const STORAGE_KEY = "one-step-todos";
const PROJECTS_STORAGE_KEY = "one-step-projects";
const ACTIVE_PROJECT_KEY = "one-step-active-project";
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const normalizeTasks = (items: unknown[]): Task[] => items.map((value, index) => {
        const item = value as Partial<Task> & { completed?: boolean };
        return {
          id: String(item.id ?? crypto.randomUUID()),
          key: item.key ?? `TASK-${String(index + 1).padStart(3, "0")}`,
          title: String(item.title ?? "제목 없는 업무"),
          status: item.status ?? (item.completed ? "done" : "todo"),
          priority: item.priority ?? "medium",
          createdAt: Number(item.createdAt ?? Date.now()),
          description: String(item.description ?? ""),
        };
      });
      const savedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      const parsedProjects = savedProjects ? JSON.parse(savedProjects) : [];
      let initialProjects: Project[];
      if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
        initialProjects = parsedProjects.map((value, index) => {
          const project = value as Partial<Project>;
          return {
            id: String(project.id ?? crypto.randomUUID()),
            name: String(project.name ?? `프로젝트 ${index + 1}`),
            tasks: Array.isArray(project.tasks) ? normalizeTasks(project.tasks) : [],
          };
        });
      } else {
        const legacySaved = window.localStorage.getItem(STORAGE_KEY);
        const legacyParsed = legacySaved ? JSON.parse(legacySaved) : [];
        const legacyTasks = Array.isArray(legacyParsed) ? normalizeTasks(legacyParsed) : [];
        const shouldSeed = legacySaved === null && !window.localStorage.getItem(BOARD_INIT_KEY);
        initialProjects = [{ id: "project-one-step", name: "One Step", tasks: shouldSeed ? STARTER_TASKS : legacyTasks }];
        if (shouldSeed) window.localStorage.setItem(BOARD_INIT_KEY, "true");
      }
      const savedActiveId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      setProjects(initialProjects);
      setActiveProjectId(initialProjects.some((project) => project.id === savedActiveId) ? savedActiveId! : initialProjects[0].id);
    } catch {}
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    if (activeProjectId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
  }, [projects, activeProjectId, isReady]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const tasks = activeProject?.tasks ?? [];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!selectedTaskId) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedTaskId(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTaskId]);

  function updateActiveTasks(updater: (tasks: Task[]) => Task[]) {
    setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, tasks: updater(project.tasks) } : project));
  }
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
    updateActiveTasks((current) => [{
      id: crypto.randomUUID(),
      key: `TASK-${String(maxNumber + 1).padStart(3, "0")}`,
      title,
      status: "todo",
      priority: newPriority,
      createdAt: Date.now(),
      description: "",
    }, ...current]);
    setNewTitle("");
    setNewPriority("medium");
    setIsCreateOpen(false);
  }

  function moveTask(id: string, status: Status) {
    updateActiveTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
  }

  function updateTask(id: string, patch: Partial<Pick<Task, "title" | "status" | "priority" | "description">>) {
    updateActiveTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }

  function deleteTask(id: string) {
    updateActiveTasks((current) => current.filter((task) => task.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setProjects((current) => [...current, { id, name, tasks: [] }]);
    setActiveProjectId(id);
    setSearch("");
    setPriorityFilter("all");
    setNewProjectName("");
    setIsProjectCreateOpen(false);
  }

  function selectProject(id: string) {
    setActiveProjectId(id);
    setSearch("");
    setPriorityFilter("all");
    setSelectedTaskId(null);
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
            <div><strong>{activeProject?.name ?? "One Step"}</strong><small>개인 업무 프로젝트</small></div>
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
          <div className="breadcrumbs"><span>프로젝트</span><b>/</b><span>{activeProject?.name ?? "One Step"}</span><b>/</b><strong>TO-DO</strong></div>
          <div className="project-tabs-wrap">
            <div className="project-tabs" role="tablist" aria-label="프로젝트 선택">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  role="tab"
                  aria-selected={project.id === activeProjectId}
                  className={project.id === activeProjectId ? "active" : ""}
                  onClick={() => selectProject(project.id)}
                >
                  <span className="project-tab-dot" />
                  {project.name}
                  <small>{project.tasks.length}</small>
                </button>
              ))}
              <button className="add-project-tab" type="button" onClick={() => setIsProjectCreateOpen(true)} aria-label="새 프로젝트 추가">＋<span>프로젝트</span></button>
            </div>
          </div>
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
                        className={`task-card ${selectedTaskId === task.id ? "selected" : ""}`}
                        key={task.id}
                        draggable
                        tabIndex={0}
                        aria-label={`${task.title} 상세 보기`}
                        onClick={(event) => { if (!(event.target as HTMLElement).closest("button, select, input, textarea, form")) setSelectedTaskId(task.id); }}
                        onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedTaskId(task.id); } }}
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <div className="task-card-top">
                          <span className={`type-icon ${task.status}`}>{task.status === "done" ? "✓" : "□"}</span>
                          <span className="task-key">{task.key}</span>
                          <button className="card-more" aria-label={`${task.title} 삭제`} onClick={(event) => { event.stopPropagation(); deleteTask(task.id); }}>×</button>
                        </div>
                        <button className="task-title" onClick={(event) => { event.stopPropagation(); setSelectedTaskId(task.id); }}>{task.title}</button>
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`} title={`우선순위 ${PRIORITY_LABEL[task.priority]}`}>{task.priority === "high" ? "↑" : task.priority === "low" ? "↓" : "＝"}</span>
                          <div className="status-control">
                            <label className="sr-only" htmlFor={`status-${task.id}`}>상태 변경</label>
                            <select id={`status-${task.id}`} value={task.status} onClick={(event) => event.stopPropagation()} onChange={(event) => moveTask(task.id, event.target.value as Status)}>
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

      {selectedTask && (
        <div className="detail-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTaskId(null); }}>
          <aside className="task-detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-task-title">
            <header className="detail-header">
              <div>
                <span className={`detail-type-icon ${selectedTask.status}`}>{selectedTask.status === "done" ? "✓" : "□"}</span>
                <div><small>{activeProject?.name}</small><strong>{selectedTask.key}</strong></div>
              </div>
              <button type="button" className="detail-close" aria-label="상세 패널 닫기" onClick={() => setSelectedTaskId(null)}>×</button>
            </header>

            <div className="detail-content">
              <section className="detail-title-section">
                <label htmlFor="detail-task-title">업무 제목</label>
                <textarea id="detail-task-title" rows={2} value={selectedTask.title} onChange={(event) => updateTask(selectedTask.id, { title: event.target.value })} />
              </section>

              <section className="detail-section">
                <h3>세부 정보</h3>
                <div className="detail-field-grid">
                  <label><span>상태</span><select value={selectedTask.status} onChange={(event) => updateTask(selectedTask.id, { status: event.target.value as Status })}><option value="todo">할 일</option><option value="progress">진행 중</option><option value="done">완료</option></select></label>
                  <label><span>우선순위</span><select value={selectedTask.priority} onChange={(event) => updateTask(selectedTask.id, { priority: event.target.value as Priority })}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label>
                </div>
                <div className="detail-info-row"><span>담당자</span><div className="detail-assignee"><span className="avatar">YL</span><strong>Yujin Lee</strong></div></div>
                <div className="detail-info-row"><span>프로젝트</span><strong>{activeProject?.name}</strong></div>
              </section>

              <section className="detail-section">
                <h3>설명</h3>
                <textarea className="detail-description" rows={7} value={selectedTask.description ?? ""} onChange={(event) => updateTask(selectedTask.id, { description: event.target.value })} placeholder="업무에 필요한 내용, 참고 사항, 완료 기준을 적어보세요." />
              </section>

              <section className="detail-section activity-section">
                <h3>활동</h3>
                <div className="activity-item"><span className="activity-dot" /><div><strong>업무가 생성되었습니다.</strong><time>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(selectedTask.createdAt))}</time></div></div>
              </section>
            </div>

            <footer className="detail-footer"><button type="button" className="detail-delete" onClick={() => deleteTask(selectedTask.id)}>업무 삭제</button><span>변경사항은 자동 저장됩니다</span></footer>
          </aside>
        </div>
      )}

      {isProjectCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsProjectCreateOpen(false); }}>
          <section className="create-modal project-create-modal" role="dialog" aria-modal="true" aria-labelledby="project-create-title">
            <header><div><span className="modal-type-icon project-modal-icon">＋</span><div><small>NEW PROJECT</small><h2 id="project-create-title">새 프로젝트 만들기</h2></div></div><button aria-label="닫기" onClick={() => setIsProjectCreateOpen(false)}>×</button></header>
            <form onSubmit={createProject}>
              <label htmlFor="project-name">프로젝트 이름 <b>*</b></label>
              <input id="project-name" autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="예: 웹사이트 리뉴얼" maxLength={40} />
              <p className="project-create-help">프로젝트를 만들면 할 일, 진행 중, 완료 영역이 함께 생성됩니다.</p>
              <div className="modal-actions"><button type="button" onClick={() => setIsProjectCreateOpen(false)}>취소</button><button className="create-submit" disabled={!newProjectName.trim()}>프로젝트 만들기</button></div>
            </form>
          </section>
        </div>
      )}

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}>
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <header><div><span className="modal-type-icon">□</span><div><small>{activeProject?.name ?? "ONE STEP"}</small><h2 id="create-title">새 업무 만들기</h2></div></div><button aria-label="닫기" onClick={() => setIsCreateOpen(false)}>×</button></header>
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

