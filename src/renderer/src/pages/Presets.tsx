import { useState } from "react";
import { Gamepad2, Zap, Loader2, Target, Shield, Rocket } from "lucide-react";

export function Presets() {
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = async (game: string) => {
    setIsLoading(true);
    setActivePreset(game);
    try {
      const result = await (window as any).electron.applyGamePreset(game);
      if (result.success) {
        alert(result.message);
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert('Ошибка применения пресета');
    } finally {
      setIsLoading(false);
    }
  };

  const presets = [
    { id: "cs2", title: "Counter-Strike 2", desc: "Закрывает браузеры, Discord, Telegram. Приоритет сети.", icon: Target, color: "orange" },
    { id: "valorant", title: "Valorant", desc: "Отключает Xbox Game Bar, закрывает фоновые приложения.", icon: Shield, color: "red" },
    { id: "cyberpunk", title: "Cyberpunk 2077", desc: "Освобождает RAM, закрывает всё лишнее, Game Mode.", icon: Zap, color: "yellow" },
    { id: "stream", title: "Режим Стримера", desc: "Оставляет OBS и Discord, закрывает браузеры.", icon: Rocket, color: "purple" },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1 flex items-center gap-2">
          Игровые Пресеты <Gamepad2 className="text-purple-400" size={24} />
        </h1>
        <p className="opacity-50 text-sm text-[var(--text-main)]">Настройте ПК одним кликом под вашу игру.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;
          
          return (
            <div key={preset.id} className={`p-4 rounded-xl border transition-all flex flex-col ${isActive ? "border-purple-500/50 bg-purple-500/10" : "border-[var(--panel-border)] bg-[var(--panel-bg)]"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 text-white`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">{preset.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
                {preset.desc}
              </p>
              <button
                onClick={() => applyPreset(preset.id)}
                disabled={isLoading && isActive}
                className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isActive ? "bg-purple-500/20 text-purple-400 border border-purple-500/50" : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-[1.02]"
                }`}
              >
                {isLoading && isActive ? <><Loader2 size={16} className="animate-spin" /> Применение...</> : isActive ? "Активен" : "Применить пресет"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}