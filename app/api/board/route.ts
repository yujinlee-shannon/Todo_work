import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type Status = "todo" | "progress" | "done";
type Priority = "high" | "medium" | "low";
type ProjectInput = {
  id: string;
  name: string;
  tasks: Array<{
    id: string;
    key: string;
    title: string;
    status: Status;
    priority: Priority;
    createdAt: number;
    description?: string;
  }>;
};

const sharedBoardPath = join(process.cwd(), "work", "shared-board.json");

function normalizeProjects(value: unknown): ProjectInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((project) => {
    const item = project as Partial<ProjectInput>;
    const projectTasks = Array.isArray(item.tasks) ? item.tasks : [];
    return {
      id: String(item.id ?? crypto.randomUUID()),
      name: String(item.name ?? "이름 없는 프로젝트").trim().slice(0, 40) || "이름 없는 프로젝트",
      tasks: projectTasks.map((task, index) => {
        const taskItem = task as Partial<ProjectInput["tasks"][number]>;
        const status: Status = taskItem.status === "progress" || taskItem.status === "done" ? taskItem.status : "todo";
        const priority: Priority = taskItem.priority === "high" || taskItem.priority === "low" ? taskItem.priority : "medium";
        return {
          id: String(taskItem.id ?? crypto.randomUUID()),
          key: String(taskItem.key ?? `TASK-${String(index + 1).padStart(3, "0")}`),
          title: String(taskItem.title ?? "제목 없는 업무").trim().slice(0, 100) || "제목 없는 업무",
          status,
          priority,
          createdAt: Number(taskItem.createdAt ?? Date.now()),
          description: String(taskItem.description ?? ""),
        };
      }),
    };
  });
}

async function readBoard(): Promise<ProjectInput[]> {
  try {
    const content = await readFile(sharedBoardPath, "utf8");
    return normalizeProjects((JSON.parse(content) as { projects?: unknown }).projects);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function GET() {
  try {
    return Response.json({ projects: await readBoard() });
  } catch {
    return Response.json({ error: "공용 보드를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { projects?: unknown };
    const projects = normalizeProjects(payload.projects);
    if (!projects.length) return Response.json({ error: "projects are required" }, { status: 400 });
    await mkdir(dirname(sharedBoardPath), { recursive: true });
    const temporaryPath = `${sharedBoardPath}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ projects }), "utf8");
    await rename(temporaryPath, sharedBoardPath);
    return Response.json({ projects });
  } catch {
    return Response.json({ error: "공용 보드를 저장하지 못했습니다." }, { status: 500 });
  }
}