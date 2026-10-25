import { Home, Trash2, Zap, Rocket, Network, Settings, ShieldAlert, LifeBuoy } from "lucide-react";
import { cn } from "../lib/utils";

const menuItems = [
  { id: "home", label: "Главная", icon: Home },
  { id: "cleanup", label: "Очистка", icon: Trash2 },
  { id: "optimize", label: "Оптимизация", icon: Zap },
  { id: "startup", label: "Автозагрузка", icon: Rocket },
  { id: "network", label: "Сеть", icon: Network },
  { id: "settings", label: "Настройки", icon: Settings },
  { id: "support", label: "Поддержка", icon: LifeBuoy }, // <--- НОВАЯ ВКЛАДКА
];

export function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <aside className="w-64 h-full glass-panel border-r border-white/5 flex flex-col p-4 relative z-20">
      {/* Логотип */}
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-8 h-8 relative">
           <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg rotate-45 transform scale-75 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
           <div className="absolute inset-0 bg-gradient-to-tl from-purple-600 to-cyan-400 rounded-lg rotate-12 transform scale-50 opacity-80" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">AetherForge</h1>
          <p className="text-[10px] text-cyan-400/80 tracking-[0.2em] font-semibold">OPTIMIZER</p>
        </div>
      </div>

      {/* Меню */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group",
                isActive
                  ? "text-white bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-l-xl" />
              )}
              <Icon size={18} className={isActive ? "text-cyan-400" : "group-hover:text-white/80"} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Золотая плашка про Админа внизу */}
      <div className="mt-auto p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-2 mb-1 relative z-10">
          <ShieldAlert size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Запустите от Админа</span>
        </div>
        <p className="text-xs text-amber-400/60 relative z-10">Для полной работы всех функций оптимизатора.</p>
      </div>
    </aside>
  );
}
