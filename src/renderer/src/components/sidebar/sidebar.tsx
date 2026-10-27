import { Home, Trash2, Zap, Rocket, Network, Settings, LifeBuoy, ShieldCheck, Shield, User, Crown, Lock, Target, Settings2 } from "lucide-react";
import { UpdateChecker } from "../UpdateChecker"; // путь может быть "./UpdateChecker", если файл в той же папке

interface SidebarProps {
  active: string;
  onChange: (page: string) => void;
  lang?: string;
  isAdmin?: boolean;
  openTicketsCount?: number;
  isPro?: boolean;
}

export function Sidebar({ active, onChange, lang = "ru", isAdmin = false, openTicketsCount = 0, isPro = false }: SidebarProps) {
  const menuItems = [
    { id: "home", label: lang === "en" ? "Home" : "Главная", icon: Home },
    { id: "profile", label: lang === "en" ? "Profile" : "Профиль", icon: User },
    { id: "cleanup", label: lang === "en" ? "Cleanup" : "Очистка", icon: Trash2 },
    { id: "optimize", label: lang === "en" ? "Optimize" : "Оптимизация", icon: Zap },
    
    // НОВЫЙ ПУНКТ: Пресеты
    { id: "presets", label: lang === "en" ? "Game Presets" : "Пресеты", icon: Target },

    // ВКЛАДКА PRO
    { id: "pro", label: lang === "en" ? "PRO Tools" : "PRO Инструменты", icon: Crown },
    
    { id: "startup", label: lang === "en" ? "Startup" : "Автозагрузка", icon: Rocket },
    { id: "network", label: lang === "en" ? "Network" : "Сеть", icon: Network },
    
    // НОВЫЙ ПУНКТ: Твики
    { id: "tweaks", label: lang === "en" ? "Tweaks" : "Твики", icon: Settings2 },

    { id: "settings", label: lang === "en" ? "Settings" : "Настройки", icon: Settings },
    { id: "support", label: lang === "en" ? "Support" : "Поддержка", icon: LifeBuoy },
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/5 p-4 relative z-20">
      
      <div className="flex items-center gap-3 px-2 mb-10 mt-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="font-bold text-lg tracking-wide text-white">
          Aether<span className="text-purple-400">Forge</span>
        </span>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm ${
                isActive
                  // Если активна вкладка PRO, делаем ей золотую подсветку
                  ? item.id === "pro" 
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    // Если активна вкладка Пресеты, делаем ей красную подсветку
                    : item.id === "presets"
                      ? "bg-red-500/20 text-red-200 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      // Если активна вкладка Твики, делаем ей синюю подсветку
                      : item.id === "tweaks"
                        ? "bg-blue-500/20 text-blue-200 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        : "bg-purple-500/20 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                  : "text-gray-400 border border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon 
                size={20} 
                className={
                  isActive 
                    ? item.id === "pro"
                      ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" 
                      : item.id === "presets"
                        ? "text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        : item.id === "tweaks"
                          ? "text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                          : "text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" 
                    : ""
                } 
              />
              {item.label}
              
              {/* ЗАМОЧЕК ДЛЯ PRO, ЕСЛИ НЕТ ПОДПИСКИ */}
              {item.id === "pro" && !isPro && (
                <Lock size={12} className="ml-auto text-amber-500" />
              )}
            </button>
          );
        })}

        {/* Кнопка Админа */}
        {isAdmin && (
          <button
            onClick={() => onChange("admin")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm mt-4 relative ${
              active === "admin"
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                : "text-emerald-400/70 border border-transparent hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <Shield size={20} className={active === "admin" ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" : ""} />
            {lang === "en" ? "Admin Panel" : "Админ-панель"}
            
            {openTicketsCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">
                {openTicketsCount}
              </span>
            )}
          </button>
        )}
      </nav>

      <div className="mt-auto pt-6 space-y-3">
        <UpdateChecker />

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 cursor-default">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{lang === "en" ? "System Protected" : "Система защищена"}</div>
            <div className="text-xs text-emerald-400">{lang === "en" ? "Optimization active" : "Оптимизация активна"}</div>
          </div>
        </div>
      </div>

    </aside>
  );
}