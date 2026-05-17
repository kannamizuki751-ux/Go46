import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  BookOpen,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSupabase } from '../../lib/supabase';

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  created_at: string;
  start_time: string;
  end_time: string;
  status?: string;
  teacher?: string;
  session_status?: string;
  has_requested_late?: boolean;
}

export default function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const supabase = getSupabase();

  const fetchExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile for class/major/index
      const { data: profile } = await supabase
        .from('profiles')
        .select('class, major, class_index, full_name')
        .eq('id', user.id)
        .single();

      const userClass = profile?.class;
      const userMajor = profile?.major;
      const userIndex = profile?.class_index;
      const userName = profile?.full_name;

      // Fetch all sessions for this user
      const { data: allSessions } = await supabase
        .from('exam_sessions')
        .select('exam_id, status')
        .eq('siswa_id', user.id);
      
      const sessionMap = new Map((allSessions || []).map(s => [s.exam_id, s.status]));

      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          subject,
          duration_minutes,
          created_at,
          created_by,
          start_time,
          end_time,
          target_classes,
          target_majors,
          target_indices
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      const now = new Date().getTime();

      // Manual join for creator info to avoid PGRST200 errors
      const formatted = await Promise.all((data || [])
        .filter(exam => {
          // Already submitted - hide if finished
          if (sessionMap.get(exam.id) === 'submitted') return false;

          // Past exams handling (hide if ended more than 24 hours ago to allow late requests)
          const endTime = new Date(exam.end_time || new Date(new Date(exam.start_time).getTime() + exam.duration_minutes * 60000)).getTime();
          if (now > endTime + 86400000) return false;

          // Class and Major Filtering
          const targetClasses = exam.target_classes || [];
          const targetMajors = exam.target_majors || [];
          const targetIndices = exam.target_indices || [];

          if (targetClasses.length > 0 && !targetClasses.includes(userClass)) return false;
          if (targetMajors.length > 0 && !targetMajors.includes(userMajor)) return false;
          if (targetIndices.length > 0 && !targetIndices.includes(userIndex)) return false;

          return true;
        })
        .map(async (exam) => {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', exam.created_by)
            .single();

          const startTime = new Date(exam.start_time).getTime();
          const endTime = new Date(exam.end_time || (startTime + exam.duration_minutes * 60000)).getTime();
          
          let status = 'active';
          if (now < startTime) status = 'upcoming';
          else if (now > endTime) status = 'ended';

          // Override status if approved for late exam
          const sessionStatus = sessionMap.get(exam.id);
          if (status === 'ended' && sessionStatus === 'late_approved') {
            status = 'active';
          }

          return {
            ...exam,
            teacher: creatorData?.full_name || 'Guru Pengawas',
            status,
            session_status: sessionStatus
          };
        }));

      setExams(formatted);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleRequestPermission = async (exam: Exam) => {
    setIsRequesting(exam.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      // 1. Check if session already exists to avoid redundant requests
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('status')
        .eq('exam_id', exam.id)
        .eq('siswa_id', user.id)
        .maybeSingle();

      if (existingSession?.status === 'awaiting_late_approval' || existingSession?.status === 'late_approved') {
        toast.success('Permintaan sedang diproses atau sudah disetujui.');
        await fetchExams();
        return;
      }

      // 2. Create or Update session with status 'awaiting_late_approval'
      const { error: sessionError } = await supabase
        .from('exam_sessions')
        .upsert({
          exam_id: exam.id,
          siswa_id: user.id,
          status: 'awaiting_late_approval',
          start_time: new Date().toISOString()
        }, { onConflict: 'exam_id,siswa_id' });

      if (sessionError) throw sessionError;

      // 3. Add log for the teacher
      const { error: logError } = await supabase
        .from('exam_logs')
        .insert({
          event_type: 'late_exam_request',
          details: `${profile?.full_name || 'Siswa'} meminta izin mengerjakan ujian "${exam.title}" yang sudah berakhir.`
        });

      if (logError) throw logError;

      toast.success('Permintaan izin terkirim!');
      await fetchExams();
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      toast.error(err.message || 'Gagal mengirim permintaan.');
    } finally {
      setIsRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-[var(--primary)]">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">Daftar Ujian</h1>
          <p className="opacity-60 font-medium text-sm sm:text-base max-w-lg">Selesaikan ujian yang tersedia dengan teliti dan penuh tanggung jawab.</p>
        </div>
        <div className="flex items-center gap-4 bg-card px-6 py-3 rounded-2xl border border-border-premium shadow-sm w-fit self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] block">Tersedia</span>
            <span className="text-2xl font-black text-sky-600 leading-none">{exams.length}</span>
          </div>
          <div className="w-px h-8 bg-border-premium" />
          <BookOpen className="w-6 h-6 text-sky-600 opacity-40" />
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-[40px] border-2 border-dashed border-[var(--border-premium)] p-12 sm:p-24 text-center space-y-4">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto opacity-10">
            <BookOpen className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black opacity-40 italic">Belum ada ujian yang dijadwalkan.</h2>
            <p className="opacity-30 text-sm font-medium">Hubungi guru Anda jika Anda merasa ini adalah kesalahan.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {exams.map((exam) => (
            <div key={exam.id}>
              <ExamCard 
                exam={exam} 
                onRequestPermission={handleRequestPermission}
                isRequesting={isRequesting === exam.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ 
  exam, 
  onRequestPermission, 
  isRequesting 
}: { 
  exam: Exam, 
  onRequestPermission: (exam: Exam) => void,
  isRequesting: boolean
}) {
  const [countdown, setCountdown] = useState<string>('');
  
  useEffect(() => {
    if (exam.status !== 'upcoming' && exam.status !== 'active') return;
    
    const update = () => {
      const now = new Date().getTime();
      const start = new Date(exam.start_time).getTime();
      const end = new Date(exam.end_time).getTime();
      
      if (now < start) {
        const diff = start - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (h > 24) setCountdown(`${Math.floor(h/24)} Hari Lagi`);
        else if (h > 0) setCountdown(`${h}j ${m}m Lagi`);
        else setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      } else if (now < end) {
        const diff = end - now;
        const m = Math.floor(diff / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`Berakhir dlm ${m}:${s.toString().padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [exam.start_time, exam.end_time, exam.status]);

  const isAvailable = exam.status === 'active';
  const isUpcoming = exam.status === 'upcoming';
  const isEnded = exam.status === 'ended';
  const hasRequested = exam.session_status === 'awaiting_late_approval';
  
  return (
    <div className={cn(
      "bg-[var(--bg-card)] rounded-[32px] border transition-all flex flex-col group overflow-hidden",
      isAvailable ? "border-[var(--border-premium)] hover:border-sky-500 hover:shadow-2xl hover:shadow-sky-500/10" : "border-[var(--border-premium)] opacity-80"
    )}>
      <div className={cn(
        "h-3 transition-colors duration-500",
        isAvailable ? "bg-emerald-500" : 
        isUpcoming ? "bg-amber-500" : 
        isEnded ? "bg-rose-500" :
        "bg-black/10 dark:bg-white/10"
      )} />

      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="px-4 py-2 bg-sky-500/10 text-sky-600 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
            {exam.subject}
          </div>
          <StatusBadge status={exam.status || 'active'} />
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xl sm:text-2xl font-black text-[var(--primary)] group-hover:text-sky-600 transition-colors leading-tight tracking-tight">
            {exam.title}
          </h3>
          <p className="text-xs sm:text-sm font-bold opacity-40 border-l-2 border-[var(--border-premium)] pl-4 text-[var(--primary)] truncate">Oleh: {exam.teacher}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-[var(--bg-main)] rounded-2xl">
            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1 text-[var(--primary)]">Durasi</span>
            <div className="flex items-center gap-2 font-black text-[var(--primary)]">
              <Clock className="w-4 h-4 text-sky-500" />
              {exam.duration_minutes}m
            </div>
          </div>
          <div className="p-4 bg-[var(--bg-main)] rounded-2xl">
            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-1 text-[var(--primary)]">Sesi Berakhir</span>
            <div className="flex flex-col gap-0.5 font-black text-[var(--primary)]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <span className="text-xs">
                  {new Date(exam.end_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="text-[10px] text-rose-500 ml-6">
                {(() => {
                  const end = new Date(exam.end_time);
                  return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                })()}
              </div>
            </div>
          </div>
        </div>

        {isUpcoming && countdown && (
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Mulai Dalam</span>
            <span className="text-sm font-mono font-black text-amber-600">{countdown}</span>
          </div>
        )}

        {isAvailable && countdown && (
          <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sisa Waktu</span>
            <span className="text-sm font-mono font-black text-emerald-600">{countdown.replace('Berakhir dlm ', '')}</span>
          </div>
        )}

        {isEnded && (
          <div className="mb-6 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Waktu Terlewati</span>
            </div>
            <p className="text-[10px] font-bold text-rose-500/60 leading-relaxed">Anda tidak dapat mengikuti ujian ini karena sesi telah berakhir. Minta izin kepada guru untuk membuka akses.</p>
          </div>
        )}

        <div className="mt-auto">
          {isAvailable ? (
            <Link 
              to={`/exam/${exam.id}`}
              className="w-full py-5 bg-sky-600 text-white rounded-[24px] font-black hover:bg-sky-700 transition-all shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 group/btn"
            >
              Mulai Ujian <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          ) : isUpcoming ? (
            <div className="w-full py-5 bg-[var(--bg-main)] text-slate-400 border border-slate-200 dark:border-white/5 rounded-[24px] font-black flex items-center justify-center gap-3 cursor-not-allowed">
              <Clock className="w-5 h-5" /> Belum Mulai
            </div>
          ) : isEnded ? (
            hasRequested ? (
              <div className="w-full py-5 bg-amber-50 text-amber-600 border border-amber-200 rounded-[24px] font-black flex items-center justify-center gap-3 animate-pulse">
                <Clock className="w-5 h-5" /> Menunggu Izin...
              </div>
            ) : (
              <button 
                onClick={() => onRequestPermission(exam)}
                disabled={isRequesting}
                className="w-full py-5 bg-rose-600 text-white rounded-[24px] font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3"
              >
                {isRequesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                Minta Izin Guru
              </button>
            )
          ) : (
            <button disabled className="w-full py-5 bg-[var(--bg-main)] opacity-40 text-[var(--primary)] rounded-[24px] font-black cursor-not-allowed">
              Sesi Berakhir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <div className={cn(
      "px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest",
      status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
      status === 'upcoming' ? "bg-amber-50 text-amber-600 border-amber-100" :
      "bg-slate-50 text-slate-400 border-slate-100"
    )}>
      {status === 'active' ? "Berlangsung" : 
       status === 'upcoming' ? "Dijadwalkan" : 
       "Selesai"}
    </div>
  );
}

