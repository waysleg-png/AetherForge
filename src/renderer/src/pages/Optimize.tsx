import { useState, useEffect } from "react";
import { Cpu, HardDrive, Wifi, Zap, Trash2, ShieldCheck, Loader2, Lock, Gamepad2, Rocket, Sparkles } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

export function Optimize() {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, network: 0 });
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [freedMb, setFreedMb] = useState<number>(0);
  
  const [isGameMode, setIsGameMode] = useState(false);
  const [isGameModeLoading, setIsGameModeLoading] = useState(false);

  // Состояния для Подготовки к игре
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareResult, setPrepareResult] = useState<{ freedMb: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await (window as any).electron?.getSystemStats?.();
      if (data) setStats(data);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGameModeToggle = async () => {
    const newValue = !isGameMode;
    setIsGameModeLoading(true);
    try {
      const res = await (window as any).electron?.toggleGameMode?.(newValue);
      if (res?.success) {
        setIsGameMode(newValue);
        const currentUser = auth.currentUser;
        await addDoc(collection(db, "optimization_logs"), {
          action: newValue ? "Game Mode ON" : "Game Mode OFF", 
          timestamp: serverTimestamp(), status: "success",
          userId: currentUser?.uid || "guest", userEmail: currentUser?.email || "Гость",
        });
      }
    } catch (e) { console.error(e); } 
    finally { setIsGameModeLoading(false); }
  };

  // ПОДГОТОВКА К ИГРЕ
  const handlePrepareForGaming = async () => {
    setIsPreparing(true);
    setPrepareResult(null);
    try {
      const res = await (window as any).electron?.prepareForGaming?.();
      if (res?.success) {
        setIsGameMode(true); // Синхронизируем тумблер Игрового режима
        setPrepareResult({ freedMb: Math.round((res.freedBytes || 0) / (1024 * 1024)) });
        
        const currentUser = auth.currentUser;
        await addDoc(collection(db, "optimization_logs"), {
          action: "Pre-Game Boost", timestamp: serverTimestamp(), status: "success",
          userId: currentUser?.uid || "guest", userEmail: currentUser?.email || "Гость",
        });
      }
    } catch (e) { console.error(e); } 
    finally { setIsPreparing(false); }
  };

  const handleStep1 = async () => {
    setIsLoading(true);
    try {
      const res = await (window as any).electron?.runOptimizationStep1?.();
      if (res?.success) {
        setStep(1);
        const currentUser = auth.currentUser;
        await addDoc(collection(db, "optimization_logs"), {
          action: "System Boost (Step 1)", timestamp: serverTimestamp(), status: "success",
          userId: currentUser?.uid || "guest", userEmail: currentUser?.email || "Гость",
        });
      }
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const handleStep2 = async () => {
    setIsLoading(true);
    try {
      const res = await (window as any).electron?.runOptimizationStep2?.();
      if (res?.success) {
        setStep(2);
        setFreedMb(Math.round((res.freedBytes || 0) / (1024 * 1024)));
        const currentUser = auth.currentUser;
        await addDoc(collection(db, "optimization_logs"), {
          action: "Deep Cleanup (Step 2)", timestamp: serverTimestamp(), status: "success",
          userId: currentUser?.uid || "guest", userEmail: currentUser?.email || "Гость",
        });
      }
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-main)] mb-1">Игровая оптимизация</h1>
        <p className="opacity-50 text-[var(--text-main)]">Двухэтапное ускорение и очистка вашего ПК.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Процессор (CPU)", value: stats.cpu, icon: Cpu },
          { label: "Память (RAM)", value: stats.ram, icon: Cpu }, // Заменил на Cpu, если MemoryStick удален
          { label: "Диск (C:)", value: stats.disk, icon: HardDrive },
          { label: "Сеть", value: stats.network, icon: Wifi },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-5 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3 text-[var(--text-main)] opacity-60">
                <Icon size={16} /> <span className="text-sm">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-[var(--text-main)] mb-2">{stat.value || 0}%</div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${stat.value > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} style={{ width: `${stat.value || 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ИГРОВОЙ РЕЖИМ */}
      <div className={`p-6 rounded-2xl border transition-all mb-6 flex items-center justify-between ${isGameMode ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "bg-[var(--panel-bg)] border-[var(--panel-border)]"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isGameMode ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"}`}>
            <Gamepad2 size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              Игровой режим {isGameMode && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase">Активен</span>}
            </h3>
            <p className="text-sm text-[var(--text-main)] opacity-60 mt-1 max-w-xl">
              Отключает второстепенные службы Windows (Печать, Факс, Поиск) для освобождения ОЗУ и ядер процессора.
            </p>
          </div>
        </div>
        <button
          onClick={handleGameModeToggle}
          disabled={isGameModeLoading}
          className={`w-16 h-8 rounded-full transition-colors relative shrink-0 ${isGameMode ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'bg-gray-600'} ${isGameModeLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isGameModeLoading ? (
            <Loader2 size={16} className="absolute top-2 left-6 animate-spin text-white" />
          ) : (
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${isGameMode ? 'left-9' : 'left-1'}`} />
          )}
        </button>
      </div>

      {/* НОВАЯ КАРТОЧКА: ПОДГОТОВКА К ИГРЕ */}
      <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent backdrop-blur-xl mb-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Rocket size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" /> Подготовка к игре
              </h3>
              <p className="text-sm text-[var(--text-main)] opacity-60 mt-1 max-w-2xl">
                Один клик: очистка кэшей шейдеров и обновлений Windows, включение Игрового режима, максимальное питание и сброс DNS. Идеально перед запуском игры.
              </p>
              {prepareResult && (
                <p className="text-sm text-emerald-400 mt-2 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Готово! Освобождено {prepareResult.freedMb} МБ. Игровой режим включен.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handlePrepareForGaming}
            disabled={isPreparing}
            className={`px-8 py-4 rounded-xl font-bold text-white shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 transition-all shrink-0 ${
              isPreparing 
                ? "bg-white/10 cursor-wait" 
                : "bg-gradient-to-r from-amber-400 to-orange-600 hover:scale-105"
            }`}
          >
            {isPreparing ? (
              <><Loader2 size={20} className="animate-spin" /> Подготовка...</>
            ) : (
              <><Rocket size={20} /> Готовить к игре</>
            )}
          </button>
        </div>
      </div>

      {/* Два шага */}
      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        <div className={`p-6 rounded-2xl border transition-all ${step >= 1 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-[var(--panel-bg)] border-[var(--panel-border)]"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step >= 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"}`}>
              {step >= 1 ? <ShieldCheck size={24} /> : <Zap size={24} />}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-[var(--text-main)] opacity-50">Шаг 1</div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Ускорение системы</h3>
            </div>
          </div>
          <p className="text-sm text-[var(--text-main)] opacity-60 mb-6 h-10">Настройка плана электропитания и очистка DNS-кэша.</p>
          <button onClick={handleStep1} disabled={isLoading || step >= 1} className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${step >= 1 ? "bg-emerald-500/20 text-emerald-400 cursor-default" : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-[1.02] shadow-lg disabled:opacity-50"}`}>
            {isLoading && step === 0 ? <Loader2 size={20} className="animate-spin" /> : step >= 1 ? <ShieldCheck size={20} /> : <Zap size={20} />}
            {step >= 1 ? "Ускорено!" : "Запустить ускорение"}
          </button>
        </div>

        <div className={`p-6 rounded-2xl border transition-all ${step === 2 ? "bg-emerald-500/10 border-emerald-500/30" : step === 1 ? "bg-[var(--panel-bg)] border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "bg-black/20 border-white/5 opacity-50"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step === 2 ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-400"}`}>
              {step === 2 ? <ShieldCheck size={24} /> : <Trash2 size={24} />}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-[var(--text-main)] opacity-50">Шаг 2</div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Глубокая очистка</h3>
            </div>
          </div>
          <p className="text-sm text-[var(--text-main)] opacity-60 mb-6 h-10">Удаление временных файлов TEMP, Prefetch и логов.</p>
          <button onClick={handleStep2} disabled={isLoading || step !== 1} className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${step === 2 ? "bg-emerald-500/20 text-emerald-400 cursor-default" : step === 1 ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:scale-[1.02] shadow-lg disabled:opacity-50" : "bg-white/5 text-white/30 cursor-not-allowed"}`}>
            {isLoading && step === 1 ? <Loader2 size={20} className="animate-spin" /> : step === 2 ? <ShieldCheck size={20} /> : step === 1 ? <Trash2 size={20} /> : <Lock size={20} />}
            {step === 2 ? "Очищено!" : step === 1 ? "Запустить очистку" : "Сначала выполните Шаг 1"}
          </button>
        </div>
      </div>

      {step === 2 && (
        <div className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">🎉 Система полностью оптимизирована!</h2>
          <p className="text-emerald-200/70">Мы освободили <b>{freedMb} МБ</b> и настроили ваш ПК для максимальной производительности.</p>
        </div>
      )}
    </div>
  );
}