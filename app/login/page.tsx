"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Layout, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = isRegister 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg mb-4">
            <Layout size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">TaskFlow <span className="text-blue-600">Auth</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Projenizi yönetmek için {isRegister ? 'kayıt olun' : 'giriş yapın'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input type="email" placeholder="E-posta" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input type="password" placeholder="Şifre" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2">
            {loading ? 'İşleniyor...' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'} <ArrowRight size={18} />
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm font-medium">
          {isRegister ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}{" "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-bold hover:underline italic">
            {isRegister ? "Giriş Yap" : "Hemen Kaydol"}
          </button>
        </p>
      </div>
    </div>
  );
}