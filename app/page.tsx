"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Todo = { id: string; title: string; completed: boolean; createdAt: number };
type Filter = "all" | "active" | "completed";
const STORAGE_KEY = "one-step-todos";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" }, { value: "active", label: "진행 중" }, { value: "completed", label: "완료" },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isReady, setIsReady] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setTodos(JSON.parse(saved));
    } catch {}
    setIsReady(true);
  }, []);
  useEffect(() => {
    if (isReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, isReady]);
  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  const visibleTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [filter, todos]);
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setTodos((current) => [{ id: crypto.randomUUID(), title: nextTitle, completed: false, createdAt: Date.now() }, ...current]);
    setTitle("");
    setFilter("all");
  }
  function toggleTodo(id: string) {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
  }
  function deleteTodo(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }
  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  }
  function saveEditing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = editingTitle.trim();
    if (!editingId) return;
    if (!nextTitle) deleteTodo(editingId);
    else setTodos((current) => current.map((todo) => todo.id === editingId ? { ...todo, title: nextTitle } : todo));
    setEditingId(null);
    setEditingTitle("");
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="todo-app" aria-labelledby="page-title">
        <header className="hero">
          <div>
            <p className="eyebrow"><span /> ONE STEP</p>
            <h1 id="page-title">오늘 할 일을<br />가볍게 시작해요.</h1>
            <p className="intro">해야 할 일을 적고, 하나씩 완료해 보세요.<br className="desktop-break" /> 모든 목록은 이 기기에 안전하게 보관됩니다.</p>
          </div>
          <div className="progress-card" aria-label={`오늘의 달성률 ${progress}%`}>
            <div className="progress-topline"><span>오늘의 달성률</span><strong>{progress}%</strong></div>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            <p>{activeCount === 0 && todos.length > 0 ? "오늘의 할 일을 모두 마쳤어요!" : `조금씩 해내는 중 · ${activeCount}개 남음`}</p>
          </div>
        </header>

        <div className="workspace">
          <form className="add-form" onSubmit={addTodo}>
            <label htmlFor="new-todo" className="sr-only">새로운 할 일</label>
            <span className="add-mark" aria-hidden="true">＋</span>
            <input id="new-todo" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새로운 할 일을 입력하세요" maxLength={100} autoComplete="off" />
            <button type="submit" disabled={!title.trim()}>추가하기</button>
          </form>
          <div className="list-toolbar">
            <div className="filters" aria-label="할 일 필터">
              {FILTERS.map((item) => (
                <button key={item.value} type="button" className={filter === item.value ? "active" : ""} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
                  {item.label}<span>{item.value === "all" ? todos.length : item.value === "active" ? activeCount : completedCount}</span>
                </button>
              ))}
            </div>
            {completedCount > 0 && <button className="clear-button" type="button" onClick={() => setTodos((current) => current.filter((todo) => !todo.completed))}>완료 항목 지우기</button>}
          </div>
          <div className="todo-list" aria-live="polite">
            {!isReady ? <div className="empty-state"><p>목록을 불러오고 있어요.</p></div> : visibleTodos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true"><span>✓</span></div>
                <h2>{todos.length === 0 ? "첫 번째 할 일을 적어볼까요?" : filter === "completed" ? "아직 완료한 일이 없어요" : "남은 할 일이 없어요"}</h2>
                <p>{todos.length === 0 ? "작은 일부터 시작하면 오늘이 한결 가벼워져요." : "다른 필터를 선택해 목록을 확인해 보세요."}</p>
              </div>
            ) : visibleTodos.map((todo) => (
              <article className={`todo-item ${todo.completed ? "completed" : ""}`} key={todo.id}>
                <button className="check-button" type="button" aria-label={todo.completed ? `${todo.title} 완료 취소` : `${todo.title} 완료`} aria-pressed={todo.completed} onClick={() => toggleTodo(todo.id)}><span aria-hidden="true">✓</span></button>
                {editingId === todo.id ? (
                  <form className="edit-form" onSubmit={saveEditing}>
                    <label className="sr-only" htmlFor={`edit-${todo.id}`}>할 일 수정</label>
                    <input id={`edit-${todo.id}`} ref={editInputRef} value={editingTitle} maxLength={100} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditingId(null); }} />
                    <button type="submit">저장</button>
                  </form>
                ) : <button className="todo-title" type="button" onDoubleClick={() => startEditing(todo)} onClick={() => toggleTodo(todo.id)}>{todo.title}</button>}
                {editingId !== todo.id && <div className="item-actions"><button type="button" onClick={() => startEditing(todo)} aria-label={`${todo.title} 수정`}>수정</button><button type="button" onClick={() => deleteTodo(todo.id)} aria-label={`${todo.title} 삭제`}>삭제</button></div>}
              </article>
            ))}
          </div>
          <footer className="app-footer"><span><i /> 자동 저장됨</span><span>오늘도 충분히 잘하고 있어요.</span></footer>
        </div>
      </section>
    </main>
  );
}

