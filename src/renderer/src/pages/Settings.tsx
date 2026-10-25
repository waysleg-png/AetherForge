import { useState, useEffect } from "react";
import { Palette, Rocket, Bell, Globe, Info, ShieldCheck } from "lucide-react";
import { auth } from "../firebase";

export function Settings() {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [activeTheme, setActiveTheme] = useState("neon");
  const [lang, setLang] = useState("ru");

  // --- ЗАГРУЗКА НАСТРОЕК ПРИ СТАРТЕ ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "neon";
    setActiveTheme(savedTheme);
    document.body.className = `theme-${savedTheme}`;

    const savedLang = localStorage.getItem("app-lang") || "ru";
    setLang(savedLang);

    // Проверяем реальный статус автозапуска в Windows
    const checkAutoLaunch = async () => {
      const isEnabled = await (window as any).electron?.getAutoLaunch?.();
      if (isEnabled !== undefined) setAutoLaunch(isEnabled);
    };
    checkAutoLaunch();
  }, []);

  // --- СМЕНА ЯЗЫКА (Словарь) ---
  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem("app-lang", newLang);
    window.dispatchEvent(new Event("lang-changed")); // <--- ДОБАВИТЬ ЭТУ СТРОКУ
  };

  const t = {
    ru: {
      title: "Настройки",
      subtitle: "Персонализация и управление приложением.",
      appearance: "Внешний вид",
      appearanceDesc: "Выберите тему оформления интерфейса",
      themeDark: "Тёмный",
      themeDarkDesc: "Глубокий тёмный стиль",
      themeNeon: "Неон",
      themeNeonDesc: "Яркий неоновый стиль",
      themeMinimal: "Минимализм",
      themeMinimalDesc: "Легкий и сдержанный стиль",
      autoLaunch: "Автозапуск",
      autoLaunchDesc: "Запуск программы с системой",
      notifications: "Уведомления",
      notificationsDesc: "Настройка системных уведомлений",
      language: "Язык",
      languageDesc: "Выбор языка интерфейса",
      about: "О программе",
      aboutDesc: "Версия 1.0.0 • AetherForge",
      account: "Ваш аккаунт",
      logout: "Выйти из аккаунта"
    },
    en: {
      title: "Settings",
      subtitle: "Personalization and app management.",
      appearance: "Appearance",
      appearanceDesc: "Choose interface theme",
      themeDark: "Dark",
      themeDarkDesc: "Deep dark style",
      themeNeon: "Neon",
      themeNeonDesc: "Bright neon style",
      themeMinimal: "Minimalist",
      themeMinimalDesc: "Light and clean style",
      autoLaunch: "Auto Launch",
      autoLaunchDesc: "Launch app with system",
      notifications: "Notifications",
      notificationsDesc: "System notification settings",
      language: "Language",
      languageDesc: "Interface language",
      about: "About",
      aboutDesc: "Version 1.0.0 • AetherForge",
      account: "Your account",
      logout: "Log out"
    }
  }[lang as "ru" | "en"];

  // --- ДЕЙСТВИЯ ---
  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem("app-theme", themeId);
    document.body.className = `theme-${themeId}`;
  };

  const handleAutoLaunchToggle = async () => {
    const newValue = !autoLaunch;
    setAutoLaunch(newValue);
    try {
      await (window as any).electron?.setAutoLaunch(newValue);
    } catch (e) {
      console.error("Ошибка автозапуска:", e);
    }
  };

  const handleNotificationsToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    // Вызываем реальное системное уведомление для проверки
    if (newValue) {
      (window as any).electron?.testNotification?.();
    }
  };

  const themes = [
    { id: "dark", name: t.themeDark, desc: t.themeDarkDesc, colors: "bg-[#0f0f13] border-white/10" },
    { id: "neon", name: t.themeNeon, desc: t.themeNeonDesc, colors: "bg-[#0a0a0f] border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]" },
    { id: "minimalist", name: t.themeMinimal, desc: t.themeMinimalDesc, colors: "bg-[#f5f5f7] border-gray-300 text-black" },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-main)]">{t.title}</h1>
        <p className="opacity-50 text-[var(--text-main)]">{t.subtitle}</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Внешний вид */}
        <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Palette size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">{t.appearance}</h2>
              <p className="text-sm opacity-50 text-[var(--text-main)]">{t.appearanceDesc}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  activeTheme === theme.id ? "border-purple-500 bg-purple-500/10" : "border-[var(--panel-border)] hover:border-white/20 bg-black/20"
                }`}
              >
                <div className={`w-full h-16 rounded-lg mb-3 ${theme.colors} border flex items-center justify-center`}>
                  {activeTheme === theme.id && <ShieldCheck size={24} className={theme.id === 'minimalist' ? 'text-blue-500' : 'text-purple-400'} />}
                </div>
                <div className="font-medium text-[var(--text-main)]">{theme.name}</div>
                <div className="text-xs opacity-50 mt-1 text-[var(--text-main)]">{theme.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Переключатели */}
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Rocket size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">{t.autoLaunch}</h3>
                <p className="text-xs opacity-50 text-[var(--text-main)]">{t.autoLaunchDesc}</p>
              </div>
            </div>
            <button
              onClick={handleAutoLaunchToggle}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${autoLaunch ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoLaunch ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Bell size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">{t.notifications}</h3>
                <p className="text-xs opacity-50 text-[var(--text-main)]">{t.notificationsDesc}</p>
              </div>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${notifications ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Язык и О программе */}
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Globe size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">{t.language}</h3>
                <p className="text-xs opacity-50 text-[var(--text-main)]">{t.languageDesc}</p>
              </div>
            </div>
            <select 
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-black/50 border border-[var(--panel-border)] rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer text-[var(--text-main)]"
            >
              <option value="ru">🇷🇺 Русский</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Info size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">{t.about}</h3>
                <p className="text-xs opacity-50 text-[var(--text-main)]">{t.aboutDesc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Профиль */}
        <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex items-center justify-between mt-8">
          <div>
            <h3 className="font-semibold text-lg text-[var(--text-main)]">{t.account}</h3>
            <p className="text-sm opacity-50 text-[var(--text-main)]">{auth.currentUser?.email || "Гость"}</p>
          </div>
          <button 
            onClick={() => auth.signOut()} 
            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors font-medium text-sm"
          >
            {t.logout}
          </button>
        </div>

      </div>
    </div>
  );
}