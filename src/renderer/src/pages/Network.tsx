import { useState, useEffect } from "react";
import { Wifi, ArrowDown, ArrowUp, Activity, Globe } from "lucide-react";

export function Network() {
  // Добавили ping в стейт
  const [stats, setStats] = useState({ rx: 0, tx: 0, ip: "127.0.0.1", ping: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const data = await (window as any).electron?.getNetworkStats?.();
      if (data) setStats(data);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return "0 КБ/с";
    const k = 1024;
    const sizes = ["Б/с", "КБ/с", "МБ/с", "ГБ/с"];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Мониторинг сети</h1>
        <p className="opacity-50">Отслеживание входящего и исходящего трафика в реальном времени.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 max-w-4xl">
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><ArrowDown size={20} className="text-cyan-400" /></div>
            <h3 className="text-lg font-semibold">Скачивание</h3>
          </div>
          <div className="text-4xl font-bold mb-2 relative z-10">{formatSpeed(stats.rx)}</div>
          <p className="text-sm opacity-40 relative z-10">Входящий трафик</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><ArrowUp size={20} className="text-purple-400" /></div>
            <h3 className="text-lg font-semibold">Отдача</h3>
          </div>
          <div className="text-4xl font-bold mb-2 relative z-10">{formatSpeed(stats.tx)}</div>
          <p className="text-sm opacity-40 relative z-10">Исходящий трафик</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 max-w-4xl">
        <div className="p-5 rounded-2xl glass-panel flex flex-col items-center justify-center text-center">
          <Wifi size={32} className="text-emerald-400 mb-3" />
          <h3 className="font-medium mb-1">Статус сети</h3>
          <p className="text-sm text-emerald-400 font-semibold">Подключено</p>
        </div>
        <div className="p-5 rounded-2xl glass-panel flex flex-col items-center justify-center text-center">
          <Globe size={32} className="text-cyan-400 mb-3" />
          <h3 className="font-medium mb-1">IP Адрес</h3>
          <p className="text-sm opacity-50">{stats.ip}</p>
        </div>
        <div className="p-5 rounded-2xl glass-panel flex flex-col items-center justify-center text-center">
          <Activity size={32} className="text-purple-400 mb-3" />
          <h3 className="font-medium mb-1">Пинг</h3>
          <p className="text-sm opacity-50">{stats.ping > 0 ? `${stats.ping} мс` : "—"}</p>
        </div>
      </div>
    </div>
  );
}