import { useState, useEffect } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";

export function UpdateChecker() {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready">("idle");
  const [currentVersion, setCurrentVersion] = useState("...");
  const [version, setVersion] = useState("");
  const [url, setUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Получаем текущую версию при запуске
    (window as any).electron?.getVersion?.().then((v: string) => {
      if (v) setCurrentVersion(v);
    });

    // Слушаем прогресс скачивания из главного процесса
    (window as any).electron?.onCustomDownloadProgress?.((p: number) => {
      setProgress(p);
      if (p === 100) setStatus("ready");
    });
  }, []);

  const handleCheck = async () => {
    setStatus("checking");
    
    // Защита: если через 6 секунд нет ответа, сбрасываем кнопку
    const timeout = setTimeout(() => {
      setStatus("idle");
      alert("Сервер обновлений не отвечает. Проверьте интернет или попробуйте позже.");
    }, 6000);

    try {
      const res = await (window as any).electron?.checkForUpdates?.();
      clearTimeout(timeout); // Отменяем таймаут, так как ответ пришел
      
      if (res?.available && res.url) {
        setVersion(res.version);
        setUrl(res.url);
        setStatus("available");
      } else {
        setStatus("idle");
        if (res?.error) {
          alert("Ошибка проверки: " + res.error);
        } else {
          alert("У вас последняя версия!");
        }
      }
    } catch (e) {
      clearTimeout(timeout);
      setStatus("idle");
      alert("Ошибка сети при проверке обновлений.");
    }
  };

  const handleDownload = async () => {
    setStatus("downloading");
    setProgress(0);
    const res = await (window as any).electron?.downloadUpdate?.(url, version);
    if (res?.success) {
      setFilePath(res.path);
      setStatus("ready");
    } else {
      alert("Ошибка скачивания: " + res?.error);
      setStatus("available");
    }
  };

  const handleInstall = () => {
    (window as any).electron?.installUpdate?.(filePath);
  };

  // Состояние: Идет скачивание
  if (status === "downloading") {
    return (
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
        <div className="flex justify-between text-xs text-white/70">
          <span>Скачивание v{version}...</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  // Состояние: Скачано, готово к установке
  if (status === "ready") {
    return (
      <button 
        onClick={handleInstall} 
        className="w-full p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs whitespace-nowrap transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
      >
        <CheckCircle2 size={16} /> Установить v{version}
      </button>
    );
  }

  // Состояние: Ожидание или проверка
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
      <span className="text-sm text-white/70">v{currentVersion}</span>
      
      {status === "available" ? (
        <button 
          onClick={handleDownload} 
          className="text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
        >
          <Download size={14} /> Скачать v{version}
        </button>
      ) : status === "checking" ? (
        <span className="text-cyan-400 text-xs font-bold flex items-center gap-1">
          <Loader2 size={14} className="animate-spin" /> Проверка...
        </span>
      ) : (
        <button 
          onClick={handleCheck} 
          className="text-cyan-400 text-sm font-bold hover:underline"
        >
          Проверить
        </button>
      )}
    </div>
  );
}