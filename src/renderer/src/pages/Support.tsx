import { useState, useEffect } from "react";
import { ShieldAlert, Send, CheckCircle2, MessageSquare, ExternalLink, Clock } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";

export function Support() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);

  // Загружаем историю сообщений пользователя
  const fetchMyTickets = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "support_tickets"),
        where("userId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const tickets = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleString("ru-RU") || "Только что"
        }))
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
      
      setMyTickets(tickets);
    } catch (error) {
      console.error("Ошибка загрузки тикетов:", error);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      const currentUser = auth.currentUser;
      
      await addDoc(collection(db, "support_tickets"), {
        message: message.trim(),
        userId: currentUser?.uid || "guest",
        userEmail: currentUser?.email || "Гость",
        status: "open",
        createdAt: serverTimestamp(),
      });

      setIsSent(true);
      setMessage("");
      await fetchMyTickets();
      setTimeout(() => setIsSent(false), 5000);
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      alert("Не удалось отправить сообщение.");
    } finally {
      setIsSending(false);
    }
  };

  const openLink = (url: string) => {
    (window as any).electron?.openExternal?.(url);
  };

  return (
    <div className="p-8 h-full overflow-y-auto relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-main)]">Поддержка</h1>
        <p className="opacity-50 text-[var(--text-main)]">Помогите нам сделать AetherForge лучше. Сообщите о баге или задайте вопрос.</p>
      </div>

      <div className="flex gap-6 max-w-5xl items-start">
        
        {/* Левая колонка */}
        <div className="w-1/2 space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ShieldAlert size={20} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">Запуск от Администратора</h2>
            </div>
            <p className="text-sm opacity-70 mb-4 text-[var(--text-main)] leading-relaxed">
              Для полноценной работы всех функций (например, «Игровой буст» и очистка системных папок) рекомендуется запускать лаунчер от имени Администратора.
            </p>
            <div className="inline-block px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              ПКМ по ярлыку → «Запуск от имени администратора»
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-main)]">Наши контакты</h2>
            <div className="space-y-3">
              {/* Telegram */}
              <button 
                onClick={() => openLink("https://t.me/AetherForgeSupport")}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-cyan-400" />
                  <span className="text-sm text-[var(--text-main)]">Telegram чат</span>
                </div>
                <ExternalLink size={16} className="text-white/30 group-hover:text-white/70 transition-colors" />
              </button>

              {/* Discord (заглушка) */}
              <button 
                onClick={() => openLink("https://discord.gg/твой-инвайт")}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-purple-400" />
                  <span className="text-sm text-[var(--text-main)]">Discord сервер</span>
                </div>
                <ExternalLink size={16} className="text-white/30 group-hover:text-white/70 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="w-1/2 flex flex-col gap-6">
          
          <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl flex flex-col">
            <h2 className="text-lg font-semibold mb-1 text-[var(--text-main)]">Сообщить о проблеме</h2>
            <p className="text-sm opacity-50 mb-4 text-[var(--text-main)]">Опишите баг или вопрос. Мы обязательно свяжемся с вами.</p>
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите вашу проблему здесь..."
              className="h-32 w-full bg-black/20 border border-[var(--panel-border)] rounded-xl p-4 text-sm text-[var(--text-main)] outline-none focus:border-purple-500/50 transition-colors resize-none placeholder:text-[var(--text-main)] placeholder:opacity-30"
            />

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  isSent 
                    ? "bg-emerald-500 text-white" 
                    : isSending || !message.trim()
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isSent ? (
                  <><CheckCircle2 size={18} /> Отправлено!</>
                ) : isSending ? (
                  "Отправка..."
                ) : (
                  <><Send size={18} /> Отправить</>
                )}
              </button>
            </div>
          </div>

          {myTickets.length > 0 && (
            <div className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold mb-4 text-[var(--text-main)]">История обращений</h2>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {myTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Clock size={12} /> {ticket.date}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase ${
                        ticket.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {ticket.status === "resolved" ? "Решено" : "В обработке"}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[var(--text-main)] opacity-80 mb-3">
                      <span className="opacity-50">Вы: </span>{ticket.message}
                    </p>

                    {ticket.adminReply && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-xs font-semibold text-emerald-400 mb-1">Ответ поддержки:</div>
                        <div className="text-sm text-emerald-200">{ticket.adminReply}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}