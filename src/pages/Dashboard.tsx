import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  Loader2,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getSupabase } from '../lib/supabase';

interface DashboardStats {
  totalStudents: number;
  totalSubjects: number;
  averageScore: number;
}

interface ActiveExam {
  id: string;
  title: string;
  subject: string;
  start_time: string;
  end_time: string;
  created_by: string;
  creator?: { full_name: string };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalSubjects: 0,
    averageScore: 0
  });
  const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = getSupabase();

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to exams (to refresh active exams list)
    const examSubscription = supabase
      .channel('dashboard-exams')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'exams' 
      }, () => {
        console.log('Exam table changed, refreshing dashboard...');
        fetchDashboardData();
      })
      .subscribe();

    // Refresh active exams every minute to handle time-based filtering
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 60000);

    return () => {
      supabase.removeChannel(examSubscription);
      clearInterval(intervalId);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const isHardcodedAdmin = authUser.email === 'go46@gmail.com';
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (profile) {
            setUser({
              ...profile,
              role: isHardcodedAdmin ? 'admin' : profile.role
            });
          } else {
            setUser({ 
              full_name: isHardcodedAdmin ? 'Kaizuke' : (authUser.email?.split('@')[0] || 'User'), 
              role: isHardcodedAdmin ? 'admin' : 'siswa' 
            });
          }
        } catch (profileCatch) {
          console.warn("Dashboard profile check failed:", profileCatch);
          setUser({ 
            full_name: isHardcodedAdmin ? 'Kaizuke' : (authUser.email?.split('@')[0] || 'User'), 
            role: isHardcodedAdmin ? 'admin' : 'siswa' 
          });
        }
      }

      // 1. Fetch Students Count
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'siswa');

      // 2. Fetch All Exams for stats and list
      const { data: allExams } = await supabase
        .from('exams')
        .select(`
          id, title, subject, start_time, end_time, duration_minutes, created_by,
          creator:profiles!created_by(full_name)
        `)
        .order('start_time', { ascending: true });

      // 3. Fetch Questions for subject count
      const { data: questions } = await supabase
        .from('questions')
        .select('subject');

      // 4. Fetch Sessions for average score
      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select('score')
        .eq('status', 'submitted');

      // Process Stats
      const now = new Date();
      const nowTime = now.getTime();

      // Unique Subjects
      const subjectList = [
        ...(questions?.map(q => q.subject) || []),
        ...(allExams?.map(e => e.subject) || [])
      ];
      const totalSubjects = new Set(subjectList.filter(Boolean)).size;

      // Average Score
      const scores = sessions?.map(s => s.score) || [];
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      setStats({
        totalStudents: totalStudents || 0,
        totalSubjects,
        averageScore: Math.round(averageScore * 10) / 10
      });

      // Filter Active/Today's Exams
      const activeList = (allExams || []).filter(exam => {
        const start = new Date(exam.start_time).getTime();
        const duration = (exam.duration_minutes || 60) * 60000;
        const end = exam.end_time ? new Date(exam.end_time).getTime() : (start + duration);
        
        // Show if:
        // 1. Ongoing now
        // 2. Upcoming in next 7 days
        // 3. Recently ended (within 30 mins)
        const isOngoing = nowTime >= start && nowTime <= end;
        const isUpcomingSoon = nowTime < start && start <= (nowTime + 7 * 24 * 60 * 60 * 1000);
        const isRecentlyEnded = nowTime > end && nowTime <= (end + 1800000);
        
        return isOngoing || isUpcomingSoon || isRecentlyEnded;
      });

      setActiveExams(activeList);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error("Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = () => {
    switch (user?.role) {
      case 'admin':
        return {
          primary: 'accent',
          bg: 'bg-accent',
          text: 'text-accent',
          shadow: 'shadow-accent/20',
          border: 'border-accent/20'
        };
      case 'guru':
        return {
          primary: 'indigo-600',
          bg: 'bg-indigo-600',
          text: 'text-indigo-600',
          shadow: 'shadow-indigo-200',
          border: 'border-indigo-600/20'
        };
      case 'siswa':
        return {
          primary: 'sky-500',
          bg: 'bg-sky-500',
          text: 'text-sky-500',
          shadow: 'shadow-sky-200',
          border: 'border-sky-500/20'
        };
      default:
        return {
          primary: 'blue-600',
          bg: 'bg-blue-600',
          text: 'text-blue-600',
          shadow: 'shadow-blue-200',
          border: 'border-blue-600/20'
        };
    }
  };

  const roleTheme = getRoleConfig();

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className={cn("w-10 h-10 animate-spin", roleTheme.text)} />
      </div>
    );
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Pagi';
    if (hour < 15) return 'Siang';
    if (hour < 18) return 'Sore';
    return 'Malam';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-[var(--primary)]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Selamat {getTimeOfDay()}, {user?.full_name || 'Pengguna'} 👋
          </h1>
          <p className="opacity-60 mt-1">
            {user?.role === 'admin' ? 'Kelola seluruh sistem SMKN 46 Jakarta dari satu tempat.' : 
             user?.role === 'guru' ? 'Pantau progres ujian dan bank soal Anda.' :
             'Selesaikan ujian Anda dengan jujur dan teliti.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-card border border-border-premium rounded-xl shadow-sm text-sm font-semibold text-primary flex items-center gap-2">
            <Calendar className={cn("w-4 h-4", roleTheme.text)} />
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className={cn("px-4 py-2 border rounded-xl shadow-lg text-sm font-semibold text-white", roleTheme.bg, roleTheme.shadow, "border-transparent")}>
            WIB {(() => {
              const d = new Date();
              return `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}`;
            })()}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users className={cn("w-6 h-6", roleTheme.text)} />}
          label="Total Siswa"
          value={stats.totalStudents.toLocaleString()}
          trend="Terdaftar"
          color="accent"
        />
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-sky-500" />}
          label="Mata Pelajaran"
          value={stats.totalSubjects.toString()}
          trend="Aktif"
          color="sky"
        />
        <StatCard 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          label="Rata-rata Nilai"
          value={stats.averageScore.toString()}
          trend={stats.averageScore >= 75 ? "Unggul" : "Perbaikan"}
          color="emerald"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8">
        {/* Left Column: Recent Activity / Schedule */}
        <div className="space-y-6">
          <div className="bg-card rounded-3xl border border-border-premium shadow-sm overflow-hidden text-primary">
            <div className="p-6 border-b border-[var(--border-premium)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--primary)]">Ujian Sedang Berlangsung</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fetchDashboardData()}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                  title="Refresh Data"
                >
                  <Loader2 className={cn("w-4 h-4 text-muted group-active:rotate-180 transition-transform", loading && "animate-spin")} />
                </button>
                <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Seketika
                </span>
              </div>
            </div>
            <div className="divide-y divide-border-premium">
              {activeExams.length === 0 ? (
                <div className="p-12 text-center text-muted font-medium">
                  Tidak ada ujian yang berlangsung saat ini.
                </div>
              ) : (
                activeExams.map(exam => (
                  <ActiveExamRow 
                    key={exam.id}
                    title={exam.title}
                    teacher={exam.creator?.full_name || 'Guru'}
                    subject={exam.subject}
                    startTime={exam.start_time}
                    endTime={exam.end_time}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: ReactNode; label: string; value: string; trend: string; color: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-premium)] shadow-sm hover:shadow-md transition-shadow group">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
        color === 'blue' && "bg-blue-500/10",
        color === 'amber' && "bg-amber-500/10",
        color === 'sky' && "bg-sky-500/10",
        color === 'indigo' && "bg-indigo-500/10",
        color === 'emerald' && "bg-emerald-500/10",
        color === 'green' && "bg-green-500/10",
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="opacity-60 text-sm font-medium">{label}</p>
        <div className="flex items-end gap-2 text-[var(--primary)]">
          <h4 className="text-2xl font-bold tracking-tight">{value}</h4>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1",
            trend === 'Unggul' ? "bg-emerald-500/10 text-emerald-500" : "opacity-60 bg-black/5 dark:bg-white/5"
          )}>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function ActiveExamRow({ title, teacher, subject, startTime, endTime }: any) {
  const [status, setStatus] = useState({ label: '', color: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      const nowTime = now.getTime();
      const startTimeVal = start.getTime();
      const endTimeVal = end.getTime();

      if (nowTime < startTimeVal) {
        // Belum mulai
        const diff = startTimeVal - nowTime;
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / 60000);
        
        const f = (d: Date) => `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}`;
        
        if (days > 0) {
          setStatus({ label: `H-${days} (${f(start)})`, color: "bg-slate-500/10 text-slate-500" });
        } else if (hours > 0) {
          setStatus({ label: `Mulai dlm ${hours}j ${mins}m`, color: "bg-amber-500/10 text-amber-600" });
        } else {
          setStatus({ label: `Mulai dlm ${mins}m`, color: "bg-amber-500/10 text-amber-600 shadow-sm shadow-amber-500/10" });
        }
      } else if (nowTime <= endTimeVal) {
        // Sedang berlangsung
        const diff = endTimeVal - nowTime;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setStatus({ label: `${mins}:${secs.toString().padStart(2, '0')}`, color: "bg-red-500/10 text-red-500" });
      } else {
        // Sudah selesai
        setStatus({ label: 'Selesai', color: "bg-muted/10 text-muted" });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <div className="p-6 flex items-center justify-between hover:bg-background/80 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center border border-border-premium">
          <Clock className="w-5 h-5 text-muted" />
        </div>
        <div>
          <p className="font-bold text-primary text-sm sm:text-base">{title}</p>
          <div className="flex items-center gap-2 text-xs text-muted mt-0.5 font-medium">
            <span>{subject}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="text-indigo-600 font-bold">
              {(() => {
                const start = new Date(startTime);
                const end = new Date(endTime);
                const f = (d: Date) => `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}`;
                return `${f(start)} - ${f(end)}`;
              })()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
          status.color
        )}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

