import { useState, useEffect } from 'react';
import { 
  History as HistoryIcon,
  Search, 
  Calendar,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ExamHistory {
  id: string;
  exam: { title: string };
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
}

export default function History() {
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          score,
          total_questions,
          correct_answers,
          completed_at,
          exam_id
        `)
        .eq('siswa_id', user.id)
        .eq('status', 'submitted')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Manual join for exam info
      const historyWithInfo = await Promise.all((data || []).map(async (item) => {
        const { data: examData } = await supabase
          .from('exams')
          .select('title')
          .eq('id', item.exam_id)
          .single();
        
        return {
          ...item,
          exam: examData || { title: 'Ujian dihapus' }
        };
      }));

      setHistory(historyWithInfo as any[]);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-[var(--primary)] text-center sm:text-left">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">Riwayat Ujian</h1>
          <p className="opacity-60 font-medium text-sm sm:text-lg">Lihat kembali hasil perjuangan dan pencapaian Anda.</p>
        </div>
        <div className="flex bg-[var(--bg-card)] p-2 rounded-2xl border border-[var(--border-premium)] shadow-sm w-fit mx-auto sm:mx-0">
           <div className="px-6 py-3 bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/20 font-black flex items-center gap-3">
             <Trophy className="w-5 h-5" />
             <span className="text-sm">Terbaik: {history.length > 0 ? Math.max(...history.map(h => h.score)) : 0}</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto mb-6" />
          <p className="font-black opacity-40 uppercase tracking-widest text-xs sm:text-sm text-[var(--primary)] px-4">Menyusun Catatan...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-[40px] border-2 border-dashed border-[var(--border-premium)] p-12 sm:p-24 text-center space-y-4">
          <HistoryIcon className="w-16 h-16 opacity-10 mx-auto text-[var(--primary)]" />
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--primary)] tracking-tight italic">Belum ada riwayat ujian.</h2>
            <p className="opacity-40 font-medium text-sm text-[var(--primary)]">Ujian yang Anda selesaikan akan muncul di sini.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {history.map((item) => (
            <div key={item.id} className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-premium)] p-6 sm:p-8 hover:border-sky-500 transition-all group flex flex-col md:flex-row md:items-center gap-6 sm:gap-8">
               <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4 text-[var(--primary)]">
                    <div className="w-12 h-12 bg-sky-500/10 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-lg sm:text-xl font-black group-hover:text-sky-600 transition-colors uppercase tracking-tight truncate">
                         {item.exam?.title}
                       </h3>
                       <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1 truncate">
                         {new Date(item.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </p>
                    </div>
                  </div>
               </div>

               <div className="flex items-center justify-between md:justify-end gap-6 sm:gap-10 text-[var(--primary)] pt-6 md:pt-0 border-t md:border-t-0 border-[var(--border-premium)]">
                  <div className="flex gap-6 sm:gap-10">
                    <div className="text-center">
                       <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Akurasi</p>
                       <p className="text-base sm:text-lg font-black">{Math.round((item.correct_answers/item.total_questions)*100)}%</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Benar</p>
                       <p className="text-base sm:text-lg font-black">{item.correct_answers}/{item.total_questions}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center border-2 sm:border-4 shadow-xl transition-all group-hover:scale-110 shrink-0",
                      item.score >= 75 ? "bg-sky-600 border-sky-400 shadow-sky-500/20" : "bg-red-600 border-red-400 shadow-red-500/20"
                    )}>
                      <span className="text-[7px] sm:text-[8px] font-black text-white/60 uppercase tracking-widest leading-tight">Nilai</span>
                      <span className="text-xl sm:text-2xl font-black text-white leading-none mt-1">{Math.round(item.score)}</span>
                    </div>
                    <button className="hidden sm:flex p-4 bg-[var(--bg-main)] text-[var(--primary)] opacity-40 hover:opacity-100 hover:bg-sky-600 hover:text-white rounded-2xl transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
