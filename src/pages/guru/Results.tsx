import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Download, 
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ExamResult {
  id: string;
  exam: { title: string };
  siswa: { full_name: string };
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
}

export default function Results() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          score,
          total_questions,
          correct_answers,
          completed_at,
          exam:exams(title),
          siswa:profiles!siswa_id(full_name)
        `)
        .eq('status', 'submitted')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setResults(data as any[]);
    } catch (err) {
      console.error('Error fetching results:', err);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hasil & Analisis</h2>
          <p className="text-slate-500 font-medium">Rekapitulasi nilai dan performa siswa secara otomatis.</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200">
          <Download className="w-5 h-5" />
          Export Excel
        </button>
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

        <div className="overflow-x-auto">
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
                     <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                     <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Menarik Data Hasil...</p>
                   </td>
                 </tr>
               ) : filteredResults.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">
                     Belum ada hasil ujian yang tersedia.
                   </td>
                 </tr>
               ) : (
                 filteredResults.map((r) => (
                   <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-5 font-bold text-slate-900">{r.siswa?.full_name}</td>
                     <td className="px-8 py-5">
                       <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{r.exam?.title}</span>
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
                              className="h-full bg-blue-500 rounded-full" 
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
      </div>
    </div>
  );
}
