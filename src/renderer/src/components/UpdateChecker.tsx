import { useState, useEffect } from "react";
import { Download, RefreshCw, CheckCircle2 } from "lucide-react";

export function UpdateChecker() {
  const [status, setStatus] = useState<"idle" | "checking" | "no-updates" | "downloading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [appVersion, setAppVersion] = useState("1.0.0");

  useEffect(() => {
    // Получаем актуальную версию из главного процесса
    const fetchVersion = async () => {
      try {
        const ver = await (window as any).electron?.getVersion?.();
        if (ver) setAppVersion(ver);
      } catch (e) {
        console.error("Не удалось получить версию:", e);
      }
    };
    fetchVersion();

    // Слушаем прогресс скачивания
    const unsubProgress = (window as any).electron?.onUpdateProgress?.((data: any) => {
      setStatus("downloading");
      setProgress(data.percent);
    });

    // Слушаем, когда обновление скачалось
    const unsubDownloaded = (window as any).electron?.onUpdateDownloaded?.(() => {
      setStatus("ready");
    });

    // Слушаем ошибки
    const unsubError = (window as any).electron?.onUpdateError?.((msg: string) => {
      setStatus("error");
      setErrorMsg(msg);
      setTimeout(() => setStatus("idle"), 5000);
    });

    return () => {
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, []);

  // Проверка обновлений по кнопке
  const handleCheck = async () => {
    setStatus("checking");
    try {
      const res = await (window as any).electron?.checkForUpdates?.();
      
      if (res?.available) {
        setStatus("downloading");
      } else {
        setStatus("no-updates");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (e) {
      setStatus("idle");
    }
  };

  // Установка и перезапуск
  const handleInstall = async () => {
    try {
      await (window as any).electron?.restartAndInstallUpdate?.();
    } catch (e) {
      console.error("Ошибка установки:", e);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 transition-all">
      
      <div className="flex items-center gap-2 text-xs text-white/50 min-w-0">
        <Download size={14} className="shrink-0" />
        
        {status === "downloading" ? (
          <span className="text-cyan-400 truncate">Скачивание {progress}%</span>
        ) : status === "ready" ? (
          <span className="text-emerald-400 truncate">Готово к установке</span>
        ) : status === "error" ? (
          <span className="text-red-400 truncate" title={errorMsg}>Ошибка</span>
        ) : (
          <span className="truncate">v{appVersion}</span>
        )}
      </div>

      {status === "downloading" ? (
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      ) : status === "ready" ? (
        <button
          onClick={handleInstall}
          className="text-xs px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.6)] font-semibold animate-pulse"
        >
          <CheckCircle2 size={14} /> Установить
        </button>
      ) : (
        <button
          onClick={handleCheck}
          disabled={status === "checking"}
          className={`text-xs px-2 py-1 rounded-md transition-all flex items-center gap-1 shrink-0 ${
            status === "checking" 
              ? "text-white/30" 
              : status === "no-updates"
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-cyan-400 hover:bg-cyan-500/10"
          }`}
        >
          {status === "checking" ? (
            <><RefreshCw size={12} className="animate-spin" /> Проверка...</>
          ) : status === "no-updates" ? (
            <><CheckCircle2 size={12} /> Актуально</>
          ) : (
            <>Проверить</>
          )}
        </button>
      )}
    </div>
  );
}