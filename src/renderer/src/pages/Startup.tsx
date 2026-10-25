import { useState, useEffect } from "react";
import { Rocket, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";

interface StartupApp {
  name: string;
  command: string;
  enabled: boolean;
}

export function Startup() {
  const [apps, setApps] = useState<StartupApp[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Автозагрузка</h1>
        <p className="text-white/50">Управляйте программами, которые запускаются вместе с Windows.</p>
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