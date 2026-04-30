import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  HelpCircle,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface Question {
  id: string;
  subject: string;
  content: string;
  options: string[];
  correct_answer: number;
  created_at: string;
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
    fetchQuestions();
    
    const channel = supabase
      .channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('questions').insert({
        content,
        subject,
        options,
        correct_answer: correctAnswer
      });

      if (error) throw error;
      
      setShowAddModal(false);
      setContent('');
      setOptions(['', '', '', '']);
    } catch (err) {
      alert('Gagal menambah soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return;
    try {
      await supabase.from('questions').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const subjects = ['Semua', ...new Set(questions.map(q => q.subject))];

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'Semua' || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bank Soal</h2>
          <p className="text-slate-500 font-medium">Kelola koleksi soal ujian untuk berbagai mata pelajaran.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Buat Soal Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
           <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pencarian</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kata kunci..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</label>
                <div className="space-y-2">
                  {subjects.map(sub => (
                    <button 
                      key={sub} 
                      onClick={() => setSelectedSubject(sub)}
                      className={cn(
                        "w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                        selectedSubject === sub ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {sub}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] transition-colors",
                        selectedSubject === sub ? "bg-blue-500 text-white" : "bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600"
                      )}>
                        {sub === 'Semua' ? questions.length : questions.filter(q => q.subject === sub).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
           </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          {loading ? (
             <div className="bg-white rounded-[32px] border border-slate-200 p-20 text-center animate-pulse">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Memuat Database...</p>
             </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-[32px] border border-slate-100 p-20 text-center border-dashed">
              <HelpCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">Belum ada soal ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <div key={q.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-200 transition-all group">
                   <div className="flex items-start justify-between gap-4">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            {q.subject}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">ID: {q.id.slice(0,8)}</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 leading-relaxed">{q.content}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {q.options.map((opt, idx) => (
                            <div key={idx} className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-3",
                              q.correct_answer === idx ? "bg-green-50 border-green-100 text-green-700" : "bg-slate-50 border-transparent text-slate-500"
                            )}>
                              <span className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                                q.correct_answer === idx ? "bg-green-600 text-white" : "bg-white border border-slate-200"
                              )}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => deleteQuestion(q.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-2xl w-full shadow-2xl relative"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl">
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Buat Soal Baru</h3>
              
              <form onSubmit={handleAddQuestion} className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pertanyaan</label>
                   <textarea 
                     required
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-bold min-h-[100px]"
                     placeholder="Tuliskan pertanyaan di sini..."
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mata Pelajaran</label>
                      <select 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none cursor-pointer"
                      >
                        <option>Matematika</option>
                        <option>Biologi</option>
                        <option>Fisika</option>
                        <option>B. Inggris</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jawaban Benar</label>
                      <select 
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(Number(e.target.value))}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none cursor-pointer"
                      >
                        <option value={0}>Opsi A</option>
                        <option value={1}>Opsi B</option>
                        <option value={2}>Opsi C</option>
                        <option value={3}>Opsi D</option>
                      </select>
                    </div>
                 </div>

                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Opsi Jawaban</label>
                   <div className="grid grid-cols-2 gap-4">
                    {options.map((opt, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-600">{String.fromCharCode(65 + idx)}</span>
                        <input 
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx] = e.target.value;
                            setOptions(newOpts);
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-200 transition-all"
                          placeholder={`Opsi ${String.fromCharCode(65 + idx)}...`}
                        />
                      </div>
                    ))}
                   </div>
                 </div>

                 <button 
                   disabled={isSubmitting}
                   className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black shadow-2xl shadow-blue-200 transition-all disabled:opacity-50"
                 >
                   {isSubmitting ? 'Menyimpan...' : 'Simpan ke Bank Soal'}
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
