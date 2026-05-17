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
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-[var(--primary)]">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Riwayat Ujian</h1>
          <p className="opacity-60 font-medium text-lg">Lihat kembali hasil perjuangan dan pencapaian Anda.</p>
        </div>
        <div className="flex bg-[var(--bg-card)] p-2 rounded-2xl border border-[var(--border-premium)] shadow-sm">
           <div className="px-6 py-3 bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/20 font-black flex items-center gap-3">
             <Trophy className="w-5 h-5" />
             <span>Terbaik: {history.length > 0 ? Math.max(...history.map(h => h.score)) : 0}</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto mb-6" />
          <p className="font-black opacity-40 uppercase tracking-widest text-sm text-[var(--primary)]">Menyusun Catatan...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-[40px] border-2 border-dashed border-[var(--border-premium)] p-20 text-center">
          <HistoryIcon className="w-20 h-20 opacity-10 mx-auto mb-6 text-[var(--primary)]" />
          <h2 className="text-2xl font-black text-[var(--primary)] tracking-tight">Belum ada riwayat ujian.</h2>
          <p className="opacity-40 mt-2 font-medium text-[var(--primary)]">Ujian yang Anda selesaikan akan muncul di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.map((item) => (
            <div key={item.id} className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-premium)] p-8 hover:border-sky-500 transition-all group flex flex-col md:flex-row md:items-center gap-8">
               <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 text-[var(--primary)]">
                    <div className="w-12 h-12 bg-sky-500/10 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black group-hover:text-sky-600 transition-colors uppercase tracking-tight">
                         {item.exam?.title}
                       </h3>
                       <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">
                         DIKERJAKAN PADA: {new Date(item.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </p>
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-10 text-[var(--primary)]">
                  <div className="text-center">
                     <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Akurasi</p>
                     <p className="text-lg font-black">{Math.round((item.correct_answers/item.total_questions)*100)}%</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Benar</p>
                     <p className="text-lg font-black">{item.correct_answers}/{item.total_questions}</p>
                  </div>
                  <div className={cn(
                    "w-24 h-24 rounded-[32px] flex flex-col items-center justify-center border-4 shadow-xl transition-all group-hover:scale-110",
                    item.score >= 75 ? "bg-sky-600 border-sky-400 shadow-sky-500/20" : "bg-red-600 border-red-400 shadow-red-500/20"
                  )}>
                    <span className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Nilai Akhir</span>
                    <span className="text-3xl font-black text-white">{Math.round(item.score)}</span>
                  </div>
                  <button className="p-4 bg-[var(--bg-main)] text-[var(--primary)] opacity-40 hover:opacity-100 hover:bg-sky-600 hover:text-white rounded-2xl transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
