import { useState } from "react";
import { Settings2, Wifi, Bluetooth, Bell, MousePointer, Loader2 } from "lucide-react";

export function Tweaks() {
  const [loading, setLoading] = useState<string | null>(null);
  
  // Пока для теста ставим true (позже свяжем с Firebase)
  const isPro = true; 

  const handleTweak = async (action: string) => {
    setLoading(action);
    try {
      const result = await (window as any).electron.applyTweak(action);
      if (result.success) alert(result.message);
      else alert('⚠️ ' + result.error);
    } catch (e) {
      alert('Ошибка применения твика');
    } finally {
      setLoading(null);
    }
  };

  const tweaks = [
    { id: "disable-wifi", title: "Отключить Wi-Fi", desc: "Отключает беспроводной адаптер для снижения задержек.", icon: Wifi, color: "blue" },
    { id: "disable-bt", title: "Отключить Bluetooth", desc: "Отключает Bluetooth, чтобы он не мешал сети.", icon: Bluetooth, color: "indigo" },
    { id: "disable-notifications", title: "Тихий режим", desc: "Отключает все уведомления Windows на время игры.", icon: Bell, color: "orange" },
    { id: "classic-alt-tab", title: "Классический Alt+Tab", desc: "Убирает современные вкладки, ускоряя переключение окон.", icon: MousePointer, color: "purple" },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1 flex items-center gap-2">
          Твики Windows <Settings2 className="text-cyan-400" size={24} />
        </h1>
        <p className="opacity-50 text-sm text-[var(--text-main)]">Тонкая настройка системы одним кликом.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tweaks.map((tweak) => {
          const Icon = tweak.icon;
          const isLoading = loading === tweak.id;

          return (
            <div key={tweak.id} className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-white`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">{tweak.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
                {tweak.desc}
              </p>
              <button
                onClick={() => handleTweak(tweak.id)}
                disabled={isLoading}
                className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.02] ${
                  isLoading ? "opacity-50 cursor-wait" : ""
                }`}
              >
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Применение...</> : "Применить"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}