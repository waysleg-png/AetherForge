import { useState, useEffect } from "react";
// Убрали AlertTriangle из импортов
import { Zap, Target, Rocket, Network, FileSearch, Gauge, History } from "lucide-react";
// Убрали orderBy и limit из импортов Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [health, setHealth] = useState(100);
  const [history, setHistory] = useState<any[]>([]);

  // 1. Получение статистики ПК
  useEffect(() => {
    const fetchStats = async () => {
      const stats = await (window as any).electron?.getSystemStats?.();
      if (stats) {
        const avgLoad = (stats.cpu + stats.ram + stats.disk) / 3;
        const realHealth = Math.max(0, Math.min(100, Math.round(100 - avgLoad)));
        setHealth(realHealth);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Получение истории из Firebase (БЕЗ ОШИБКИ ИНДЕКСА)
  useEffect(() => {
    const fetchHistory = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        // Запрашиваем только по userId (без сортировки в базе)
        const q = query(
          collection(db, "optimization_logs"),
          where("userId", "==", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Сортируем и берем 3 штуки прямо в JavaScript
        const logs = querySnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            date: doc.data().timestamp?.toDate().toLocaleString("ru-RU") || "Только что"
          }))
          .sort((a, b) => {
            // Сортируем по времени (новые сверху)
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
          })
          .slice(0, 3); // Оставляем только 3 последних

        setHistory(logs);
      } catch (error) {
        console.error("Ошибка загрузки истории:", error);
      }
    };
    
    setTimeout(fetchHistory, 1000); 
  }, []);

  const cards = [
    { title: "Быстрая очистка", desc: "Удаление временных файлов и мусора для мгновенного освобождения места.", icon: Zap, color: "from-cyan-400 to-blue-500", page: "cleanup" },
    { title: "Глубокая оптимизация", desc: "Анализ и тонкая настройка системы для максимальной производительности.", icon: Target, color: "from-purple-400 to-pink-500", page: "optimize" },
    { title: "Очистка автозагрузки", desc: "Управление программами автозагрузки для ускорения запуска системы.", icon: Rocket, color: "from-blue-400 to-cyan-500", page: "startup" },
    { title: "Оптимизация сети", desc: "Настройка сетевых параметров для стабильного и быстрого соединения.", icon: Network, color: "from-violet-400 to-purple-500", page: "network" },
    { title: "Глубокая очистка", desc: "Очистка кэша браузеров и системного мусора.", icon: FileSearch, color: "from-indigo-400 to-blue-500", page: "cleanup" },
    { title: "Ускорение системы", desc: "Комплексные инструменты для повышения скорости и отзывчивости ПК.", icon: Gauge, color: "from-cyan-400 to-teal-500", page: "optimize" },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto relative z-10">
      
      {/* Желтая плашка удалена, теперь контент начинается сразу с круга */}

      <div className="flex flex-col items-center mb-10 mt-4">
        <div className="relative w-52 h-52 mb-6">
          <svg className="w-full h-full -rotate-90 circle-glow" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#healthGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${health * 2.64} 264`} className="transition-all duration-1000" />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold mb-1">{health}%</span>
            <span className="text-[10px] opacity-50 uppercase tracking-widest text-center max-w-[120px] leading-tight">
              {health > 80 ? "Система в отличном состоянии" : health > 50 ? "Система в норме" : "Требуется оптимизация"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.title} onClick={() => onNavigate(card.page)} className="group relative p-6 rounded-2xl glass-panel hover:bg-white/[0.05] transition-all duration-300 text-left overflow-hidden hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:border-cyan-500/30">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className="text-white drop-shadow-md" />
              </div>
              <h3 className="text-base font-semibold mb-2">{card.title}</h3>
              <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500" />
            </button>
          );
        })}
      </div>

      {/* БЛОК ИСТОРИИ ОПТИМИЗАЦИЙ */}
      {history.length > 0 && (
        <div className="mt-10 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <History size={20} className="text-cyan-400" />
            Последние действия
          </h3>
          <div className="space-y-3">
            {history.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-white/90">{log.action}</span>
                  <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                    {log.status}
                  </span>
                </div>
                <div className="text-sm text-white/40">
                  {log.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}