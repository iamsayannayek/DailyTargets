import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  ListTodo,
  Activity,
  Timer as TimerIcon,
  TrendingUp,
  Sun,
  Moon,
  Play,
  Pause,
  SkipForward,
  Flame,
  Settings,
  Award,
  Calendar,
  MoreVertical,
  X,
  Trophy,
  Trash2,
  Edit2,
  LayoutGrid,
  Database,
  Code,
  BookOpen,
  Briefcase,
  Palette,
  MonitorPlay,
  Folder,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// --- Types & Interfaces ---
export type Priority = "High" | "Medium" | "Low";
export type ItemType = "task" | "category";

export interface Task {
  id: string;
  title: string;
  categoryId: string | null;
  completed: boolean;
  priority: Priority;
  date: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  logs: Record<string, boolean>;
  currentStreak: number;
  bestStreak: number;
}

export interface UserStats {
  points: number;
  level: number;
}

// --- Utility Functions ---
const getTodayStr = (): string => new Date().toISOString().split("T")[0];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const generateLastNDays = (n: number): string[] => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

// Formats "2026-04-25" to "25 Apr"
const formatReadableDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
};

// Safe LocalStorage Parser with Generics
const loadLocalData = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error parsing ${key} from local storage:`, error);
    return fallback;
  }
};

// --- Icons Mapping for Dynamic Rendering ---
const IconsMap: Record<string, React.ElementType> = {
  LayoutGrid,
  Database,
  Code,
  BookOpen,
  Briefcase,
  Palette,
  MonitorPlay,
  Activity,
  Trophy,
};

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

function DynamicIcon({ name, size = 16, className = "" }: DynamicIconProps) {
  const IconComponent = IconsMap[name] || LayoutGrid;
  return <IconComponent size={size} className={className} />;
}

// --- Mock Initial Data (Version 7 for fresh TS load) ---
const initialCategories: Category[] = [
  {
    id: "c1",
    name: "SQL Mastery",
    icon: "Database",
    color: "blue",
    logs: {},
    currentStreak: 2,
    bestStreak: 5,
  },
  {
    id: "c2",
    name: "Python Mastery",
    icon: "Code",
    color: "amber",
    logs: {},
    currentStreak: 0,
    bestStreak: 3,
  },
  {
    id: "c3",
    name: "Data Concepts",
    icon: "BookOpen",
    color: "emerald",
    logs: {},
    currentStreak: 0,
    bestStreak: 0,
  },
];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Complete SQL Joins Practice",
    categoryId: "c1",
    completed: false,
    priority: "High",
    date: getTodayStr(),
    order: 0,
  },
  {
    id: "t2",
    title: "Write Data Pipeline Script",
    categoryId: "c2",
    completed: false,
    priority: "Medium",
    date: getTodayStr(),
    order: 1,
  },
];

const initialStats: UserStats = { points: 0, level: 1 };

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("focusflow_theme") || "dark",
  );

  const [categories, setCategories] = useState<Category[]>(() =>
    loadLocalData<Category[]>("focusflow_cats_v7", initialCategories),
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadLocalData<Task[]>("focusflow_tasks_v7", initialTasks),
  );
  const [userStats, setUserStats] = useState<UserStats>(() =>
    loadLocalData<UserStats>("focusflow_stats_v7", initialStats),
  );

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addType, setAddType] = useState<ItemType>("task");
  const [editData, setEditData] = useState<any>(null);

  // Task Rollover Logic
  useEffect(() => {
    const today = getTodayStr();
    setTasks((prev) => {
      let changed = false;
      const updated = prev.map((t) => {
        if (!t.completed && t.date < today) {
          changed = true;
          return { ...t, date: today };
        }
        return t;
      });
      return changed ? updated : prev;
    });
  }, []);

  // Automatic Category Streak Tracking based on Task Completion
  useEffect(() => {
    const today = getTodayStr();
    setCategories((prevCats) => {
      let changed = false;
      const updated = prevCats.map((cat) => {
        const catTasksToday = tasks.filter(
          (t) => t.categoryId === cat.id && t.date === today,
        );

        if (catTasksToday.length > 0) {
          const allDone = catTasksToday.every((t) => t.completed);
          if (cat.logs[today] !== allDone) {
            changed = true;
            const newLogs = { ...cat.logs, [today]: allDone };

            // Recalculate streak
            let streak = 0;
            const d = new Date(today);
            while (newLogs[d.toISOString().split("T")[0]]) {
              streak++;
              d.setDate(d.getDate() - 1);
            }
            return {
              ...cat,
              logs: newLogs,
              currentStreak: streak,
              bestStreak: Math.max(streak, cat.bestStreak || 0),
            };
          }
        } else if (cat.logs[today] === true) {
          changed = true;
          const newLogs = { ...cat.logs };
          delete newLogs[today];

          let streak = 0;
          const d = new Date();
          d.setDate(d.getDate() - 1); // Check yesterday
          while (newLogs[d.toISOString().split("T")[0]]) {
            streak++;
            d.setDate(d.getDate() - 1);
          }
          return { ...cat, logs: newLogs, currentStreak: streak };
        }
        return cat;
      });
      return changed ? updated : prevCats;
    });
  }, [tasks]);

  // Persist State
  useEffect(() => {
    localStorage.setItem("focusflow_tasks_v7", JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem("focusflow_cats_v7", JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem("focusflow_stats_v7", JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    localStorage.setItem("focusflow_theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Gamification Handler
  const addPoints = (points: number) => {
    setUserStats((prev) => {
      const newPoints = prev.points + points;
      const newLevel = Math.floor(newPoints / 100) + 1;
      return { points: newPoints, level: newLevel };
    });
  };

  // Task Actions
  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === taskId) {
          if (!t.completed) addPoints(10);
          return { ...t, completed: !t.completed };
        }
        return t;
      }),
    );
  };

  const deleteTask = (taskId: string) =>
    setTasks(tasks.filter((t) => t.id !== taskId));
  const openEditTask = (task: Task) => {
    setAddType("task");
    setEditData(task);
    setShowAddModal(true);
  };

  const swapTaskOrder = (id1: string, id2: string) => {
    setTasks((prev) => {
      const copy = [...prev];
      const t1Index = copy.findIndex((t) => t.id === id1);
      const t2Index = copy.findIndex((t) => t.id === id2);
      if (t1Index === -1 || t2Index === -1) return prev;

      const tempOrder = copy[t1Index].order;
      copy[t1Index].order = copy[t2Index].order;
      copy[t2Index].order = tempOrder;

      return copy;
    });
  };

  // Category Actions
  const deleteCategory = (catId: string) => {
    setCategories(categories.filter((c) => c.id !== catId));
    setTasks(
      tasks.map((t) =>
        t.categoryId === catId ? { ...t, categoryId: null } : t,
      ),
    );
  };
  const openEditCategory = (cat: Category) => {
    setAddType("category");
    setEditData(cat);
    setShowAddModal(true);
  };

  // --- Layout Wrappers ---
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`flex h-screen w-full overflow-hidden ${theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"} transition-colors duration-300 font-sans`}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 z-20 transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shrink-0">
            <Activity size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FocusFlow</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          <SidebarItem
            icon={<LayoutGrid size={20} />}
            label="Dashboard"
            id="dashboard"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <SidebarItem
            icon={<ListTodo size={20} />}
            label="Tasks"
            id="tasks"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <SidebarItem
            icon={<Folder size={20} />}
            label="Categories"
            id="categories"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <SidebarItem
            icon={<TimerIcon size={20} />}
            label="Focus Timer"
            id="timer"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <SidebarItem
            icon={<TrendingUp size={20} />}
            label="Statistics"
            id="stats"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <Trophy size={16} /> <span>Lvl {userStats.level}</span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <button
            onClick={() => {
              setAddType("task");
              setShowAddModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Plus size={20} /> New Item
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-white/50 dark:bg-[#0b1120]">
        {/* Mobile Header */}
        <header className="md:hidden px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 z-10 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Activity size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FocusFlow</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              <Trophy size={14} /> <span>Lvl {userStats.level}</span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8 scrollbar-hide">
          <div className="max-w-5xl mx-auto w-full h-full">{children}</div>
        </main>

        {/* Mobile Floating Add Button */}
        {(activeTab === "tasks" ||
          activeTab === "categories" ||
          activeTab === "dashboard") && (
          <button
            onClick={() => {
              setAddType(activeTab === "categories" ? "category" : "task");
              setShowAddModal(true);
            }}
            className="md:hidden absolute bottom-24 right-6 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-transform active:scale-95 z-20"
          >
            <Plus size={28} />
          </button>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden absolute bottom-0 w-full h-20 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-30 pb-safe">
          <TabButton
            icon={<LayoutGrid size={24} />}
            label="Dash"
            id="dashboard"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            icon={<ListTodo size={24} />}
            label="Tasks"
            id="tasks"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            icon={<Folder size={24} />}
            label="Groups"
            id="categories"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            icon={<TimerIcon size={24} />}
            label="Timer"
            id="timer"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            icon={<TrendingUp size={24} />}
            label="Stats"
            id="stats"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </nav>
      </div>

      {/* Shared Add Modal */}
      {showAddModal && (
        <AddModal
          type={addType}
          editData={editData}
          categories={categories}
          tasks={tasks}
          onClose={() => {
            setShowAddModal(false);
            setEditData(null);
          }}
          onAdd={(returnedType, data) => {
            if (returnedType === "task") {
              if (editData && addType === "task") {
                setTasks(
                  tasks.map((t) =>
                    t.id === editData.id ? { ...t, ...data } : t,
                  ),
                );
              } else {
                const maxOrder =
                  tasks.length > 0
                    ? Math.max(...tasks.map((t) => t.order || 0))
                    : 0;
                setTasks([
                  ...tasks,
                  {
                    ...(data as Task),
                    id: Date.now().toString(),
                    completed: false,
                    date: getTodayStr(),
                    order: maxOrder + 1,
                  },
                ]);
              }
            } else {
              if (editData && addType === "category") {
                setCategories(
                  categories.map((c) =>
                    c.id === editData.id ? { ...c, ...data } : c,
                  ),
                );
              } else {
                setCategories([
                  ...categories,
                  {
                    ...(data as Category),
                    id: Date.now().toString(),
                    logs: {},
                    currentStreak: 0,
                    bestStreak: 0,
                  },
                ]);
              }
            }
            setShowAddModal(false);
            setEditData(null);
          }}
        />
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            tasks={tasks}
            categories={categories}
            toggleTask={toggleTask}
          />
        );
      case "tasks":
        return (
          <TasksList
            tasks={tasks}
            categories={categories}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            openEditModal={openEditTask}
            swapTaskOrder={swapTaskOrder}
          />
        );
      case "categories":
        return (
          <CategoriesList
            categories={categories}
            tasks={tasks}
            deleteCategory={deleteCategory}
            openEditModal={openEditCategory}
          />
        );
      case "timer":
        return <PomodoroTimer onComplete={() => addPoints(50)} />;
      case "stats":
        return <StatsView tasks={tasks} userStats={userStats} />;
      default:
        return null;
    }
  };

  return <Layout>{renderContent()}</Layout>;
}

// --- Navigation Components ---
interface NavProps {
  icon: React.ReactNode;
  label: string;
  id: string;
  activeTab: string;
  setActiveTab: (id: string) => void;
}

function SidebarItem({ icon, label, id, activeTab, setActiveTab }: NavProps) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${isActive ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 scale-105" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}
    >
      <div>{icon}</div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function TabButton({ icon, label, id, activeTab, setActiveTab }: NavProps) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${isActive ? "text-[#db4c3f]" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}`}
    >
      <div
        className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// --- LeetCode Style Consistency Grid Component ---
interface ConsistencyGridProps {
  tasks: Task[];
}

function ConsistencyGrid({ tasks }: ConsistencyGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
    align: "left" | "center" | "right";
    targetWidth: number;
  } | null>(null);

  const { weeks, activeDays, maxStreak } = useMemo(() => {
    const today = new Date();

    const getLocalStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalStr(today);

    // Go back exactly 1 year (52 weeks)
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear() - 1);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Re-align to previous Sunday

    const endDate = new Date();
    endDate.setDate(today.getDate() + (6 - today.getDay())); // Re-align to next Saturday

    const gridData = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = getLocalStr(current);
      const isFuture = dateStr > todayStr;

      let level = -1; // -1 means invisible/future
      let count = 0;
      if (!isFuture) {
        const tasksOnDate = tasks.filter((t) => t.date === dateStr);
        if (tasksOnDate.length === 0) {
          level = 0;
        } else {
          const completed = tasksOnDate.filter((t) => t.completed).length;
          count = completed;
          const ratio = completed / tasksOnDate.length;
          if (ratio > 0.75) level = 4;
          else if (ratio > 0.5) level = 3;
          else if (ratio > 0.25) level = 2;
          else if (ratio > 0) level = 1;
        }
      }

      gridData.push({
        date: dateStr,
        dateObj: new Date(current),
        level,
        count,
      });
      current.setDate(current.getDate() + 1);
    }

    // Chunk into weeks (arrays of 7 days)
    const wks = [];
    for (let i = 0; i < gridData.length; i += 7) {
      wks.push(gridData.slice(i, i + 7));
    }

    // Calculate overall stats
    let currentStreakCounter = 0;
    let maxStrk = 0;
    let activeD = 0;

    gridData.forEach((d) => {
      if (d.level > 0) {
        activeD++;
        currentStreakCounter++;
        maxStrk = Math.max(maxStrk, currentStreakCounter);
      } else if (d.level === 0) {
        currentStreakCounter = 0;
      }
    });

    return { weeks: wks, activeDays: activeD, maxStreak: maxStrk };
  }, [tasks]);

  const getHeatmapColor = (level: number) => {
    // LeetCode / GitHub green scale on dark background, no borders
    const colors: Record<number, string> = {
      0: "bg-[#ebedf0] dark:bg-[#333333]",
      1: "bg-[#9be9a8] dark:bg-[#0e4429]",
      2: "bg-[#40c463] dark:bg-[#006d32]",
      3: "bg-[#30a14e] dark:bg-[#26a641]",
      4: "bg-[#216e39] dark:bg-[#39d353]",
    };
    return colors[level];
  };

  const handleMouseEnter = (e: React.MouseEvent, data: any) => {
    if (!gridRef.current) return;
    const targetRect = e.currentTarget.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    // Calculate absolute center of the hovered square relative to the grid wrapper
    const x = targetRect.left - gridRect.left + targetRect.width / 2;
    const y = targetRect.top - gridRect.top;

    // Detect edges to flip tooltip alignment and prevent clipping
    let align: "left" | "center" | "right" = "center";
    if (x < 70) align = "left";
    else if (x > gridRect.width - 70) align = "right";

    const content = `${data.count} ${data.count === 1 ? "task" : "tasks"} on ${data.dateObj.toLocaleString("en-US", { month: "short" })} ${data.dateObj.getDate()}, ${data.dateObj.getFullYear()}`;
    setTooltip({ x, y, content, align, targetWidth: targetRect.width });
  };

  return (
    <div
      ref={gridRef}
      className="bg-white dark:bg-[#282828] border border-[#f0f0f0] dark:border-[#333] p-6 rounded-2xl shadow-sm relative"
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h4 className="font-bold text-lg flex items-center gap-2">
          <Calendar size={20} className="text-slate-400" /> Consistency Grid
        </h4>
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          <span>
            Total active days:{" "}
            <strong className="text-slate-900 dark:text-white">
              {activeDays}
            </strong>
          </span>
          <span>
            Max streak:{" "}
            <strong className="text-slate-900 dark:text-white">
              {maxStreak}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Y-Axis: Weekday Labels */}
        <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 font-medium hidden md:flex pr-1 text-right mt-0">
          <span className="h-3.5 flex items-center justify-end">Sun</span>
          <span className="h-3.5 flex items-center justify-end opacity-0">
            Mon
          </span>
          <span className="h-3.5 flex items-center justify-end">Tue</span>
          <span className="h-3.5 flex items-center justify-end opacity-0">
            Wed
          </span>
          <span className="h-3.5 flex items-center justify-end">Thu</span>
          <span className="h-3.5 flex items-center justify-end opacity-0">
            Fri
          </span>
          <span className="h-3.5 flex items-center justify-end">Sat</span>
        </div>

        {/* Scrollable Heatmap */}
        <div
          className="w-full overflow-x-auto pb-2 scrollbar-hide"
          style={{ direction: "rtl" }}
          onScroll={() => setTooltip(null)}
        >
          <div
            className="min-w-max flex flex-col gap-1.5"
            style={{ direction: "ltr" }}
          >
            {/* Main Grid: Rendered by Weeks (Columns) */}
            <div className="flex gap-1.5" onMouseLeave={() => setTooltip(null)}>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  {week.map((data) => (
                    <div
                      key={data.date}
                      className={`w-3.5 h-3.5 rounded-sm ${data.level === -1 ? "bg-transparent" : getHeatmapColor(data.level)} ${data.level !== -1 ? "transition-transform hover:scale-110 cursor-pointer" : ""}`}
                      onMouseEnter={
                        data.level !== -1
                          ? (e) => handleMouseEnter(e, data)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* X-Axis: Month Labels */}
            <div className="flex gap-1.5 text-[10px] text-slate-400 font-medium h-4 relative mt-1">
              {weeks.map((week, i) => {
                const firstDayOfMonth = week.find(
                  (d) => d.dateObj.getDate() === 1,
                );
                const monthStr = firstDayOfMonth
                  ? firstDayOfMonth.dateObj.toLocaleString("en-US", {
                      month: "short",
                    })
                  : i === 0
                    ? week[0].dateObj.toLocaleString("en-US", {
                        month: "short",
                      })
                    : null;

                return (
                  <div key={`month-${i}`} className="w-3.5 shrink-0 relative">
                    {monthStr && (
                      <span className="absolute left-0">{monthStr}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-4 text-xs font-medium text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={`w-3.5 h-3.5 rounded-[3px] ${getHeatmapColor(l)} shadow-sm`}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Floating Tooltip - Completely immune to scroll clipping */}
      {tooltip && (
        <div
          className="absolute bg-[#303030] text-[#f0f0f0] text-[11px] font-medium px-2.5 py-1.5 rounded-md z-[100] shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-150"
          style={{
            top: tooltip.y - 6,
            ...(tooltip.align === "center"
              ? { left: tooltip.x, transform: "translate(-50%, -100%)" }
              : {}),
            ...(tooltip.align === "left"
              ? {
                  left: tooltip.x - tooltip.targetWidth / 2,
                  transform: "translate(0, -100%)",
                }
              : {}),
            ...(tooltip.align === "right"
              ? {
                  left: tooltip.x + tooltip.targetWidth / 2,
                  transform: "translate(-100%, -100%)",
                }
              : {}),
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// --- 1. Dashboard View ---
interface DashboardProps {
  tasks: Task[];
  categories: Category[];
  toggleTask: (id: string) => void;
}

function Dashboard({ tasks, categories, toggleTask }: DashboardProps) {
  const today = getTodayStr();
  const todayTasks = tasks.filter((t) => t.date === today);
  const tasksCompleted = todayTasks.filter((t) => t.completed).length;
  const overallProgress = todayTasks.length
    ? Math.round((tasksCompleted / todayTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold">{getGreeting()}! 👋</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base italic">
          "Consistency is the architecture of success."
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CategoryGridCard
          name="Overall Journey"
          icon="Trophy"
          progress={overallProgress}
          color="emerald"
          streak={0}
        />
        {categories.map((c) => {
          const cTasks = todayTasks.filter((t) => t.categoryId === c.id);
          const cCompleted = cTasks.filter((t) => t.completed).length;
          const progress = cTasks.length
            ? Math.round((cCompleted / cTasks.length) * 100)
            : 0;
          return (
            <CategoryGridCard
              key={c.id}
              name={c.name}
              icon={c.icon}
              progress={progress}
              color={c.color}
              streak={c.currentStreak}
            />
          );
        })}
      </div>

      {/* Moved Consistency Grid to Dashboard directly below the category progress */}
      <ConsistencyGrid tasks={tasks} />

      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Flame className="text-orange-500" size={24} /> Up Next Today
        </h3>
        <div className="space-y-3 max-w-3xl">
          {todayTasks
            .filter((t) => !t.completed)
            .slice(0, 4)
            .map((task) => {
              const cat = categories.find((c) => c.id === task.categoryId);
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  categoryName={cat?.name}
                  categoryIcon={cat?.icon}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  isFirst={true}
                  isLast={true}
                  hideActions={true}
                />
              );
            })}

          {todayTasks.filter((t) => !t.completed).length === 0 && (
            <div className="text-center p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 flex flex-col items-center gap-2 max-w-3xl">
              <CheckCircle2 size={32} className="text-emerald-500" />
              <p className="font-medium">All caught up for today! 🎉</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CategoryGridCardProps {
  name: string;
  icon: string;
  progress: number;
  color: string;
  streak: number;
}

function CategoryGridCard({
  name,
  icon,
  progress,
  color,
  streak,
}: CategoryGridCardProps) {
  const colors: Record<string, string> = {
    emerald: "text-[#10b981] stroke-[#10b981]",
    blue: "text-[#3b82f6] stroke-[#3b82f6]",
    amber: "text-[#f59e0b] stroke-[#f59e0b]",
    purple: "text-[#8b5cf6] stroke-[#8b5cf6]",
    rose: "text-[#f43f5e] stroke-[#f43f5e]",
    cyan: "text-[#06b6d4] stroke-[#06b6d4]",
    indigo: "text-[#6366f1] stroke-[#6366f1]",
    orange: "text-[#f97316] stroke-[#f97316]",
    pink: "text-[#ec4899] stroke-[#ec4899]",
    teal: "text-[#14b8a6] stroke-[#14b8a6]",
  };
  const cClass = colors[color] || colors.emerald;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white dark:bg-[#1e2736] rounded-2xl p-5 flex flex-col items-center justify-center gap-5 shadow-sm border border-slate-200 dark:border-[#2e3b4e] relative transition-transform hover:scale-[1.02]">
      {name !== "Overall Journey" && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full">
          <Flame size={14} /> {streak}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mt-2 w-full px-1">
        <span className={`shrink-0 ${cClass.split(" ")[0]}`}>
          <DynamicIcon name={icon} size={16} />
        </span>
        <span className="truncate">{name}</span>
      </div>

      <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center mb-2">
        <svg
          className="w-full h-full transform -rotate-90 drop-shadow-sm"
          viewBox="0 0 96 96"
        >
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-100 dark:stroke-[#2e3b4e]"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className={`${cClass.split(" ")[1]} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl md:text-2xl font-black dark:text-white">
          {progress}%
        </span>
      </div>
    </div>
  );
}

// --- 2. Tasks View ---
interface TasksListProps {
  tasks: Task[];
  categories: Category[];
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  openEditModal: (task: Task) => void;
  swapTaskOrder: (id1: string, id2: string) => void;
}

function TasksList({
  tasks,
  categories,
  toggleTask,
  deleteTask,
  openEditModal,
  swapTaskOrder,
}: TasksListProps) {
  const [filterTab, setFilterTab] = useState<"pending" | "completed">(
    "pending",
  );

  const filteredTasks = tasks.filter((t) =>
    filterTab === "completed" ? t.completed : !t.completed,
  );

  // Sorting strictly by our custom order index
  const sortedTasks = [...filteredTasks].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  const moveTaskVisual = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      swapTaskOrder(sortedTasks[index].id, sortedTasks[index - 1].id);
    } else if (direction === "down" && index < sortedTasks.length - 1) {
      swapTaskOrder(sortedTasks[index].id, sortedTasks[index + 1].id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-slate-500 text-sm mt-1">
            {tasks.filter((t) => !t.completed).length} pending tasks
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-full md:w-auto">
          <button
            onClick={() => setFilterTab("pending")}
            className={`flex-1 md:px-6 py-1.5 rounded-md text-sm font-bold transition-all ${filterTab === "pending" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterTab("completed")}
            className={`flex-1 md:px-6 py-1.5 rounded-md text-sm font-bold transition-all ${filterTab === "completed" ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
        {sortedTasks.map((task, index) => {
          const cat = categories.find((c) => c.id === task.categoryId);
          return (
            <TaskItem
              key={task.id}
              task={task}
              categoryName={cat?.name}
              categoryIcon={cat?.icon}
              categoryColor={cat?.color}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              onEdit={() => openEditModal(task)}
              onMoveUp={() => moveTaskVisual(index, "up")}
              onMoveDown={() => moveTaskVisual(index, "down")}
              isFirst={index === 0}
              isLast={index === sortedTasks.length - 1}
              hideActions={false}
            />
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="text-center p-10 text-slate-500">
            {filterTab === "pending"
              ? "All clear! Add a new task to get started."
              : "No completed tasks yet."}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  hideActions: boolean;
}

function TaskItem({
  task,
  categoryName,
  categoryIcon,
  categoryColor,
  onToggle,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  hideActions,
}: TaskItemProps) {
  return (
    <div className="group flex items-start gap-3 p-3 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 focus:outline-none group/btn"
      >
        {task.completed ? (
          <CheckCircle2 className="text-emerald-500" size={20} />
        ) : (
          <div
            className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-500 flex items-center justify-center ${task.priority === "High" ? "border-red-400 bg-red-50 dark:bg-red-500/10" : task.priority === "Medium" ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10" : ""}`}
          >
            <CheckCircle2
              className="text-slate-400 opacity-0 group-hover/btn:opacity-100 transition-opacity"
              size={14}
            />
          </div>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <h4
          className={`text-sm md:text-base font-medium ${task.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-200"}`}
        >
          {task.title}
        </h4>
        {categoryName && categoryIcon && !task.completed && (
          <p
            className={`text-xs flex items-center gap-1 mt-1 font-medium ${categoryColor ? `text-${categoryColor}-500` : "text-slate-500"}`}
          >
            <DynamicIcon name={categoryIcon} size={12} /> {categoryName}
          </p>
        )}
      </div>

      {/* Actions */}
      {!hideActions && (
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {/* Reordering Arrows */}
          <div className="flex flex-col mr-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={isFirst}
              className="p-0.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={isLast}
              className="p-0.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {!task.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- 3. Categories Management View ---
interface CategoriesListProps {
  categories: Category[];
  tasks: Task[];
  deleteCategory: (id: string) => void;
  openEditModal: (category: Category) => void;
}

function CategoriesList({
  categories,
  tasks,
  deleteCategory,
  openEditModal,
}: CategoriesListProps) {
  const getCategoryColors = (color: string) => {
    const map: Record<string, string> = {
      emerald: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500",
      blue: "bg-blue-100 dark:bg-blue-500/20 text-blue-500",
      amber: "bg-amber-100 dark:bg-amber-500/20 text-amber-500",
      purple: "bg-purple-100 dark:bg-purple-500/20 text-purple-500",
      rose: "bg-rose-100 dark:bg-rose-500/20 text-rose-500",
      cyan: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-500",
      indigo: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500",
      orange: "bg-orange-100 dark:bg-orange-500/20 text-orange-500",
      pink: "bg-pink-100 dark:bg-pink-500/20 text-pink-500",
      teal: "bg-teal-100 dark:bg-teal-500/20 text-teal-500",
    };
    return map[color] || map.emerald;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-3xl mx-auto">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold">Categories</h2>
        <p className="text-slate-500 text-sm mt-1">
          Manage your tracking categories
        </p>
      </div>

      <div className="space-y-3 pb-10">
        {categories.map((cat) => {
          const cTasks = tasks.filter((t) => t.categoryId === cat.id);
          const cCompleted = cTasks.filter((t) => t.completed).length;

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColors(cat.color)}`}
                >
                  <DynamicIcon name={cat.icon} size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold">{cat.name}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span>
                      {cCompleted}/{cTasks.length} Tasks
                    </span>
                    <span className="flex items-center gap-1 text-orange-500">
                      <Flame size={12} /> {cat.currentStreak} Streak
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-1.5 text-slate-400 hover:text-indigo-500"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="text-center p-10 text-slate-500">
            No categories created yet.
          </div>
        )}
      </div>
    </div>
  );
}

// --- 4. Pomodoro Timer ---
interface PomodoroTimerProps {
  onComplete: () => void;
}

function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [workTime, setWorkTime] = useState<number>(25);
  const [breakTime, setBreakTime] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number>(workTime * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (isActive && timeLeft <= 0) {
      handleComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!isActive)
      setTimeLeft(mode === "work" ? workTime * 60 : breakTime * 60);
  }, [workTime, breakTime, mode, isActive]);

  const handleComplete = () => {
    setIsActive(false);
    if (mode === "work") {
      onComplete(); // Award points
      setMode("break");
      setTimeLeft(breakTime * 60);
    } else {
      setMode("work");
      setTimeLeft(workTime * 60);
    }
  };

  const skipSession = () => {
    setIsActive(false);
    setMode(mode === "work" ? "break" : "work");
    setTimeLeft(mode === "work" ? breakTime * 60 : workTime * 60);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalTime = mode === "work" ? workTime * 60 : breakTime * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const colorClass =
    mode === "work"
      ? "text-indigo-500 stroke-indigo-500"
      : "text-emerald-500 stroke-emerald-500";

  return (
    <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 pb-10">
      <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-full p-1 mb-10 shadow-sm">
        <button
          onClick={() => {
            setMode("work");
            setIsActive(false);
          }}
          className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${mode === "work" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          Focus
        </button>
        <button
          onClick={() => {
            setMode("break");
            setIsActive(false);
          }}
          className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${mode === "break" ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          Break
        </button>
      </div>

      <div className="relative w-80 h-80 flex items-center justify-center mb-12">
        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
          <circle
            cx="160"
            cy="160"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="160"
            cy="160"
            r={radius}
            className={`${colorClass} transition-all duration-1000 linear`}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-7xl font-light tracking-tighter tabular-nums font-mono text-slate-900 dark:text-slate-100">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-[0.2em]">
            {mode === "work" ? "Deep Work" : "Rest"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-8 relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-14 h-14 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <Settings size={28} />
        </button>
        <button
          onClick={toggleTimer}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${mode === "work" ? "bg-indigo-500 shadow-indigo-500/30" : "bg-emerald-500 shadow-emerald-500/30"}`}
        >
          {isActive ? (
            <Pause size={36} fill="currentColor" />
          ) : (
            <Play size={36} fill="currentColor" className="ml-2" />
          )}
        </button>
        <button
          onClick={skipSession}
          className="w-14 h-14 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <SkipForward size={28} />
        </button>

        {showSettings && (
          <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 z-50">
            <h4 className="font-bold text-lg mb-4 text-center">Settings</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Work Time (min)</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={workTime}
                  onChange={(e) => setWorkTime(Number(e.target.value))}
                  className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Break Time (min)</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={breakTime}
                  onChange={(e) => setBreakTime(Number(e.target.value))}
                  className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold mt-2 hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 5. Stats View ---
interface StatsViewProps {
  tasks: Task[];
  userStats: UserStats;
}

function StatsView({ tasks, userStats }: StatsViewProps) {
  const trendDays = useMemo(() => generateLastNDays(14), []);
  const graphWidth = 800;
  const graphHeight = 150;

  const trendPoints = trendDays.map((dateStr, i) => {
    const tasksOnDate = tasks.filter((t) => t.date === dateStr);
    if (tasksOnDate.length === 0)
      return { x: (i / 13) * graphWidth, y: graphHeight };
    const ratio =
      tasksOnDate.filter((t) => t.completed).length / tasksOnDate.length;
    return { x: (i / 13) * graphWidth, y: graphHeight - ratio * graphHeight };
  });

  const pathData = `M ${trendPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaData = `${pathData} L ${graphWidth},${graphHeight} L 0,${graphHeight} Z`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-3xl font-bold">Progress & Stats</h2>
        <p className="text-slate-500 text-sm mt-1">
          Visualize your consistency
        </p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div>
            <p className="text-white/80 font-semibold tracking-wider uppercase text-sm mb-1">
              Total Score
            </p>
            <h3 className="text-5xl font-black">
              {userStats.points}{" "}
              <span className="text-xl font-medium opacity-80 lowercase">
                pts
              </span>
            </h3>
          </div>
          <div className="hidden md:flex w-20 h-20 rounded-full bg-white/20 items-center justify-center backdrop-blur-md shadow-inner">
            <Trophy size={40} className="text-amber-300 drop-shadow-sm" />
          </div>
        </div>

        <div className="relative z-10 mt-8">
          <div className="flex justify-between text-sm mb-2 font-bold tracking-wide">
            <span>Level {userStats.level}</span>
            <span>Level {userStats.level + 1}</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${userStats.points % 100}%` }}
            />
          </div>
        </div>
        <div className="absolute top-[-40%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm overflow-hidden">
        <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-500" /> 14-Day Task
          Performance
        </h4>
        <div className="relative w-full h-40">
          <svg
            viewBox={`0 -10 ${graphWidth} ${graphHeight + 20}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaData} fill="url(#trendGradient)" />
            <path
              d={pathData}
              fill="none"
              stroke="#6366f1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {trendPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="5"
                className="fill-white dark:fill-slate-900 stroke-indigo-500 stroke-[3px]"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

// --- 6. Shared Add/Edit Modal ---
interface AddModalProps {
  type: ItemType;
  onClose: () => void;
  onAdd: (type: ItemType, data: Partial<Task> | Partial<Category>) => void;
  editData: any;
  categories: Category[];
  tasks: Task[];
}

function AddModal({
  type,
  onClose,
  onAdd,
  editData,
  categories,
  tasks,
}: AddModalProps) {
  const [localType, setLocalType] = useState<ItemType>(type);

  // Task State
  const [title, setTitle] = useState<string>(
    editData?.title || editData?.name || "",
  );
  const [priority, setPriority] = useState<Priority>(
    editData?.priority || "Medium",
  );
  const [categoryId, setCategoryId] = useState<string>(
    editData?.categoryId || "",
  );

  // Category State
  const [icon, setIcon] = useState<string>(editData?.icon || "Database");
  const [color, setColor] = useState<string>(editData?.color || "blue");

  const COLOR_OPTIONS = [
    "blue",
    "emerald",
    "amber",
    "purple",
    "rose",
    "cyan",
    "indigo",
    "orange",
    "pink",
    "teal",
  ];

  const getBgColorClass = (c: string) => {
    const map: Record<string, string> = {
      emerald: "bg-emerald-500",
      blue: "bg-blue-500",
      amber: "bg-amber-500",
      purple: "bg-purple-500",
      rose: "bg-rose-500",
      cyan: "bg-cyan-500",
      indigo: "bg-indigo-500",
      orange: "bg-orange-500",
      pink: "bg-pink-500",
      teal: "bg-teal-500",
    };
    return map[c] || "bg-emerald-500";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (localType === "task") {
      onAdd("task", { title, priority, categoryId: categoryId || null });
    } else {
      onAdd("category", { name: title, icon, color });
    }
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 md:p-8 pb-10 animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {editData ? "Edit" : "New"}{" "}
            {localType === "task" ? "Task" : "Category"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!editData && (
          <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg w-full mb-6">
            <button
              type="button"
              onClick={() => setLocalType("task")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${localType === "task" ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-500" : "text-slate-500"}`}
            >
              Task
            </button>
            <button
              type="button"
              onClick={() => setLocalType("category")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${localType === "category" ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600" : "text-slate-500"}`}
            >
              Category
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              autoFocus
              type="text"
              placeholder={
                localType === "task"
                  ? "e.g., Read documentation"
                  : "e.g., SQL Mastery"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 px-1 py-2 outline-none text-slate-900 dark:text-slate-100 text-lg transition-colors"
            />
          </div>

          {localType === "task" && (
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-md text-sm font-bold border transition-all ${priority === p ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-500" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 outline-none text-sm text-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Standalone Task</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {localType === "category" && (
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "Database",
                    "Code",
                    "BookOpen",
                    "Briefcase",
                    "Palette",
                    "MonitorPlay",
                  ].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`p-2.5 rounded-lg border transition-all ${icon === i ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500"}`}
                    >
                      <DynamicIcon name={i} size={18} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Color Theme
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full ${getBgColorClass(c)} transition-transform ${color === c ? "ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 scale-110" : "hover:scale-110"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold py-3.5 rounded-lg transition-all mt-8"
          >
            {editData ? "Update" : "Create"}{" "}
            {localType === "task" ? "Task" : "Category"}
          </button>
        </form>
      </div>
    </div>
  );
}
