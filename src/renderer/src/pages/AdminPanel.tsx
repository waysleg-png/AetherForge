import { useState, useEffect } from "react";
import { Shield, MessageSquare, CheckCircle2, Clock, Send, RefreshCw, User, Trash2, Eraser, AlertTriangle } from "lucide-react";
import { collection, doc, updateDoc, onSnapshot, deleteDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export function AdminPanel() {
  const [isClearing, setIsClearing] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Состояние для кастомного окна подтверждения
  const [confirmAction, setConfirmAction] = useState<{ type: "clearAll" | "deleteOne", ticketId?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "support_tickets"), (querySnapshot) => {
      const allTickets = querySnapshot.docs.map(doc => ({
        id: doc.id, 
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleString("ru-RU") || "Только что"
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setTickets(allTickets);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleReply = async (ticketId: string) => {
    const text = replyTexts[ticketId];
    if (!text || !text.trim()) return;

    try {
      await updateDoc(doc(db, "support_tickets", ticketId), {
        adminReply: text.trim(),
        status: "resolved",
      });
      setReplyTexts(prev => ({ ...prev, [ticketId]: "" }));
    } catch (error) {
      console.error("Ошибка отправки:", error);
    }
  };

  // Выполнение удаления (вызывается после подтверждения в модалке)
  const executeDelete = async () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === "deleteOne" && confirmAction.ticketId) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "support_tickets", confirmAction.ticketId));
        await batch.commit();
      } catch (error) {
        console.error("Ошибка удаления:", error);
      }
    } 
    else if (confirmAction.type === "clearAll") {
      setIsClearing(true);
      try {
        const q = query(collection(db, "support_tickets"), where("status", "==", "resolved"));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((docSnap) => {
            batch.delete(doc(db, "support_tickets", docSnap.id));
          });
          await batch.commit();
        }
      } catch (error) {
        console.error("Ошибка очистки:", error);
      } finally {
        setIsClearing(false);
      }
    }
    
    setConfirmAction(null); // Закрываем модалку
  };

  return (
    <div className="p-8 h-full overflow-y-auto relative z-10">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-main)] flex items-center gap-3">
            <Shield className="text-purple-500" size={32} /> Админ-панель
          </h1>
          <p className="opacity-50 text-[var(--text-main)]">Управление обращениями в реальном времени.</p>
        </div>
        
        <button 
          onClick={() => setConfirmAction({ type: "clearAll" })} 
          disabled={isClearing}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm border transition-colors ${
            isClearing 
              ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed" 
              : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
          }`}
        >
          {isClearing ? (
            <><RefreshCw size={16} className="animate-spin" /> Очистка...</>
          ) : (
            <><Eraser size={16} /> Очистить решенные</>
          )}
        </button>
      </div>

      <div className="max-w-4xl space-y-5">
        {isLoading ? (
          <div className="text-center py-20 opacity-50 text-[var(--text-main)]">Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 opacity-50 text-[var(--text-main)] flex flex-col items-center">
            <MessageSquare size={48} className="mb-4 opacity-20" /> Пока нет обращений.
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="p-6 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl relative group">
              
              <button 
                onClick={() => setConfirmAction({ type: "deleteOne", ticketId: ticket.id })}
                className="absolute top-4 right-4 p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Удалить тикет"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 pr-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><User size={20} /></div>
                  <div>
                    <div className="font-semibold text-[var(--text-main)]">{ticket.userEmail}</div>
                    <div className="text-xs text-[var(--text-main)] opacity-50 flex items-center gap-1"><Clock size={12} /> {ticket.date}</div>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-lg font-semibold uppercase flex items-center gap-1 ${ticket.status === "resolved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                  {ticket.status === "resolved" ? <><CheckCircle2 size={14}/> Решено</> : <><Clock size={14}/> В обработке</>}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="text-xs font-semibold opacity-50 mb-1 text-[var(--text-main)]">Сообщение:</div>
                <div className="p-4 rounded-xl bg-black/20 text-sm text-[var(--text-main)]">{ticket.message}</div>
              </div>
              
              {ticket.adminReply && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-emerald-400 mb-1">Ваш ответ:</div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200">{ticket.adminReply}</div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <input 
                  type="text" 
                  value={replyTexts[ticket.id] || ""} 
                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))} 
                  placeholder={ticket.adminReply ? "Написать новый ответ..." : "Напишите ответ..."} 
                  className="flex-1 bg-black/20 border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-purple-500/50 transition-colors" 
                />
                <button 
                  onClick={() => handleReply(ticket.id)} 
                  disabled={!replyTexts[ticket.id]?.trim()} 
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:shadow-none"
                >
                  <Send size={16} /> Ответить
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* КАСТОМНОЕ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#12121a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold text-white">Подтверждение</h3>
            </div>
            
            <p className="text-white/70 mb-6">
              {confirmAction.type === "clearAll" 
                ? "Вы уверены, что хотите удалить ВСЕ решенные тикеты? Это действие нельзя отменить." 
                : "Вы уверены, что хотите безвозвратно удалить этот тикет?"}
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
              >
                Отмена
              </button>
              <button 
                onClick={executeDelete}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}