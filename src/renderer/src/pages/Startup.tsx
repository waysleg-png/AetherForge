import { useState, useEffect } from "react";
import { Rocket, ShieldAlert, CheckCircle2, RefreshCw, Trash2, RotateCcw } from "lucide-react";

interface StartupApp {
  name: string;
  command: string;
  enabled: boolean;
}

export function Startup() {
  const [apps, setApps] = useState<StartupApp[]>([]);
  const [loading, setLoading] = useState(true);
  
  // СОСТОЯНИЯ ДЛЯ ЧИСТОГО ЗАПУСКА
  const [isCleaning, setIsCleaning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    const data = await (window as any).electron?.getStartupApps?.();
    if (data) setApps(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const toggleApp = async (app: StartupApp) => {
    const newEnabled = !app.enabled;
    setApps(prev => prev.map(a => a.name === app.name ? { ...a, enabled: newEnabled } : a));
    await (window as any).electron?.toggleStartupApp?.(app.name, app.command, newEnabled);
    fetchApps();
  };

  // ОБРАБОТЧИК: Чистый запуск (отключить всё лишнее)
  const handleCleanBoot = async () => {
    if (!confirm("Вы уверены, что хотите отключить все сторонние программы из автозагрузки? Это ускорит запуск Windows.")) return;
    setIsCleaning(true);
    try {
      const result = await (window as any).electron.cleanBoot();
      if (result.success) {
        alert(result.message);
        fetchApps(); // Обновляем список
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert("Ошибка при чистом запуске");
    } finally {
      setIsCleaning(false);
    }
  };

  // ОБРАБОТЧИК: Восстановить автозагрузку
  const handleRestoreBoot = async () => {
    if (!confirm("Восстановить все удаленные программы из автозагрузки?")) return;
    setIsRestoring(true);
    try {
      const result = await (window as any).electron.restoreBoot();
      if (result.success) {
        alert(result.message);
        fetchApps();
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert("Ошибка при восстановлении");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Автозагрузка</h1>
        <p className="text-white/50">Управляйте программами, которые запускаются вместе с Windows.</p>
      </div>

      {/* НОВЫЕ КНОПКИ УПРАВЛЕНИЯ */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={handleCleanBoot}
          disabled={isCleaning || isRestoring}
          className={`px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all ${
            isCleaning ? "opacity-50 cursor-wait" : "hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          }`}
        >
          {isCleaning ? <RefreshCw size={18} className="animate-spin" /> : <Rocket size={18} />}
          {isCleaning ? "Очистка..." : "🚀 Умный чистый запуск"}
        </button>
        
        <button 
          onClick={handleRestoreBoot}
          disabled={isCleaning || isRestoring}
          className={`px-5 py-2.5 bg-white/10 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all ${
            isRestoring ? "opacity-50 cursor-wait" : ""
          }`}
        >
          {isRestoring ? <RefreshCw size={18} className="animate-spin" /> : <RotateCcw size={18} />}
          {isRestoring ? "Восстановление..." : "🔄 Вернуть всё как было"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-white/50">
            <RefreshCw className="animate-spin mr-2" size={20} /> Загрузка списка...
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/50">
            <CheckCircle2 size={40} className="text-emerald-400 mb-2" />
            <p>Отлично! В автозагрузке нет лишних программ.</p>
          </div>
        ) : (
          apps.map((app) => (
            <div 
              key={app.name} 
              className={`flex items-center gap-4 p-4 rounded-xl glass-panel border transition-all ${app.enabled ? 'border-white/10' : 'border-red-500/20 opacity-70'}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${app.enabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                {app.enabled ? <Rocket size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{app.name}</div>
                <div className="text-xs text-white/40 truncate" title={app.command}>{app.command}</div>
              </div>
              
              <button
                onClick={() => toggleApp(app)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${app.enabled ? "bg-cyan-500" : "bg-white/20"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${app.enabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}