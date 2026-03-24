"use client";

import { FormEvent, memo, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  HashRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import ModalPortal from "@/features/react-lab/components/modal-portal";
import SkeletonCard from "@/features/react-lab/components/skeleton-card";
import { AuthProvider, useAuth } from "@/features/react-lab/context/auth-context";
import { useDebouncedValue } from "@/features/react-lab/hooks/use-debounced-value";
import { useLocalStorage } from "@/features/react-lab/hooks/use-local-storage";
import { CoworkTask, Experiment, LabRole, LabUser } from "@/features/react-lab/types";

const seededExperiments: Experiment[] = [
  { id: "exp-1", name: "Microcredit AI", stage: "Validación", owner: "Laura" },
  { id: "exp-2", name: "GovFlow", stage: "MVP", owner: "Mateo" },
  { id: "exp-3", name: "EduOps", stage: "Ideación", owner: "Sofía" },
];

type TaskAction =
  | { type: "add"; payload: CoworkTask }
  | { type: "toggle"; payload: { id: string } }
  | { type: "delete"; payload: { id: string } };

function taskReducer(state: CoworkTask[], action: TaskAction) {
  switch (action.type) {
    case "add":
      return [action.payload, ...state];
    case "toggle":
      return state.map((task) =>
        task.id === action.payload.id ? { ...task, done: !task.done } : task,
      );
    case "delete":
      return state.filter((task) => task.id !== action.payload.id);
    default:
      return state;
  }
}

function ProtectedRoute({
  roles,
  children,
}: {
  roles?: LabRole[];
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function LoginView() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [name, setName] = useState("");
  const [role, setRole] = useState<LabRole>("operador");

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    login({ name: name || "Usuario VELA", role });
    const redirectTo = location.state?.from || "/app";
    navigate(redirectTo, { replace: true });
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-2xl font-bold">Login · React Router Hash</h2>
      <p className="mt-1 text-sm text-zinc-500">Autenticación y redirección post-login.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <label className="block text-sm">
          Rol
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as LabRole)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
          >
            <option value="admin">admin</option>
            <option value="analista">analista</option>
            <option value="operador">operador</option>
          </select>
        </label>
        <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background" type="submit">
          Entrar
        </button>
      </form>
    </section>
  );
}

function LabShell() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">React Router Workspace</h2>
          <p className="text-sm text-zinc-500">{user?.name} · rol {user?.role}</p>
        </div>
        <button onClick={logout} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-700" type="button">
          Salir
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <NavLink to="/app" end className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"}`}>
          Dashboard
        </NavLink>
        <NavLink to="/app/users" className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"}`}>
          Users Fetch
        </NavLink>
        <NavLink to="/app/cowork" className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"}`}>
          Coworking
        </NavLink>
        <NavLink to="/app/experiments" className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"}`}>
          Experimentos
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

function DashboardView() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {["Custom Hooks", "Context + useContext", "Portals + Nested Routes"].map((item) => (
        <article key={item} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Módulo</p>
          <p className="mt-2 text-lg font-semibold">{item}</p>
        </article>
      ))}
    </section>
  );
}

const UserRow = memo(function UserRow({ user }: { user: LabUser }) {
  return (
    <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <p className="font-medium">{user.name} · {user.role}</p>
      <p className="text-xs text-zinc-500">{user.email} · {user.active ? "activo" : "inactivo"}</p>
    </li>
  );
});

function UsersView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawSearch, setRawSearch] = useState(searchParams.get("q") || "");
  const search = useDebouncedValue(rawSearch, 300);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [users, setUsers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (search.trim()) {
      next.set("q", search.trim());
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }, [search, searchParams, setSearchParams]);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/react-lab/users", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar user list");
        }
        const payload: { users: LabUser[] } = await response.json();
        setUsers(payload.users);
      } catch {
        setError("Error de carga en fetch de usuarios");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((item) =>
      [item.name, item.email, item.role].join(" ").toLowerCase().includes(normalized),
    );
  }, [users, search]);

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={rawSearch}
          onChange={(event) => setRawSearch(event.target.value)}
          placeholder="ReactSearch por nombre, email o rol"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
      </div>

      {loading ? (
        <div className="grid gap-2 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <UserRow key={item.id} user={item} />
          ))}
          {filtered.length === 0 ? <li className="text-sm text-zinc-500">Sin resultados.</li> : null}
        </ul>
      )}
    </section>
  );
}

function CoworkingView() {
  const [taskInput, setTaskInput] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [storedTasks, setStoredTasks] = useLocalStorage<CoworkTask[]>("vela-react-lab-tasks", []);
  const [tasks, dispatch] = useReducer(taskReducer, storedTasks);

  useEffect(() => {
    setStoredTasks(tasks);
  }, [tasks, setStoredTasks]);

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!taskInput.trim()) {
      return;
    }

    dispatch({
      type: "add",
      payload: {
        id: crypto.randomUUID(),
        title: taskInput.trim(),
        owner: ownerInput.trim() || "Equipo VELA",
        done: false,
        createdAt: new Date().toISOString(),
      },
    });

    setTaskInput("");
    setOwnerInput("");
    setModalOpen(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
        >
          Nueva tarea coworking
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div>
              <p className={`font-medium ${task.done ? "line-through text-zinc-500" : ""}`}>{task.title}</p>
              <p className="text-xs text-zinc-500">{task.owner}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "toggle", payload: { id: task.id } })}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold dark:border-zinc-700"
              >
                {task.done ? "ReactUndo" : "ReactComplete"}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "delete", payload: { id: task.id } })}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold dark:border-zinc-700"
              >
                ReactDelete
              </button>
            </div>
          </li>
        ))}
        {tasks.length === 0 ? <li className="text-sm text-zinc-500">Sin tareas de coworking.</li> : null}
      </ul>

      <ModalPortal open={modalOpen} title="Nueva tarea" onClose={() => setModalOpen(false)}>
        <form onSubmit={addTask} className="space-y-3">
          <input
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            placeholder="Título"
          />
          <input
            value={ownerInput}
            onChange={(event) => setOwnerInput(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            placeholder="Owner"
          />
          <button type="submit" className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">
            Guardar
          </button>
        </form>
      </ModalPortal>
    </section>
  );
}

function ExperimentsView() {
  return (
    <section className="space-y-2">
      {seededExperiments.map((item) => (
        <article key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-zinc-500">{item.stage} · {item.owner}</p>
          <Link className="mt-2 inline-block text-xs font-semibold underline" to={`/app/experiments/${item.id}`}>
            Editar por ruta dinámica
          </Link>
        </article>
      ))}

      <Outlet />
    </section>
  );
}

function ExperimentDetailView() {
  const params = useParams();
  const navigate = useNavigate();
  const experiment = seededExperiments.find((item) => item.id === params.id);
  const [name, setName] = useState(experiment?.name || "");

  if (!experiment) {
    return <p className="text-sm text-red-500">Experimento no encontrado.</p>;
  }

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold">Editar experimento (ruta dinámica + useParams)</h3>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => navigate("/app/experiments")}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold dark:border-zinc-700"
        >
          Guardar y volver (useNavigate)
        </button>
      </div>
    </div>
  );
}

function RouterTree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <LabShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardView />} />
        <Route path="users" element={<UsersView />} />
        <Route path="cowork" element={<CoworkingView />} />
        <Route path="experiments" element={<ExperimentsView />}>
          <Route path=":id" element={<ExperimentDetailView />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function ReactLabApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <RouterTree />
      </HashRouter>
    </AuthProvider>
  );
}
