import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  History, 
  CheckSquare, 
  BarChart3, 
  LogOut, 
  Bell, 
  User,
  Menu,
  X,
  School,
  Sparkles,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSupabase } from '../../lib/supabase';
import { ThemeToggle } from '../ThemeToggle';

interface Notification {
  id: string;
  event_type: string;
  details: string;
  created_at: string;
  is_read?: boolean;
}

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<{id: string, name: string, role: string, email: string, details?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const supabase = getSupabase();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/login', { replace: true });
        return;
      }

      const isHardcodedAdmin = authUser.email === 'go46@gmail.com';

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
           console.warn("Profile fetch error (potential RLS recursion):", profileError);
           if (profileError.code === '42P17') throw profileError;
        }

        if (profile) {
          setUser({
            id: authUser.id,
            name: profile.full_name || authUser.email?.split('@')[0] || 'Pengguna',
            role: isHardcodedAdmin ? 'admin' : (profile.role || 'siswa'),
            email: authUser.email || '',
            details: profile.role === 'siswa' ? `${profile.class || ''} ${profile.major || ''} ${profile.class_index || ''}`.trim() : undefined
          });
        } else {
          // AUTO-PROVISIONING
          const defaultRole = isHardcodedAdmin ? 'admin' : ((authUser.user_metadata?.role as string) || 'siswa');
          const defaultName = isHardcodedAdmin ? 'Kaizuke' : (authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User');
          
          setUser({
            id: authUser.id,
            name: defaultName,
            role: defaultRole,
            email: authUser.email || ''
          });
        }
      } catch (err: any) {
        console.error("Session profile error:", err);
        setUser({
          id: authUser.id,
          name: isHardcodedAdmin ? 'Kaizuke' : (authUser.email?.split('@')[0] || 'User'),
          role: isHardcodedAdmin ? 'admin' : 'siswa',
          email: authUser.email || ''
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // Real-time Notifications for Teachers/Admins
  useEffect(() => {
    if (!user || user.role === 'siswa') return;

    const fetchInitialLogs = async () => {
      const { data } = await supabase
        .from('exam_logs')
        .select('*')
        .in('event_type', ['late_exam_request', 'unblock_request', 'anti_cheat_violation'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setNotifications(data);
    };

    fetchInitialLogs();

    const channel = supabase
      .channel('header_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_logs' },
        (payload) => {
          const newLog = payload.new as Notification;
          if (['late_exam_request', 'unblock_request', 'anti_cheat_violation'].includes(newLog.event_type)) {
            setNotifications(prev => [newLog, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.length;


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

    if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--primary)] flex flex-col items-center justify-center transition-colors">
        <div className="relative">
          <div className="w-24 h-24 border-[6px] border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-accent animate-pulse" />
        </div>
        <p className="mt-8 font-display font-bold text-xl tracking-tighter animate-pulse text-[var(--primary)]">Menyiapkan Lingkungan...</p>
      </div>
    );
  }

  if (!user) return null;

  const navItems = {
    admin: [
      { path: '/app', label: 'Ringkasan', icon: LayoutDashboard },
      { path: '/app/users', label: 'Registri Intelijen', icon: Users },
      { path: '/app/results', label: 'Analitik Global', icon: BarChart3 },
    ],
    guru: [
      { path: '/app', label: 'Konsol', icon: LayoutDashboard },
      { path: '/app/question-bank', label: 'Bank Soal', icon: BookOpen },
      { path: '/app/schedule', label: 'Jadwal Ujian', icon: Calendar },
      { path: '/app/approval', label: 'Kontrol Akses', icon: CheckSquare },
      { path: '/app/results', label: 'Hasil Ujian', icon: BarChart3 },
    ],
    siswa: [
      { path: '/app', label: 'Ruang Kerja', icon: LayoutDashboard },
      { path: '/app/exams', label: 'Ujian Aktif', icon: Calendar },
      { path: '/app/history', label: 'Riwayat Ujian', icon: History },
    ]
  };

  const roleConfigs = {
    admin: {
      color: 'accent',
      accentClass: 'bg-accent',
      textClass: 'text-accent',
      glowClass: 'bg-accent/15',
      shadowClass: 'shadow-accent/20',
      borderClass: 'border-accent/20',
      gradient: 'from-accent to-indigo-600'
    },
    guru: {
      color: 'indigo',
      accentClass: 'bg-indigo-600',
      textClass: 'text-indigo-600',
      glowClass: 'bg-indigo-600/15',
      shadowClass: 'shadow-indigo-600/20',
      borderClass: 'border-indigo-600/20',
      gradient: 'from-indigo-600 to-accent'
    },
    siswa: {
      color: 'sky',
      accentClass: 'bg-sky-500',
      textClass: 'text-sky-500',
      glowClass: 'bg-sky-500/15',
      shadowClass: 'shadow-sky-500/20',
      borderClass: 'border-sky-500/20',
      gradient: 'from-sky-500 to-indigo-500'
    }
  };

  const currentRole = (user.role as keyof typeof roleConfigs) || 'siswa';
  const config = roleConfigs[currentRole as keyof typeof roleConfigs] || roleConfigs.siswa;
  const currentNavItems = navItems[currentRole as keyof typeof navItems] || [];

  return (
    <div className="min-h-screen flex text-[var(--primary)] transition-colors duration-500">
      {/* Mobile Header Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-[var(--bg-card)] w-80 lg:w-72 fixed lg:static inset-y-0 z-50 transition-all duration-500 ease-in-out border-r border-[var(--border-premium)] flex flex-col group/sidebar shadow-2xl lg:shadow-none",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center p-2 bg-white rounded-2xl shadow-xl shadow-black/5">
                <img src="/logo.png" alt="Logo SMKN 46 Jakarta" className="w-full h-full object-contain" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-display font-black text-xl tracking-tighter text-[var(--primary)] leading-tight">Go46</h1>
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] opacity-80">CBT SMKN 46</p>
              </div>
            </div>
            <button className="lg:hidden p-3 bg-background hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl transition-all text-[var(--primary)] border border-border-premium shadow-sm active:scale-95" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-accent" />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="px-8 pb-8 pt-2">
            <div className={cn("p-4 rounded-3xl bg-[var(--bg-main)] border shadow-sm transition-all", config.borderClass)}>
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br shadow-lg flex items-center justify-center transition-transform hover:scale-105", config.gradient)}>
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm truncate leading-tight text-[var(--primary)]">{user.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("text-[8px] uppercase tracking-[0.2em] font-black", config.textClass)}>{user.role}</span>
                    {user.details && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border-premium" />
                        <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">{user.details}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Konsol Sistem</p>
            {currentNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden",
                    isActive 
                      ? cn(config.accentClass, "text-white shadow-xl shadow-opacity-30", config.shadowClass) 
                      : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 text-[var(--primary)]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 relative z-10 transition-transform group-hover:scale-110", isActive ? "text-white" : cn(config.textClass, "opacity-60 group-hover:opacity-100"))} />
                  <span className="font-bold tracking-tight relative z-10">{item.label}</span>
                  {isActive && <motion.div layoutId="nav-active" className={cn("absolute inset-0 z-0", config.accentClass)} />}
                </Link>
              );
            })}
          </nav>

          {/* Logout Section */}
          <div className="p-6">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500 dark:text-red-400 font-bold hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              <span>Akhiri Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-24 md:h-28 glass border-b border-[var(--border-premium)] flex items-center justify-between px-6 md:px-12 sticky top-0 z-40 transition-all">
          <div className="flex items-center gap-4 md:gap-8 grow">
            <button 
              className="lg:hidden p-3.5 bg-background shadow-sm border border-border-premium hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl transition-all text-[var(--primary)] active:scale-95"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="overflow-hidden">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 text-[var(--primary)] hidden sm:block">Alur Navigasi</p>
               <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter text-[var(--primary)] truncate">
                {currentNavItems.find(i => i.path === location.pathname)?.label || 'Beranda Sistem'}
               </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            <div className="h-6 md:h-8 w-px bg-[var(--border-premium)] mx-1 md:mx-2" />
            
            <div className="relative" ref={bellRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 md:p-3 bg-[var(--bg-card)] shadow-md border border-[var(--border-premium)] rounded-xl transition-all hover:scale-105 active:scale-95 relative group"
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5 opacity-60 group-hover:opacity-100 transition-opacity text-[var(--primary)]" />
                {notifications.length > 0 && (
                  <span className={cn("absolute top-2.5 right-2.5 md:top-3 md:right-3 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border-[2px] md:border-[3px] border-[var(--bg-card)] animate-pulse", config.accentClass)} />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-premium)] rounded-3xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                  >
                    <div className="p-6 border-b border-[var(--border-premium)] flex items-center justify-between">
                      <h3 className="font-display font-black text-xs uppercase tracking-[0.2em] opacity-40">Notifikasi Sistem</h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg">
                        <X className="w-4 h-4 opacity-40" />
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <Bell className="w-12 h-12 opacity-5 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Tidak ada notifikasi baru</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--border-premium)]">
                          {notifications.map((notif) => (
                            <div key={notif.id} className="p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                              <div className="flex gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                                  notif.event_type === 'late_exam_request' ? "bg-amber-500 shadow-amber-500/10" :
                                  notif.event_type === 'unblock_request' ? "bg-rose-500 shadow-rose-500/10" :
                                  "bg-blue-500 shadow-blue-500/10"
                                )}>
                                  {notif.event_type === 'late_exam_request' ? <Clock className="w-5 h-5 text-white" /> :
                                   notif.event_type === 'unblock_request' ? <AlertCircle className="w-5 h-5 text-white" /> :
                                   <Sparkles className="w-5 h-5 text-white" />}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    {notif.event_type.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-xs font-bold leading-relaxed text-[var(--primary)]">
                                    {notif.details}
                                  </p>
                                  <div className="flex items-center gap-2 pt-2">
                                     <span className="text-[9px] font-mono opacity-30 uppercase">
                                       {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                     <Link 
                                       to="/app/approval" 
                                       onClick={() => setShowNotifications(false)}
                                       className="text-[9px] font-black text-sky-600 hover:underline uppercase flex items-center gap-1"
                                     >
                                       Tinjau <ExternalLink className="w-2.5 h-2.5" />
                                     </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-black/5 dark:bg-white/5 text-center">
                       <Link 
                         to="/app/approval" 
                         onClick={() => setShowNotifications(false)}
                         className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] opacity-40 hover:opacity-100 transition-opacity"
                       >
                         Lihat Semua Log Aktivitas
                       </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 relative">
          {/* Subtle Background Glow */}
          <div className={cn("absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000", config.glowClass)} />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
