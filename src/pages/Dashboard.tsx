import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getSupabase } from '../lib/supabase';

interface DashboardStats {
  totalStudents: number;
  totalSubjects: number;
  scheduledExams: number;
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

interface Violation {
  id: string;
  session_id: string;
  event_type: string;
  created_at: string;
  session?: {
    siswa?: { full_name: string };
    exam?: { title: string };
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalSubjects: 0,
    scheduledExams: 0,
    averageScore: 0
  });
  const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = getSupabase();

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to violations
    const violationSubscription = supabase
      .channel('dashboard-violations')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'exam_logs',
        filter: "event_type=in.('tab_switch','page_hidden','minimize','fullscreen_exit')"
      }, (payload) => {
        fetchViolations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(violationSubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile);
      }

      // Fetch stats
      const [studentsRes, subjectsRes, examsRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'siswa'),
        supabase.from('questions').select('subject'),
        supabase.from('exams').select('id', { count: 'exact', head: true }).gt('start_time', new Date().toISOString()),
        supabase.from('exam_sessions').select('score').eq('status', 'submitted')
      ]);

      // Unique subjects
      const subjects = new Set(subjectsRes.data?.map(q => q.subject) || []);
      
      // Average score
      const scores = sessionsRes.data?.map(s => s.score) || [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalSubjects: subjects.size,
        scheduledExams: examsRes.count || 0,
        averageScore: Math.round(avg * 10) / 10
      });

      // Fetch active exams
      const now = new Date().toISOString();
      const { data: currentExams } = await supabase
        .from('exams')
        .select(`
          id, title, subject, start_time, end_time, created_by,
          creator:profiles!created_by(full_name)
        `)
        .lte('start_time', now)
        .gte('end_time', now);
      
      setActiveExams(currentExams || []);

      fetchViolations();

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViolations = async () => {
    const { data } = await supabase
      .from('exam_logs')
      .select(`
        id, session_id, event_type, created_at,
        session:exam_sessions(
          siswa:profiles!siswa_id(full_name),
          exam:exams(title)
        )
      `)
      .in('event_type', ['tab_switch', 'page_hidden', 'minimize', 'fullscreen_exit'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    setViolations(data || []);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Selamat {getTimeOfDay()}, {user?.full_name || 'User'} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {user?.role === 'admin' ? 'Kelola seluruh sistem dari satu tempat.' : 
             user?.role === 'guru' ? 'Pantau progres ujian dan bank soal Anda.' :
             'Ayo selesaikan ujian Anda dengan jujur.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-semibold text-slate-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl shadow-lg shadow-blue-200 text-sm font-semibold text-white">
            WIB {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="Total Siswa"
          value={stats.totalStudents.toLocaleString()}
          trend="Aktif"
          color="blue"
        />
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-sky-500" />}
          label="Mata Pelajaran"
          value={stats.totalSubjects.toString()}
          trend="Tersedia"
          color="sky"
        />
        <StatCard 
          icon={<Calendar className="w-6 h-6 text-indigo-500" />}
          label="Ujian Terjadwal"
          value={stats.scheduledExams.toString()}
          trend="Akan datang"
          color="indigo"
        />
        <StatCard 
          icon={<CheckCircle2 className="w-6 h-6 text-green-500" />}
          label="Rata-rata Nilai"
          value={stats.averageScore.toString()}
          trend={stats.averageScore >= 75 ? "Bagus" : "Perlu ditingkatkan"}
          color="green"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity / Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Ujian Sedang Berlangsung</h3>
              <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-black rounded-full uppercase tracking-widest">Live</span>
            </div>
            <div className="divide-y divide-slate-100">
              {activeExams.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">
                  Tidak ada ujian yang berlangsung saat ini.
                </div>
              ) : (
                activeExams.map(exam => (
                  <ActiveExamRow 
                    key={exam.id}
                    title={exam.title}
                    teacher={exam.creator?.full_name || 'Guru'}
                    subject={exam.subject}
                    endTime={exam.end_time}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Notifications / Cheat Alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Laporan Pelanggaran
            </h3>
            <div className="space-y-4">
              {violations.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm font-medium">
                  Belum ada laporan pelanggaran.
                </div>
              ) : (
                violations.map(v => (
                  <ViolationAlert 
                    key={v.id}
                    student={v.session?.siswa?.full_name || 'Siswa'}
                    exam={v.session?.exam?.title || 'Ujian'}
                    time={new Date(v.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    type={v.event_type.replace('_', ' ')}
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
        color === 'blue' && "bg-blue-50",
        color === 'sky' && "bg-sky-50",
        color === 'indigo' && "bg-indigo-50",
        color === 'green' && "bg-green-50",
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <div className="flex items-end gap-2">
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1",
            trend === 'Bagus' ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-600"
          )}>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function ActiveExamRow({ title, teacher, subject, endTime }: any) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining('Selesai');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Clock className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm sm:text-base">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subject} • {teacher}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn(
          "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest",
          remaining === 'Selesai' ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-600"
        )}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

function ViolationAlert({ student, exam, time, type }: any) {
  return (
    <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 flex items-start gap-3">
      <div className="w-8 h-8 shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
        <AlertCircle className="w-4 h-4 text-red-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{student}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{exam}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-white border border-red-200 text-red-600 rounded">
            {type}
          </span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
      </div>
    </div>
  );
}

