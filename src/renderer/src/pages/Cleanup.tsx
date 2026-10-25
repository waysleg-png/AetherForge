import { Folder, Globe, Trash2, RefreshCw, ShieldCheck, FileText, Box } from "lucide-react";
import { useState, useEffect } from "react";

export function Cleanup() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  
  const [sizes, setSizes] = useState({
    temp: 0, browser: 0, recycle: 0, logs: 0, update: 0, leftovers: 0
  });
  
  const [selected, setSelected] = useState({
    temp: true, browser: true, recycle: true, logs: true, update: true, leftovers: true
  });

  const fetchSizes = async () => {
    try {
      const data = await (window as any).electron?.getCleanupSizes?.();
      if (data && typeof data === 'object') {
        setSizes({
          temp: data.temp || 0,
          browser: data.browser || 0,
          recycle: data.recycle || 0,
          logs: data.logs || 0,
          update: data.update || 0,
          leftovers: data.leftovers || 0,
        });
      }
    } catch (e) {
      console.error("Ошибка при получении размеров:", e);
    }
  };

  useEffect(() => { fetchSizes(); }, []);

  const toggleCategory = (key: keyof typeof selected) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    setIsCleaned(false);
    
    const categoriesToClean = Object.keys(selected).filter(k => selected[k as keyof typeof selected]);
    
    const result = await (window as any).electron?.runCleanup?.(categoriesToClean);
    if (result?.success) {
      await fetchSizes();
      setIsCleaned(true);
      setTimeout(() => setIsCleaned(false), 3000);
    }
    setIsCleaning(false);
  };

  // ЗАЩИТА ОТ NaN и undefined
  const formatSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return "0 Б";
    const k = 1024;
    const sizesArr = ["Б", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizesArr[i];
  };

  const totalSelectedBytes = (Object.keys(selected) as Array<keyof typeof selected>)
    .filter(key => selected[key])
    .reduce((acc, key) => acc + (sizes[key] || 0), 0);

  const categories = [
    { key: "temp", title: "Временные файлы", desc: "Временные файлы приложений и системы", icon: Folder },
    { key: "browser", title: "Кэш браузеров", desc: "Кэш и временные файлы браузеров", icon: Globe },
    { key: "recycle", title: "Корзина", desc: "Удалённые файлы в корзине", icon: Trash2 },
    { key: "logs", title: "Логи Windows", desc: "Файлы журналов системы Windows", icon: FileText },
    { key: "update", title: "Обновления Windows", desc: "Загруженные файлы обновлений", icon: RefreshCw },
    { key: "leftovers", title: "Остатки программ", desc: "Остатки удалённых программ (Prefetch)", icon: Box },
  ];

  return (
    <div className="p-8 h-full flex flex-col relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Очистка системы</h1>
        <p className="opacity-50">Анализ и очистка ненужных файлов для освобождения места на диске.</p>
      </div>

      <div className="flex gap-10 flex-1">
        {/* Левая часть с кругом */}
        <div className="flex flex-col items-center justify-center w-80 shrink-0">
          <div className="relative w-64 h-64 mb-6">
            <svg className="w-full h-full -rotate-90 circle-glow" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle 
                cx="50" cy="50" r="42" fill="none" 
                stroke="url(#cleanGradient)" strokeWidth="6" strokeLinecap="round" 
                strokeDasharray={`${isCleaned ? 0 : 264} 264`} 
                className="transition-all duration-1000" 
              />
              <defs>
                <linearGradient id="cleanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCleaning ? (
                <RefreshCw size={40} className="text-cyan-400 animate-spin mb-2" />
              ) : isCleaned ? (
                <ShieldCheck size={48} className="text-emerald-400 mb-2" />
              ) : (
                <>
                  <span className="text-4xl font-bold text-center px-4">
                    {formatSize(totalSelectedBytes)}
                  </span>
                  <span className="text-xs opacity-50 mt-1 uppercase tracking-wider">можно освободить</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 py-2 px-4 rounded-full">
            <ShieldCheck size={16} /> 
            {isCleaned ? "Система очищена" : "Найдено 6 категорий"}
          </div>
        </div>

        {/* Правая часть со списком */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selected[cat.key as keyof typeof selected];
            const size = sizes[cat.key as keyof typeof sizes];

            return (
              <div key={cat.key} className={`flex items-center gap-4 p-4 rounded-xl glass-panel transition-all ${!isSelected ? 'opacity-50' : 'hover:bg-white/[0.05]'}`}>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium text-white">{cat.title}</div>
                  <div className="text-xs text-white/40 truncate">{cat.desc}</div>
                </div>
                <div className="text-sm font-medium text-white/70 w-24 text-right">
                  {isCleaned ? "0 Б" : formatSize(size)}
                </div>
                
                {/* Тумблер */}
                <button
                  onClick={() => toggleCategory(cat.key as keyof typeof selected)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isSelected ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSelected ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-6">
        <p className="text-sm text-white/40 flex items-center gap-2">
          <ShieldCheck size={16} /> Будут удалены только выбранные файлы. Системные файлы не затрагиваются.
        </p>
        <button 
          onClick={handleCleanup} 
          disabled={isCleaning || totalSelectedBytes === 0} 
          className={`px-8 py-3.5 rounded-xl font-semibold shadow-[0_0_30px_rgba(34,211,238,0.2)] transition-all flex items-center gap-2 ${
            isCleaning || totalSelectedBytes === 0 ? 'bg-white/10 cursor-not-allowed text-white/50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 text-white'
          }`}
        >
          {isCleaning ? <RefreshCw size={20} className="animate-spin" /> : <Trash2 size={20} />}
          {isCleaning ? "Очистка..." : "Очистить выбранное"}
        </button>
      </div>
    </div>
  );
}