import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, onAuthStateChanged, User, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { MailIcon, LockIcon, PersonIcon } from "@primer/octicons-react";
import { Minus, Square, X, LogOut, Settings, User as UserIcon, Crown } from "lucide-react";
import { Sidebar } from "./components/sidebar/sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Startup } from "./pages/Startup";
import { Cleanup } from "./pages/Cleanup";
import { Optimize } from "./pages/Optimize";
import { Settings as SettingsPage } from "./pages/Settings"; 
import { Network } from "./pages/Network";
import { Support } from "./pages/Support";
import { Profile } from "./pages/Profile"; 
import { AdminPanel } from "./pages/AdminPanel";
import { PremiumModal } from "./components/PremiumModal";
import "./app.scss";

export function App() {
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<User | null>(null);
  
  const [userData, setUserData] = useState<{ displayName?: string, avatarUrl?: string, role?: string, isPro?: boolean }>({});

  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [lang, setLang] = useState(localStorage.getItem("app-lang") || "ru");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "neon";
    document.body.className = `theme-${savedTheme}`;

    const handleLangChange = () => {
      setLang(localStorage.getItem("app-lang") || "ru");
    };
    window.addEventListener("lang-changed", handleLangChange);
    return () => window.removeEventListener("lang-changed", handleLangChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!u.emailVerified && u.providerData[0]?.providerId === "password") {
          setUser(null); setError("Подтвердите почту. Мы отправили вам письмо со ссылкой."); return;
        }
        setUser(u);
        
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          const defaultData = { email: u.email, displayName: u.displayName || u.email?.split("@")[0] || "User", createdAt: serverTimestamp(), role: "user", emailVerified: u.emailVerified, isPro: false };
          await setDoc(ref, defaultData);
          setUserData(defaultData);
        }
      } else { 
        setUser(null); 
        setUserData({});
      }
    });
    return () => unsub();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setAuthLoading(true);
    try {
      if (isLogin) {
        const res = await signInWithEmailAndPassword(auth, email, password);
        if (!res.user.emailVerified) { await sendEmailVerification(res.user); await auth.signOut(); throw new Error("Почта не подтверждена."); }
        setUser(res.user);
      } else {
        if (!displayName.trim()) throw new Error("Введите имя");
        if (password.length < 6) throw new Error("Пароль от 6 символов");
        if (password !== confirmPassword) throw new Error("Пароли не совпадают");
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: displayName.trim() });
        await sendEmailVerification(res.user);
        await setDoc(doc(db, "users", res.user.uid), { email: res.user.email, displayName: displayName.trim(), createdAt: serverTimestamp(), role: "user", emailVerified: false, isPro: false });
        await auth.signOut(); setSuccess("Проверьте почту!"); setIsLogin(true);
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") setError("Email занят");
      else if (err.code === "auth/invalid-credential") setError("Неверный Email или пароль");
      else setError(err.message || "Ошибка");
    } finally { setAuthLoading(false); }
  };

  const loginAsGuest = async () => {
    try {
      const res = await signInAnonymously(auth);
      setUser(res.user);
    } catch (error) {
      setUser({ email: "guest@aetherforge.com", uid: "guest", displayName: "Гость" } as User);
    }
  };

  useEffect(() => {
    if (userData?.role !== "admin") return;

    const q = query(collection(db, "support_tickets"), where("status", "==", "open"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOpenTicketsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [userData]);

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
        <div style={{ background: "rgba(20,20,30,0.85)", backdropFilter: "blur(20px)", padding: 40, borderRadius: 20, width: 420, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
          <h1 style={{ color: "white", textAlign: "center", marginBottom: 6, fontSize: 28 }}>AETHER<span style={{ color: "#7b68ee" }}>FORGE</span></h1>
          <p style={{ color: "#888", textAlign: "center", marginBottom: 24, fontSize: 14 }}>{isLogin ? "Войдите в аккаунт" : "Создайте аккаунт"}</p>
          {error && <p style={{ color: "#ff4d4d", textAlign: "center", background: "rgba(255,77,77,0.1)", padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: "#22c55e", textAlign: "center", background: "rgba(34,197,94,0.1)", padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{success}</p>}
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!isLogin && (<div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center" }}><PersonIcon size={18} fill="#7b68ee" /><input type="text" placeholder="Имя" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={!isLogin} style={{ background: "none", border: "none", outline: "none", color: "white", marginLeft: 10, width: "100%" }} /></div>)}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center" }}><MailIcon size={18} fill="#7b68ee" /><input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ background: "none", border: "none", outline: "none", color: "white", marginLeft: 10, width: "100%" }} /></div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center" }}><LockIcon size={18} fill="#7b68ee" /><input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ background: "none", border: "none", outline: "none", color: "white", marginLeft: 10, width: "100%" }} /></div>
            {!isLogin && (<div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center" }}><LockIcon size={18} fill="#7b68ee" /><input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={!isLogin} style={{ background: "none", border: "none", outline: "none", color: "white", marginLeft: 10, width: "100%" }} /></div>)}
            <button type="submit" disabled={authLoading} style={{ background: "linear-gradient(90deg, #4a90e2, #7b68ee)", border: "none", padding: 14, borderRadius: 10, color: "white", fontWeight: "bold", cursor: "pointer", marginTop: 8 }}>{authLoading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}</button>
          </form>
          <p onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }} style={{ color: "#aaa", textAlign: "center", marginTop: 22, cursor: "pointer", fontSize: 13 }}>{isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</p>
          <button onClick={loginAsGuest} style={{ width: "100%", background: "transparent", border: "1px solid #7b68ee", color: "#7b68ee", padding: 11, borderRadius: 10, marginTop: 14, cursor: "pointer" }}>Войти как Гость</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent text-white font-sans overflow-hidden">
      
      <Sidebar 
        active={currentPage} 
        onChange={setCurrentPage} 
        lang={lang} 
        isAdmin={userData?.role === "admin"} 
        openTicketsCount={openTicketsCount} 
      />
      
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        <div className="h-[40px] flex items-center justify-between px-4 relative z-30" style={{ WebkitAppRegion: "drag" } as any}>
           
           <div className="relative" ref={profileRef}>
             <button 
               onClick={() => setIsProfileOpen(!isProfileOpen)}
               className="flex items-center gap-2 hover:bg-white/5 py-1 px-2 rounded-lg transition-colors"
               style={{ WebkitAppRegion: "no-drag" } as any}
             >
               <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                 {userData?.avatarUrl ? (
                   <img src={userData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   (userData?.displayName?.[0] || user.displayName?.[0] || user.email?.[0] || "G").toUpperCase()
                 )}
               </div>
               <span className="text-sm text-white/70 font-medium">{userData?.displayName || user.displayName || user.email?.split("@")[0]}</span>
               {userData?.isPro && <Crown size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />}
             </button>

             {isProfileOpen && (
               <div className="absolute top-full left-0 mt-2 w-60 bg-[#12121a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                 <div className="p-4 border-b border-white/10 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                     {userData?.avatarUrl ? <img src={userData.avatarUrl} className="w-full h-full object-cover" /> : (userData?.displayName?.[0] || "G").toUpperCase()}
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-white truncate">{userData?.displayName || "Пользователь"}</p>
                     <p className="text-xs text-white/50 truncate mt-0.5">{user.email}</p>
                   </div>
                 </div>
                 <div className="p-2">
                   <button
                     onClick={() => { setCurrentPage("profile"); setIsProfileOpen(false); }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                   >
                     <UserIcon size={16} />
                     {lang === "en" ? "My Profile" : "Мой профиль"}
                   </button>
                   <button
                     onClick={() => { setCurrentPage("settings"); setIsProfileOpen(false); }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                   >
                     <Settings size={16} />
                     {lang === "en" ? "Settings" : "Настройки"}
                   </button>
                   <button
                     onClick={() => { auth.signOut(); setUser(null); setIsProfileOpen(false); }}
                     className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                   >
                     <LogOut size={16} />
                     {lang === "en" ? "Log out" : "Выйти из аккаунта"}
                   </button>
                 </div>
               </div>
             )}
           </div>
           
           <div className="flex items-center gap-2">
             {/* УСЛОВИЕ ДЛЯ PRO */}
             {userData?.isPro ? (
               <button 
                 onClick={() => {
                   // Здесь мы можем открыть модалку с информацией о PRO
                   setIsPremiumOpen(true); 
                   // Или просто показать сообщение:
                   // alert("Вы PRO-пользователь! Спасибо за поддержку ❤️");
                 }}
                 className="bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)] mr-2 flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer"
                 style={{ WebkitAppRegion: "no-drag" } as any}
               >
                 <Crown size={14} /> PRO
               </button>
             ) : (
               <button 
                 onClick={() => setIsPremiumOpen(true)}
                 className="bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform mr-2" 
                 style={{ WebkitAppRegion: "no-drag" } as any}
               >
                 ⭐ {lang === "en" ? "Buy PRO" : "Купить PRO"}
               </button>
             )}
             
             <div className="flex items-center ml-4" style={{ WebkitAppRegion: "no-drag" } as any}>
                <button className="window-control" onClick={() => (window as any).electron?.minimizeMainWindow()}><Minus size={16} /></button>
                <button className="window-control" onClick={() => (window as any).electron?.toggleMaximizeMainWindow()}><Square size={14} /></button>
                <button className="window-control close" onClick={() => (window as any).electron?.closeMainWindow()}><X size={16} /></button>
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-hidden relative z-10">
          {currentPage === "home" && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === "profile" && <Profile />}
          {currentPage === "cleanup" && <Cleanup />}
          {currentPage === "optimize" && <Optimize />}
          {currentPage === "startup" && <Startup />}
          {currentPage === "settings" && <SettingsPage />}
          {currentPage === "network" && <Network />}
          {currentPage === "support" && <Support />}
          {currentPage === "admin" && <AdminPanel />}
        </div>
      </main>

      <PremiumModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} />
      
    </div>
  );
}