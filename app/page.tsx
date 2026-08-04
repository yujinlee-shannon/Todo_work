"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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

function normalizeProjects(items: unknown[]): Project[] {
  return items.map((value, projectIndex) => {
    const project = value as Partial<Project>;
    const rawTasks = Array.isArray(project.tasks) ? project.tasks : [];
    return {
      id: String(project.id ?? crypto.randomUUID()),
      name: String(project.name ?? `프로젝트 ${projectIndex + 1}`),
      tasks: rawTasks.map((value, taskIndex) => {
        const task = value as Partial<Task> & { completed?: boolean };
        return {
          id: String(task.id ?? crypto.randomUUID()),
          key: task.key ?? `TASK-${String(taskIndex + 1).padStart(3, "0")}`,
          title: String(task.title ?? "제목 없는 업무"),
          status: task.status === "progress" || task.status === "done" ? task.status : task.completed ? "done" : "todo",
          priority: task.priority === "high" || task.priority === "low" ? task.priority : "medium",
          createdAt: Number(task.createdAt ?? Date.now()),
          description: String(task.description ?? ""),
        };
      }),
    };
  });
}
function RichTextEditor({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isEditing, setIsEditing] = useState(!value.trim());
  const [draft, setDraft] = useState(value);

  function safeHtml(html: string) {
    const template = document.createElement("template");
    const looksLikeHtml = /<\/?(div|p|br|ul|ol|li|b|strong|i|em|u|s|a|pre|code|span|font|img|figure|figcaption|blockquote)\b/i.test(html);
    template.innerHTML = looksLikeHtml ? html : html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    template.content.querySelectorAll("script,style,iframe,object,embed").forEach((element) => element.remove());
    template.content.querySelectorAll("*").forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const value = attribute.value.trim().toLowerCase();
        if (attribute.name.startsWith("on") || ((attribute.name === "href" || attribute.name === "src") && value.startsWith("javascript:"))) element.removeAttribute(attribute.name);
      });
    });
    return template.innerHTML;
  }

  useEffect(() => {
    if (!isEditing || !editorRef.current) return;
    const nextHtml = safeHtml(draft);
    if (editorRef.current.innerHTML !== nextHtml) editorRef.current.innerHTML = nextHtml;
  }, [isEditing, draft]);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    let range = savedRangeRef.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      savedRangeRef.current = range;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function emitDraft() {
    if (editorRef.current) setDraft(safeHtml(editorRef.current.innerHTML));
    saveSelection();
  }

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    emitDraft();
  }

  function insertList(type: "bullet" | "number" | "task") {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    const selectedLines = (selection?.toString() ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const lines = selectedLines.length ? selectedLines : [""];
    const escapeText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const items = lines.map((line) => `<li>${type === "task" ? '<span class="task-box">☐</span>&nbsp;' : ""}${line ? escapeText(line) : "<br>"}</li>`).join("");
    const tag = type === "number" ? "ol" : "ul";
    document.execCommand("insertHTML", false, `<${tag}${type === "task" ? ' class="task-list"' : ""}>${items}</${tag}>`);
    const insertedLists = editor.querySelectorAll(type === "number" ? "ol" : "ul");
    const lastItem = insertedLists.item(insertedLists.length - 1)?.lastElementChild;
    if (lastItem && selection) {
      const range = document.createRange();
      range.selectNodeContents(lastItem);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRangeRef.current = range;
    }
    emitDraft();
  }

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
    savedRangeRef.current = null;
  }

  function cancelEditing() {
    setDraft(value);
    setIsEditing(false);
    savedRangeRef.current = null;
  }

  function saveDescription() {
    const clean = safeHtml(editorRef.current?.innerHTML ?? draft);
    const template = document.createElement("template");
    template.innerHTML = clean;
    const hasContent = Boolean(template.content.textContent?.trim() || template.content.querySelector("img"));
    const savedValue = hasContent ? clean : "";
    onSave(savedValue);
    setDraft(savedValue);
    setIsEditing(false);
    savedRangeRef.current = null;
  }

  if (!isEditing) {
    return (
      <div className="description-saved">
        <div className="description-saved-head"><span>{value ? "등록된 설명" : "설명 없음"}</span><button type="button" onClick={startEditing}>{value ? "수정" : "설명 작성"}</button></div>
        {value ? <div className="rich-editor-content description-rendered" dangerouslySetInnerHTML={{ __html: safeHtml(value) }} /> : <p className="description-empty">등록된 설명이 없습니다. 설명 작성 버튼을 눌러 내용을 추가해보세요.</p>}
      </div>
    );
  }

  return (
    <div className="description-editing">
      <div className="rich-editor">
        <div className="editor-toolbar" role="toolbar" aria-label="설명 서식 도구">
          <select aria-label="문단 스타일" defaultValue="p" onChange={(event) => { runCommand("formatBlock", event.target.value); event.currentTarget.value = "p"; }}>
            <option value="p">본문</option><option value="h2">제목 2</option><option value="h3">제목 3</option><option value="blockquote">인용</option>
          </select>
          <button type="button" title="굵게 (Ctrl+B)" aria-label="굵게" onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }}><b>B</b></button>
          <button type="button" title="기울임" aria-label="기울임" onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }}><i>I</i></button>
          <button type="button" title="밑줄 (Ctrl+U)" aria-label="밑줄" onMouseDown={(event) => { event.preventDefault(); runCommand("underline"); }}><u>U</u></button>
          <label className="color-tool" title="글자 색상"><span>A</span><input type="color" aria-label="글자 색상" defaultValue="#172b4d" onChange={(event) => runCommand("foreColor", event.target.value)} /></label>
          <button type="button" className="editor-list-button" title="글머리 기호 목록" aria-label="글머리 기호 목록" onMouseDown={(event) => { event.preventDefault(); insertList("bullet"); }}>•</button>
          <button type="button" className="editor-list-button editor-number-button" title="번호 목록" aria-label="번호 목록" onMouseDown={(event) => { event.preventDefault(); insertList("number"); }}>1.</button>
          <button type="button" className="editor-list-button" title="작업 목록" aria-label="작업 목록" onMouseDown={(event) => { event.preventDefault(); insertList("task"); }}>☐</button>
          <span className="toolbar-divider" />
          <button type="button" title="코드 블록" aria-label="코드 블록" onMouseDown={(event) => { event.preventDefault(); runCommand("formatBlock", "pre"); }}>&lt;/&gt;</button>
        </div>
        <div
          ref={editorRef}
          className="rich-editor-content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="업무 설명"
          data-placeholder="업무에 필요한 내용, 참고 사항, 완료 기준을 적어보세요."
          onInput={emitDraft}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onFocus={saveSelection}
          onPaste={(event) => { event.preventDefault(); runCommand("insertText", event.clipboardData.getData("text/plain")); }}
        />
      </div>
      <div className="description-actions"><button type="button" className="description-cancel" onClick={cancelEditing}>취소하기</button><button type="button" className="description-save" onClick={saveDescription}>저장하기</button></div>
    </div>
  );
}
export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeView, setActiveView] = useState<"board" | "summary">("board");
  const [summaryWeekOffset, setSummaryWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [isProjectDeleteOpen, setIsProjectDeleteOpen] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initializeBoard() {
      let localProjects: Project[] = [];
      let savedActiveId: string | null = null;
      try {
        const savedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        const parsedProjects = savedProjects ? JSON.parse(savedProjects) : [];
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          localProjects = normalizeProjects(parsedProjects);
        } else {
          const legacySaved = window.localStorage.getItem(STORAGE_KEY);
          const legacyParsed = legacySaved ? JSON.parse(legacySaved) : [];
          const legacyTasks = Array.isArray(legacyParsed) ? normalizeProjects([{ tasks: legacyParsed }])[0].tasks : [];
          const shouldSeed = legacySaved === null && !window.localStorage.getItem(BOARD_INIT_KEY);
          localProjects = [{ id: "project-one-step", name: "One Step", tasks: shouldSeed ? STARTER_TASKS : legacyTasks }];
          if (shouldSeed) window.localStorage.setItem(BOARD_INIT_KEY, "true");
        }
        savedActiveId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      } catch {
        localProjects = [{ id: "project-one-step", name: "One Step", tasks: STARTER_TASKS }];
      }

      let initialProjects = localProjects;
      try {
        const response = await fetch("/api/board", { cache: "no-store" });
        if (!response.ok) throw new Error("공용 보드를 불러오지 못했습니다.");
        const payload = await response.json() as { projects?: unknown };
        const remoteProjects = Array.isArray(payload.projects) ? normalizeProjects(payload.projects) : [];
        if (remoteProjects.length) {
          initialProjects = remoteProjects;
        } else if (localProjects.length) {
          const seedResponse = await fetch("/api/board", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projects: localProjects }),
          });
          if (!seedResponse.ok) throw new Error("공용 보드에 데이터를 저장하지 못했습니다.");
        }
        setSyncError(null);
      } catch {
        setSyncError("공용 보드 연결에 실패했습니다. 다시 시도해주세요.");
      }

      if (cancelled) return;
      setProjects(initialProjects);
      setActiveProjectId(initialProjects.some((project) => project.id === savedActiveId) ? savedActiveId! : initialProjects[0]?.id ?? "");
      setIsReady(true);
    }
    void initializeBoard();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isReady || !projects.length) return;
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    if (activeProjectId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    void (async () => {
      try {
        const response = await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects }),
        });
        if (!response.ok) throw new Error("공용 보드 저장에 실패했습니다.");
        setSyncError(null);
      } catch {
        setSyncError("공용 보드 연결에 실패했습니다. 다시 시도해주세요.");
      }
    })();
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
  const weeklySummaries = useMemo(() => {
    const startOfWeek = (date: Date) => {
      const next = new Date(date);
      const day = next.getDay();
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() - (day === 0 ? 6 : day - 1));
      return next;
    };
    const today = startOfWeek(new Date());
    const formatDate = (date: Date) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(date);
    return Array.from({ length: 4 }, (_, index) => {
      const offset = index - 3;
      const start = new Date(today);
      start.setDate(today.getDate() + offset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const weekTasks = tasks.filter((task) => task.createdAt >= start.getTime() && task.createdAt <= end.getTime());
      const weekCounts = {
        todo: weekTasks.filter((task) => task.status === "todo").length,
        progress: weekTasks.filter((task) => task.status === "progress").length,
        done: weekTasks.filter((task) => task.status === "done").length,
      };
      return {
        offset,
        label: offset === 0 ? "이번 주" : `${formatDate(start)} 주`,
        range: `${formatDate(start)} ~ ${formatDate(end)}`,
        tasks: weekTasks,
        counts: weekCounts,
        progress: weekTasks.length ? Math.round((weekCounts.done / weekTasks.length) * 100) : 0,
      };
    }).reverse();
  }, [tasks]);
  const selectedWeek = weeklySummaries.find((week) => week.offset === summaryWeekOffset) ?? weeklySummaries[0];

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
    setActiveView("board");
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
    setIsProjectMenuOpen(false);
  }

  function openProjectEdit() {
    if (!activeProject) return;
    setEditingProjectName(activeProject.name);
    setIsProjectMenuOpen(false);
    setIsProjectEditOpen(true);
  }

  function renameProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editingProjectName.trim();
    if (!name || !activeProject) return;
    setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, name } : project));
    setIsProjectEditOpen(false);
  }

  function deleteProject() {
    if (!activeProject || projects.length <= 1) return;
    const remainingProjects = projects.filter((project) => project.id !== activeProject.id);
    setProjects(remainingProjects);
    setActiveProjectId(remainingProjects[0].id);
    setActiveView("board");
    setSearch("");
    setPriorityFilter("all");
    setSelectedTaskId(null);
    setIsProjectDeleteOpen(false);
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
            <button type="button" className={activeView === "summary" ? "active" : ""} onClick={() => { setActiveView("summary"); setSelectedTaskId(null); }}><span>⌂</span>요약</button>
            <button type="button" className={activeView === "board" ? "active" : ""} onClick={() => setActiveView("board")}><span>▦</span>TO-DO</button>
          </nav>
          <div className="side-divider" />
          <nav className="side-nav secondary">
            <button><span>⚙</span>프로젝트 설정</button>
          </nav>
          <p className={`storage-note ${syncError ? "is-error" : ""}`}><span /> {syncError ?? (isReady ? "공용 보드와 동기화됨" : "공용 보드 불러오는 중")}</p>
        </aside>

        <section className="main-content" aria-labelledby={activeView === "summary" ? "summary-title" : "board-title"}>
          <div className="breadcrumbs"><span>프로젝트</span><b>/</b><span>{activeProject?.name ?? "One Step"}</span><b>/</b><strong>{activeView === "summary" ? "요약" : "TO-DO"}</strong></div>
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
          {activeView === "board" ? <>
          <div className="board-heading">
            <div><h1 id="board-title">나의 업무 보드</h1><p>오늘의 업무를 한눈에 확인하고 다음 단계로 이동하세요.</p></div>
            <div className="heading-actions"><button className="secondary-button">공유</button><div className="project-menu-wrap"><button type="button" className="more-button" aria-label="프로젝트 메뉴" aria-expanded={isProjectMenuOpen} onClick={() => setIsProjectMenuOpen((open) => !open)}>•••</button>{isProjectMenuOpen && <div className="project-menu" role="menu" aria-label="프로젝트 관리"><button type="button" role="menuitem" onClick={openProjectEdit}>프로젝트 이름 수정</button><button type="button" role="menuitem" className="project-menu-delete" onClick={() => { setIsProjectMenuOpen(false); setIsProjectDeleteOpen(true); }}>프로젝트 삭제</button></div>}</div></div>
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
          </> : (
            <section className="weekly-summary" aria-labelledby="summary-title">
              <div className="summary-heading">
                <div><h1 id="summary-title">주간 업무 요약</h1><p>업무가 등록된 주차를 기준으로 현재 진행 상태를 확인하세요.</p></div>
                <span className="summary-project-name">{activeProject?.name ?? "One Step"}</span>
              </div>
              <div className="week-picker" role="tablist" aria-label="주차 선택">
                {weeklySummaries.map((week) => <button key={week.offset} type="button" role="tab" aria-selected={week.offset === selectedWeek.offset} className={week.offset === selectedWeek.offset ? "active" : ""} onClick={() => setSummaryWeekOffset(week.offset)}><strong>{week.label}</strong><small>{week.range}</small></button>)}
              </div>
              <div className="weekly-overview">
                <section className="weekly-progress-card"><div><span>{selectedWeek.label} 완료율</span><strong>{selectedWeek.progress}%</strong></div><div className="completion-track"><span style={{ width: `${selectedWeek.progress}%` }} /></div><p>등록 업무 {selectedWeek.tasks.length}개 중 완료 {selectedWeek.counts.done}개</p></section>
                <div className="weekly-stat-grid">
                  <div className="weekly-stat todo"><span>□</span><div><strong>{selectedWeek.counts.todo}</strong><small>할 일</small></div></div>
                  <div className="weekly-stat progress"><span>↻</span><div><strong>{selectedWeek.counts.progress}</strong><small>진행 중</small></div></div>
                  <div className="weekly-stat done"><span>✓</span><div><strong>{selectedWeek.counts.done}</strong><small>완료</small></div></div>
                </div>
              </div>
              <section className="weekly-task-list" aria-labelledby="week-task-heading">
                <header><div><h2 id="week-task-heading">{selectedWeek.label} 등록 업무</h2><p>{selectedWeek.range}</p></div><span>{selectedWeek.tasks.length}개</span></header>
                {selectedWeek.tasks.length ? <div className="week-task-items">{selectedWeek.tasks.map((task) => <button type="button" key={task.id} className="week-task-item" onClick={() => { setActiveView("board"); setSelectedTaskId(task.id); }}><span className={`type-icon ${task.status}`}>{task.status === "done" ? "✓" : "□"}</span><div><strong>{task.title}</strong><small>{task.key} · {task.status === "todo" ? "할 일" : task.status === "progress" ? "진행 중" : "완료"}</small></div><span className={`priority ${task.priority}`}>{task.priority === "high" ? "↑" : task.priority === "low" ? "↓" : "＝"}</span></button>)}</div> : <div className="weekly-empty"><span>□</span><p>이 주차에 등록한 업무가 없습니다.</p></div>}
              </section>
            </section>
          )}
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
                <RichTextEditor key={selectedTask.id} value={selectedTask.description ?? ""} onSave={(description) => updateTask(selectedTask.id, { description })} />
              </section>


            </div>

            <footer className="detail-footer"><button type="button" className="detail-delete" onClick={() => deleteTask(selectedTask.id)}>업무 삭제</button><span>변경사항은 자동 저장됩니다</span></footer>
          </aside>
        </div>
      )}

      {isProjectEditOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsProjectEditOpen(false); }}>
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="project-edit-title">
            <header><div><span className="modal-type-icon project-modal-icon">✎</span><div><small>PROJECT SETTINGS</small><h2 id="project-edit-title">프로젝트 이름 수정</h2></div></div><button aria-label="닫기" onClick={() => setIsProjectEditOpen(false)}>×</button></header>
            <form onSubmit={renameProject}>
              <label htmlFor="project-edit-name">프로젝트 이름 <b>*</b></label>
              <input id="project-edit-name" autoFocus value={editingProjectName} onChange={(event) => setEditingProjectName(event.target.value)} maxLength={40} />
              <div className="modal-actions"><button type="button" onClick={() => setIsProjectEditOpen(false)}>취소</button><button className="create-submit" disabled={!editingProjectName.trim()}>저장하기</button></div>
            </form>
          </section>
        </div>
      )}

      {isProjectDeleteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsProjectDeleteOpen(false); }}>
          <section className="create-modal delete-project-modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
            <header><div><span className="modal-type-icon project-delete-icon">!</span><div><small>DELETE PROJECT</small><h2 id="project-delete-title">프로젝트 삭제</h2></div></div><button aria-label="닫기" onClick={() => setIsProjectDeleteOpen(false)}>×</button></header>
            <div className="project-delete-content"><p><strong>{activeProject?.name}</strong> 프로젝트와 안에 있는 모든 업무가 삭제됩니다.</p>{projects.length <= 1 && <p className="project-delete-warning">마지막 프로젝트는 삭제할 수 없습니다. 새 프로젝트를 만든 뒤 다시 시도해주세요.</p>}<div className="modal-actions"><button type="button" onClick={() => setIsProjectDeleteOpen(false)}>취소</button><button type="button" className="delete-project-confirm" disabled={projects.length <= 1} onClick={deleteProject}>프로젝트 삭제</button></div></div>
          </section>
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

