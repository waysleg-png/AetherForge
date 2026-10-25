import { useState, useEffect } from "react";
import { Camera, Save, User as UserIcon, Loader2 } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

export function Profile() {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || user.email?.split("@")[0] || "");
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        }
      } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        setStatus({ type: "error", text: "Файл слишком большой. Максимум 500 КБ." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setAvatarUrl(reader.result as string);
        setStatus(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSaving(true);
    setStatus(null);
    try {
      if (displayName.trim() !== user.displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
      }
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl || null,
      });
      setStatus({ type: "success", text: "Профиль успешно обновлен!" });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setStatus({ type: "error", text: "Ошибка сохранения." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={48} /></div>;

  return (
    <div className="p-8 h-full overflow-y-auto relative z-10 flex justify-center">
      <div className="max-w-2xl w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-main)]">Мой профиль</h1>
          <p className="opacity-50 text-[var(--text-main)]">Настройте свой аккаунт и аватарку.</p>
        </div>
        <div className="p-8 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] backdrop-blur-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                {previewUrl || avatarUrl ? (
                  <img src={previewUrl || avatarUrl || ""} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white text-5xl font-bold">
                    {(displayName?.[0] || "G").toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={32} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <p className="text-sm text-[var(--text-main)] opacity-50 mt-4">Нажмите на аватарку (макс. 500 КБ)</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2 flex items-center gap-2"><UserIcon size={16} className="text-purple-400" /> Ваше имя</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-black/20 border border-[var(--panel-border)] rounded-xl p-3 text-[var(--text-main)] outline-none focus:border-purple-500/50" />
            </div>
            {status && <div className={`p-4 rounded-xl text-sm font-medium ${status.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{status.text}</div>}
            <button onClick={handleSave} disabled={isSaving || !displayName.trim()} className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${isSaving ? "bg-white/10 text-white/40" : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg"}`}>
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}