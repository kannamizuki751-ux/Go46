import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle,
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
  status?: string;
  teacher?: string;
}

export default function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch already submitted sessions
        const { data: submittedSessions } = await supabase
          .from('exam_sessions')
          .select('exam_id')
          .eq('siswa_id', user.id)
          .eq('status', 'submitted');
        
        const submittedExamIds = new Set(submittedSessions?.map(s => s.exam_id) || []);

        const { data, error } = await supabase
          .from('exams')
          .select(`
            *,
            creator:profiles!created_by(full_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const formatted = data
          .filter(exam => !submittedExamIds.has(exam.id))
          .map(exam => ({
            ...exam,
            teacher: exam.creator?.full_name || 'Guru Pengawas',
            status: 'active'
          }));

        setExams(formatted);
      } catch (err) {
        console.error('Error fetching exams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daftar Ujian</h1>
          <p className="text-slate-500 mt-1 font-medium">Ujian yang tersedia untuk dikerjakan saat ini.</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Tersedia</span>
          <span className="text-2xl font-black text-blue-600">{exams.length}</span>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-100 p-20 text-center">
          <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-400">Belum ada ujian yang dijadwalkan.</h2>
          <p className="text-slate-300 mt-2">Hubungi guru Anda jika Anda merasa ini adalah kesalahan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: Exam }) {
  const isAvailable = exam.status === 'active';
  
  return (
    <div className={cn(
      "bg-white rounded-[32px] border transition-all flex flex-col group overflow-hidden",
      isAvailable ? "border-slate-100 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-100" : "border-slate-100 opacity-80"
    )}>
      <div className={cn(
        "h-3",
        exam.status === 'active' ? "bg-blue-600" : "bg-slate-200"
      )} />

      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
            {exam.subject}
          </div>
          <StatusBadge status={exam.status || 'active'} />
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors leading-tight tracking-tight">
          {exam.title}
        </h3>
        <p className="text-sm font-bold text-slate-400 mb-8 border-l-2 border-slate-100 pl-4">Oleh: {exam.teacher}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Durasi</span>
            <div className="flex items-center gap-2 font-black text-slate-700">
              <Clock className="w-4 h-4 text-blue-500" />
              {exam.duration_minutes}m
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tanggal</span>
            <div className="flex items-center gap-2 font-black text-slate-700">
              <Calendar className="w-4 h-4 text-blue-500" />
              {new Date(exam.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          {exam.status === 'active' ? (
            <Link 
              to={`/exam/${exam.id}`}
              className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group/btn"
            >
              Mulai Ujian <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          ) : (
            <button disabled className="w-full py-5 bg-slate-100 text-slate-400 rounded-[24px] font-black cursor-not-allowed">
              Belum Tersedia
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
      status === 'active' ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-50 text-slate-400 border-slate-100"
    )}>
      {status === 'active' ? "Tersedia" : "Selesai"}
    </div>
  );
}

