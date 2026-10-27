import { Crown, Check, X, Zap } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  if (!isOpen) return null;

  const handlePayment = async () => {
    const user = auth.currentUser;
    // Передаем UID пользователя в параметре ?start=...
    const BOT_URL = `https://t.me/AetherForgeSupportBot?start=${user?.uid || "guest"}`;

    try {
      const success = await (window as any).electron?.openExternal?.(BOT_URL);
      if (!success) console.error("Не удалось открыть ссылку");
    } catch (e) {
      console.error("Ошибка открытия Telegram:", e);
    }
  };

  // НОВАЯ ФУНКЦИЯ: Тестовая активация PRO
  const handleTestPurchase = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Войдите в аккаунт!");
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { isPro: true });
      alert("🎉 Тестовый PRO активирован! Выйдите из аккаунта и зайдите снова, чтобы обновить профил.");
    } catch (e) {
      alert("Ошибка обновления базы: " + e);
    }
  };

  const features = [
    "Игровой режим 2.0 (отключение служб в 1 клик)",
    "Автоматическая очистка при запуске",
    "Эксклюзивные неоновые темы оформления",
    "Приоритетная поддержка (ответ за 5 минут)",
    "Ранний доступ к новым функциям",
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-8 rounded-3xl bg-[#0f0f13] border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
        
        {/* Золотое свечение на фоне */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -z-10" />

        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Crown size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">AetherForge PRO</h2>
          <p className="text-white/50 text-sm">Максимальная производительность и эксклюзивные функции.</p>
        </div>

        <div className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-white/80">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Check size={12} className="text-emerald-400" />
              </div>
              {feature}
            </div>
          ))}
        </div>

        <div className="flex items-end justify-center gap-2 mb-6">
          <span className="text-4xl font-bold text-white">15</span>
          <span className="text-white/50 mb-1">€ / Год</span>
        </div>

        <button
          onClick={handlePayment}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg hover:scale-[1.02] transition-transform shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
        >
          <Zap size={20} /> Оформить подписку
        </button>

        {/* ТЕСТОВАЯ КНОПКА (удалить перед релизом) */}
        <button 
          onClick={handleTestPurchase}
          className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-all"
        >
          🧪 Тестовая активация PRO
        </button>
        
        <p className="text-center text-xs text-white/30 mt-4">
          Безопасная оплата. Отмена в любой момент.
        </p>
      </div>
    </div>
  );
}