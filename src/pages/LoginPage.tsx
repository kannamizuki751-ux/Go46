import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const supabase = getSupabase();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Hardcoded bypass for the special admin email to avoid RLS recursion issues
        const isHardcodedAdmin = session.user.email === 'go46@gmail.com';
        
        if (isHardcodedAdmin) {
          navigate('/app', { replace: true });
          return;
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          
          navigate('/app', { replace: true });
        } catch (e) {
          navigate('/app', { replace: true });
        }
      }
    });
  }, [navigate, supabase]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError('Email ini belum aktif (belum dikonfirmasi). Solusi: (1) Admin harus mematikan "Confirm Email" di Supabase Auth Settings, (2) Hapus akun ini di menu Manajemen Pengguna, lalu (3) Daftar ulang akun ini agar langsung aktif.');
        } else {
          throw authError;
        }
        return;
      }

      // Fetch profile to confirm role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user?.id)
        .maybeSingle();

      // Navigate based on role for better UX
      // BANTUAN KHUSUS: Jika email adalah go46@gmail.com, paksa masuk ke dashboard
      if (data.user?.email === 'go46@gmail.com' || profile?.role === 'admin' || profile?.role === 'guru') {
        navigate('/app', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login. Silakan periksa kembali email dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative transition-colors duration-500 overflow-hidden">
      {/* Dynamic Background Elements - Representing Three Roles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Guru Color (Indigo) */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
        {/* Siswa Color (Sky) */}
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] animate-bounce duration-[10s]" />
        {/* Admin Color (Amber) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation Layer */}
      <div className="absolute top-8 left-0 right-0 px-8 flex items-center justify-between z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-[var(--muted)] hover:text-accent transition-colors font-bold group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] shadow-md flex items-center justify-center group-hover:scale-110 transition-transform border border-[var(--border-premium)]">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Kembali ke Beranda</span>
        </Link>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="glass-premium rounded-[2rem] md:rounded-[3rem] p-8 md:p-14">
          <div className="text-center mb-8 md:mb-12">
            <Link to="/" className="inline-flex flex-col items-center gap-4 mb-6 md:mb-8 hover:opacity-80 transition-opacity">
              <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                <img src="/logo.png" alt="Logo SMKN 46 Jakarta" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-bold text-2xl md:text-3xl tracking-tighter text-[var(--primary)]">SMKN 46 JAKARTA</span>
            </Link>
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-2 md:mb-3 tracking-tight text-[var(--primary)]">Portal Ujian Digital</h2>
            <p className="opacity-50 font-medium text-sm md:text-base">Akses lingkungan ujian aman Anda</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 md:mb-8 p-4 md:p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-500 dark:text-red-400 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50 ml-1 text-[var(--primary)]">Kredensial Akademik</label>
              <div className="relative group">
                <Mail className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 opacity-30 group-focus-within:opacity-100 group-focus-within:text-accent transition-all text-[var(--primary)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-premium)] rounded-xl md:rounded-2xl py-4 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium text-[var(--primary)] placeholder:text-[var(--muted)] text-sm md:text-base"
                  placeholder="go46@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50 text-[var(--primary)]">Kata Sandi Aman</label>
                <a href="#" className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-accent hover:underline">Lupa Sandi?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 opacity-30 group-focus-within:opacity-100 group-focus-within:text-accent transition-all text-[var(--primary)]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-premium)] rounded-xl md:rounded-2xl py-4 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium text-[var(--primary)] placeholder:text-[var(--muted)] text-sm md:text-base"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-accent text-white font-bold py-4 md:py-5 rounded-xl md:rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              {isLoading ? (
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10 uppercase tracking-widest text-xs md:text-sm">Mulai Sesi</span>
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 relative z-10 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[var(--border-premium)] text-center">
            <p className="opacity-40 text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--primary)] leading-relaxed">
              Dilindungi oleh Go46 Security Shield
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
