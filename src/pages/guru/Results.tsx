import { useState, useEffect } from 'react';
import { 
  Trophy,
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface Question {
  id: string;
  subject: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  created_at: string;
}

interface ExamResult {
  id: string;
  exam: { title: string };
  siswa: { 
    full_name: string;
    class?: string;
    major?: string;
    class_index?: string;
  };
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
}

export default function Results() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    fetchUser();
    fetchResults();
  }, []);

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      setUser(profile);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // 1. Get exams created by this teacher
      const { data: myExams } = await supabase
        .from('exams')
        .select('id')
        .eq('created_by', authUser.id);
      
      const myExamIds = (myExams || []).map(e => e.id);
      
      if (myExamIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 2. Get sessions for those exams
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          score,
          total_questions,
          correct_answers,
          completed_at,
          exam_id,
          siswa_id
        `)
        .in('exam_id', myExamIds)
        .eq('status', 'submitted')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Ambil info pendukung (Exam & Siswa) secara manual untuk kestabilan
      const resultsWithInfo = await Promise.all((data || []).map(async (session) => {
        const { data: examData } = await supabase.from('exams').select('title').eq('id', session.exam_id).single();
        const { data: userData } = await supabase.from('profiles').select('full_name, class, major').eq('id', session.siswa_id).single();
        
        return {
          ...session,
          exam: examData || { title: 'Ujian dihapus' },
          siswa: userData || { full_name: 'Siswa tidak ditemukan' }
        };
      }));

      setResults(resultsWithInfo as any[]);
    } catch (err: any) {
      console.error('Master results fetch error:', err);
      toast.error(`Gagal Sinkron: ${err.message || 'Cek koneksi database'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(r => 
    r.siswa?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.exam?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length) 
    : 0;

  return (
    <div className="space-y-8 relative pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Hasil & Analisis</h2>
          <p className="text-slate-500 font-medium">Rekapitulasi nilai dan performa siswa secara otomatis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
               <Trophy className="w-6 h-6" />
             </div>
             <TrendingUp className="w-5 h-5 text-green-500" />
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Rata-rata Nilai</p>
           <p className="text-3xl font-black text-slate-900">{averageScore}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
               <CheckCircle2 className="w-6 h-6" />
             </div>
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Lulus (KKM 75)</p>
           <p className="text-3xl font-black text-slate-900">{results.filter(r => r.score >= 75).length}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
               <XCircle className="w-6 h-6" />
             </div>
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Butuh Remedial</p>
           <p className="text-3xl font-black text-slate-900">{results.filter(r => r.score < 75).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
           <Search className="w-5 h-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="Cari nama siswa atau ujian..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700"
           />
           <button className="p-2 text-slate-400 hover:text-slate-600">
             <Filter className="w-5 h-5" />
           </button>
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
             <thead>
               <tr className="border-b border-slate-100">
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Ujian</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Jawaban Benar</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Selesai</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {loading ? (
                 <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                     <Loader2 className={cn("w-10 h-10 animate-spin mx-auto mb-4", user?.role === 'admin' ? "text-accent" : "text-indigo-600")} />
                     <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Menarik Data Hasil...</p>
                   </td>
                 </tr>
               ) : filteredResults.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">
                     <div className="flex flex-col items-center justify-center space-y-4 py-10">
                        <p className="text-slate-400 font-bold">Belum ada hasil ujian yang tersedia.</p>
                     </div>
                   </td>
                 </tr>
               ) : (
                 filteredResults.map((r) => (
                   <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-5">
                        <p className="font-bold text-slate-900">{r.siswa?.full_name}</p>
                        {r.siswa?.class && (
                          <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">
                            {r.siswa.class} {r.siswa.major} {r.siswa.class_index || ''}
                          </p>
                        )}
                     </td>
                     <td className="px-8 py-5">
                       <span className={cn("text-xs font-black uppercase tracking-widest", user?.role === 'admin' ? "text-accent" : "text-indigo-600")}>{r.exam?.title}</span>
                     </td>
                     <td className="px-8 py-5 text-center">
                       <span className={cn(
                         "px-4 py-2 rounded-xl font-black text-lg",
                         r.score >= 75 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                       )}>
                         {Math.round(r.score)}
                       </span>
                     </td>
                     <td className="px-8 py-5 text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-slate-700">{r.correct_answers} / {r.total_questions}</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", user?.role === 'admin' ? "bg-accent" : "bg-indigo-600")} 
                              style={{ width: `${(r.correct_answers/r.total_questions)*100}%` }}
                            />
                          </div>
                       </div>
                     </td>
                     <td className="px-8 py-5 text-slate-500 text-sm font-medium">
                       {new Date(r.completed_at).toLocaleString('id-ID')}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className={cn("w-10 h-10 animate-spin mx-auto mb-4", user?.role === 'admin' ? "text-accent" : "text-indigo-600")} />
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Menarik Data Hasil...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold">
              Belum ada hasil ujian.
            </div>
          ) : (
            filteredResults.map((r) => (
              <div key={r.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 leading-tight">{r.siswa?.full_name}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", user?.role === 'admin' ? "text-accent" : "text-indigo-600")}>
                        {r.exam?.title}
                      </span>
                      {r.siswa?.class && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {r.siswa.class} {r.siswa.major} {r.siswa.class_index || ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl font-black text-sm",
                    r.score >= 75 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {Math.round(r.score)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ketelitian</p>
                    <p className="text-sm font-bold text-slate-700">{r.correct_answers} / {r.total_questions} Benar</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Seleasai</p>
                    <p className="text-[10px] font-bold text-slate-600">
                      {new Date(r.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(r.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

