import { MemoryStick, Loader2, Lock, Sparkles, Gamepad2, Zap, Shield, Wifi, HardDrive, Crown, Activity, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

interface ProToolsProps {
  userData?: { isPro?: boolean };
  onBuyPro: () => void;
}

export function ProTools({ userData, onBuyPro }: ProToolsProps) {
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);
  const [telemetryDisabled, setTelemetryDisabled] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isGameModeLoading, setIsGameModeLoading] = useState(false);
  const [gameModeActive, setGameModeActive] = useState(false);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [networkOptimized, setNetworkOptimized] = useState(false);
  
  // Состояния для SSD
  const [isSsdLoading, setIsSsdLoading] = useState(false);
  const [ssdResult, setSsdResult] = useState<number | null>(null);
  
  // Состояния для виджета GPU и Пинга
  const [gpuStats, setGpuStats] = useState({ load: 0, temp: 0 });
  const [ping, setPing] = useState(0);

  const isPro = userData?.isPro === true; 

  useEffect(() => {
    if (!isPro) return;
    // Обновляем данные каждые 2 секунды
    const interval = setInterval(async () => {
      const gpu = await (window as any).electron.getGpuStats();
      if (gpu) setGpuStats(gpu);
      
      const net = await (window as any).electron.getNetworkStats();
      if (net) setPing(net.ping);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPro]);

  const handleCleanRAM = async () => {
    if (!isPro) return alert("Доступно только в PRO!");
    setIsCleaning(true);
    try {
      const result = await (window as any).electron.cleanRamPro();
      if (result.success) alert('🚀 Оперативная память успешно очищена!');
      else alert('⚠️ ' + result.error);
    } catch (e) {
      alert('Ошибка. Убедитесь, что дали права Администратора.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleGameMode = async () => {
    if (!isPro) return alert("Доступно только в PRO!");
    setIsGameModeLoading(true);
    try {
      const result = await (window as any).electron.toggleGameModePro(!gameModeActive);
      if (result.success) {
        setGameModeActive(!gameModeActive);
        alert(result.message);
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert('Ошибка вызова Game Mode');
    } finally {
      setIsGameModeLoading(false);
    }
  };

  const handleTelemetry = async () => {
    if (!isPro) return alert("Доступно только в PRO!");
    setIsTelemetryLoading(true);
    try {
      const result = await (window as any).electron.toggleTelemetry(!telemetryDisabled);
      if (result.success) {
        setTelemetryDisabled(!telemetryDisabled);
        alert(result.message);
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert('Ошибка вызова телеметрии');
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  const handleNetworkTweak = async () => {
    if (!isPro) return alert("Доступно только в PRO!");
    setIsNetworkLoading(true);
    try {
      const result = await (window as any).electron.applyNetworkTweak();
      if (result.success) {
        setNetworkOptimized(true);
        alert(result.message);
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert('Ошибка сетевой оптимизации');
    } finally {
      setIsNetworkLoading(false);
    }
  };

  const handleCleanSSD = async () => {
    if (!isPro) return alert("Доступно только в PRO!");
    setIsSsdLoading(true);
    try {
      const result = await (window as any).electron.cleanSsdShaders();
      if (result.success) {
        setSsdResult(result.freedBytes);
        alert(result.message);
      } else {
        alert('⚠️ ' + result.error);
      }
    } catch (e) {
      alert('Ошибка очистки SSD');
    } finally {
      setIsSsdLoading(false);
    }
  };

  // Если у пользователя нет PRO — показываем заглушку
  if (!isPro) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
          <Lock size={48} className="text-amber-400" />
        </div>
        <h2 className="text-3xl font-bold text-[var(--text-main)] mb-3">Доступно только в PRO</h2>
        <p className="text-[var(--text-main)] opacity-60 max-w-md mb-8">
          Эти инструменты созданы для максимальной производительности. Купите PRO, чтобы разблокировать очистку RAM, Game Mode 2.0, сетевые твики и многое другое.
        </p>
        <button 
          onClick={onBuyPro}
          className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-all flex items-center gap-2"
        >
          <Crown size={20} /> Купить PRO
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1 flex items-center gap-2">
            PRO Инструменты <Sparkles className="text-amber-400" size={24} />
          </h1>
          <p className="opacity-50 text-sm text-[var(--text-main)]">Максимальная производительность вашего ПК.</p>
        </div>
        
        {/* ВИДЖЕТ МОНИТОРИНГА */}
        <div className="flex items-center gap-4 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-purple-400" />
            <div className="text-sm font-bold text-[var(--text-main)]">
              GPU: {gpuStats.load}% <span className="text-xs text-gray-400 font-normal">({gpuStats.temp}°C)</span>
            </div>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <div className="text-sm font-bold text-[var(--text-main)]">
              Ping: {ping} <span className="text-xs text-gray-400 font-normal">ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Карточка 1: Очистка RAM */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col ${isPro ? "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent" : "border-gray-700 bg-black/20 opacity-60"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPro ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-gray-700 text-gray-400"}`}>
              <MemoryStick size={20} />
            </div>
            {!isPro && <Lock className="text-gray-500" size={16} />}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Очистка RAM</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
            Сброс Standby List и Working Sets перед игрой.
          </p>
          <button 
            onClick={handleCleanRAM}
            disabled={isCleaning || !isPro}
            className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              !isPro ? "bg-gray-600 cursor-not-allowed opacity-50" : isCleaning ? "bg-white/10 cursor-wait" : "bg-gradient-to-r from-amber-500 to-yellow-600 hover:scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            }`}
          >
            {isCleaning ? <><Loader2 size={16} className="animate-spin" /> Очистка...</> : !isPro ? <><Lock size={16} /> Купить PRO</> : <><MemoryStick size={16} /> Очистить</>}
          </button>
        </div>

        {/* Карточка 2: Game Mode 2.0 */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col ${gameModeActive ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/20 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gameModeActive ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]" : "bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"}`}>
              <Gamepad2 size={20} />
            </div>
            {gameModeActive && <div className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full uppercase">Активен</div>}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Game Mode 2.0</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
            Отключение Xbox Game Bar и фоновых служб.
          </p>
          <button 
            onClick={handleGameMode}
            disabled={isGameModeLoading || !isPro}
            className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              !isPro ? "bg-gray-600 cursor-not-allowed opacity-50" : isGameModeLoading ? "bg-white/10 cursor-wait" : gameModeActive ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30" : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-[1.02] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            }`}
          >
            {isGameModeLoading ? <><Loader2 size={16} className="animate-spin" /> Настройка...</> : !isPro ? <><Lock size={16} /> Купить PRO</> : gameModeActive ? <><Zap size={16} /> Выключить</> : <><Zap size={16} /> Включить</>}
          </button>
        </div>

        {/* Карточка 3: Телеметрия */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col ${telemetryDisabled ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.15)]" : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${telemetryDisabled ? "bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]" : "bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"}`}>
              <Shield size={20} />
            </div>
            {telemetryDisabled && <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Откл.</div>}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Телеметрия</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
            Отключение DiagTrack и SysMain для снижения нагрузки.
          </p>
          <button 
            onClick={handleTelemetry}
            disabled={isTelemetryLoading || !isPro}
            className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              !isPro ? "bg-gray-600 cursor-not-allowed opacity-50" : isTelemetryLoading ? "bg-white/10 cursor-wait" : telemetryDisabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30" : "bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            }`}
          >
            {isTelemetryLoading ? <><Loader2 size={16} className="animate-spin" /> Настройка...</> : !isPro ? <><Lock size={16} /> Купить PRO</> : telemetryDisabled ? <><Shield size={16} /> Включить</> : <><Shield size={16} /> Отключить</>}
          </button>
        </div>

        {/* Карточка 4: Сетевая оптимизация */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col ${networkOptimized ? "border-blue-500/50 bg-gradient-to-br from-blue-500/20 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.15)]" : "border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${networkOptimized ? "bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]" : "bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"}`}>
              <Wifi size={20} />
            </div>
            {networkOptimized && <div className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full uppercase">Готово</div>}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Network Lag Reducer</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
            Отключение Nagle и сетевого троттлинга для снижения пинга.
          </p>
          <button 
            onClick={handleNetworkTweak}
            disabled={isNetworkLoading || !isPro}
            className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              !isPro ? "bg-gray-600 cursor-not-allowed opacity-50" : isNetworkLoading ? "bg-white/10 cursor-wait" : networkOptimized ? "bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30" : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            }`}
          >
            {isNetworkLoading ? <><Loader2 size={16} className="animate-spin" /> Настройка...</> : !isPro ? <><Lock size={16} /> Купить PRO</> : networkOptimized ? <><Wifi size={16} /> Включено</> : <><Wifi size={16} /> Применить твик</>}
          </button>
        </div>

        {/* Карточка 5: Очистка SSD */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col ${ssdResult !== null ? "border-indigo-500/50 bg-gradient-to-br from-indigo-500/20 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ssdResult !== null ? "bg-gradient-to-br from-indigo-400 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)]" : "bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"}`}>
              <HardDrive size={20} />
            </div>
            {ssdResult !== null && <div className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full uppercase">Готово</div>}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Очистка SSD</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-4 flex-1">
            Очистка кэша шейдеров (NVIDIA/AMD/DirectX) и запуск TRIM.
          </p>
          <button 
            onClick={handleCleanSSD}
            disabled={isSsdLoading || !isPro}
            className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              !isPro ? "bg-gray-600 cursor-not-allowed opacity-50" : isSsdLoading ? "bg-white/10 cursor-wait" : ssdResult !== null ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/30" : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            }`}
          >
            {isSsdLoading ? <><Loader2 size={16} className="animate-spin" /> Очистка...</> : !isPro ? <><Lock size={16} /> Купить PRO</> : ssdResult !== null ? <><HardDrive size={16} /> Очищено</> : <><HardDrive size={16} /> Очистить SSD</>}
          </button>
        </div>

        {/* Карточка 6: Мониторинг GPU */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <Activity size={20} />
            </div>
            <div className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full uppercase">LIVE</div>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Мониторинг</h3>
          <p className="text-xs text-[var(--text-main)] opacity-60 mb-3 flex-1">
            Нагрузка GPU: {gpuStats.load}% | Температура: {gpuStats.temp}°C | Пинг: {ping} ms
          </p>
          <div className="w-full bg-black/40 rounded-full h-2 mb-2 overflow-hidden">
             <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${gpuStats.load}%` }}></div>
          </div>
          <button 
            onClick={() => alert("Функция 'Оверлей поверх игр' будет добавлена в следующем обновлении!")}
            className="w-full py-2 rounded-lg text-sm font-bold text-white bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Monitor size={16} /> Настроить оверлей
          </button>
        </div>

      </div>

      {/* Плашка авто-клинера */}
      <div className="mt-8 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Activity size={16} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-main)]">Умный авто-клинер активен</p>
          <p className="text-xs text-[var(--text-main)] opacity-60">Лаунчер автоматически очищает RAM каждые 10 минут, если она забита.</p>
        </div>
      </div>
    </div>
  );
}