import { useState, useEffect } from 'react';
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
  Settings, 
  LogOut, 
  Bell, 
  User,
  Menu,
  X,
  School
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSupabase } from '../../lib/supabase';

// Mock user for UI development - in production, get from context/supabase
const MOCK_USER = {
  name: 'Pak Budi',
  role: 'guru', // 'admin', 'guru', 'siswa'
  email: 'budi@school.edu'
};

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const supabase = getSupabase();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({
          name: profile.full_name || 'User',
          role: profile.role,
          email: authUser.email || ''
        });
      } else {
        // Fallback jika trigger gagal atau profile belum terbuat
        setUser({
          name: authUser.email?.split('@')[0] || 'User',
          role: 'siswa',
          email: authUser.email || ''
        });
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200 font-bold">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = {
    admin: [
      { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/app/users', label: 'Manajemen Pengguna', icon: Users },
      { path: '/app/classes', label: 'Data Kelas & Mapel', icon: School },
      { path: '/app/results', label: 'Rekap Hasil Ujian', icon: BarChart3 },
    ],
    guru: [
      { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/app/question-bank', label: 'Bank Soal', icon: BookOpen },
      { path: '/app/schedule', label: 'Jadwal Ujian', icon: Calendar },
      { path: '/app/approval', label: 'Persetujuan Ujian', icon: CheckSquare },
      { path: '/app/results', label: 'Hasil Ujian', icon: BarChart3 },
    ],
    siswa: [
      { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/app/exams', label: 'Daftar Ujian', icon: Calendar },
      { path: '/app/history', label: 'Riwayat Ujian', icon: History },
    ]
  };

  const currentNavItems = navItems[user.role as keyof typeof navItems] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-slate-900 text-slate-300 w-72 fixed inset-y-0 z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold">U</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">EduTest46</span>
            </div>
            <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {currentNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Summary */}
          <div className="p-6 mt-auto border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">{user.name}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
              {currentNavItems.find(i => i.path === location.pathname)?.label || 'Aplikasi Ujian'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-2" />
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
