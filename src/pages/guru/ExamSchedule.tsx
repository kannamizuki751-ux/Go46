import { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  Trash2, 
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../../lib/supabase';

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  created_at: string;
}

export default function ExamSchedule() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = getSupabase();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async () => {
    const { data } = await supabase.from('questions').select('*');
    if (data) setAvailableQuestions(data);
  };

  useEffect(() => {
    fetchExams();
    fetchAvailableQuestions();
    
    const channel = supabase
      .channel('exams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        fetchExams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      alert('Pilih minimal satu soal!');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Create Exam
      const { data: examData, error } = await supabase
        .from('exams')
        .insert({
          title,
          duration_minutes: parseInt(duration),
          anti_cheat_enabled: true
        })
        .select()
        .single();

      if (error) throw error;
      
      // 2. Link Questions
      const examQuestions = selectedQuestions.map(qId => ({
        exam_id: examData.id,
        question_id: qId
      }));

      const { error: linkError } = await supabase
        .from('exam_questions')
        .insert(examQuestions);
      
      if (linkError) throw linkError;

      setShowAddModal(false);
      setTitle('');
      setSelectedQuestions([]);
    } catch (err) {
      console.error(err);
      alert('Gagal menjadwalkan ujian');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Hapus jadwal ujian ini? Semua sesi terkait akan ikut terhapus.')) return;
    try {
      await supabase.from('exams').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Jadwal Ujian</h2>
          <p className="text-slate-500 font-medium">Buat dan kelola sesi ujian aktif untuk siswa.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Tambah Jadwal
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[500px]">
        {loading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-400">Sinkronisasi Jadwal...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-20 text-center">
            <Calendar className="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Belum ada ujian yang dijadwalkan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <div key={exam.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center shadow-sm">
                     <BookOpen className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                     <h4 className="text-xl font-black text-slate-900">{exam.title}</h4>
                     <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                       <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} Menit</span>
                       <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                       <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(exam.created_at).toLocaleDateString('id-ID')}</span>
                     </div>
                   </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <button 
                      onClick={() => deleteExam(exam.id)}
                      className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-100 hover:shadow-lg rounded-[20px] transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl">
                <X className="w-6 h-6" />
              </button>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Jadwalkan Ujian</h3>
                  <p className="text-slate-400 mt-2 font-medium">Buat sesi pengerjaan ujian baru.</p>
                </div>

                <form onSubmit={handleAddExam} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ujian</label>
                     <input 
                       required
                       value={title}
                       onChange={(e) => setTitle(e.target.value)}
                       className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:border-blue-500 focus:bg-white outline-none font-bold transition-all"
                       placeholder="Contoh: UAS Matematika Kelas X"
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durasi (Menit)</label>
                     <input 
                       required
                       type="number"
                       value={duration}
                       onChange={(e) => setDuration(e.target.value)}
                       className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:border-blue-500 focus:bg-white outline-none font-bold transition-all"
                       placeholder="60"
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Soal ({selectedQuestions.length} Terpilih)</label>
                     <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar border-2 border-slate-50 rounded-2xl p-2 bg-slate-50/50">
                        {availableQuestions.length === 0 ? (
                          <p className="p-4 text-center text-xs text-slate-400 font-bold">Belum ada soal di Bank Soal.</p>
                        ) : availableQuestions.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => toggleQuestion(q.id)}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group",
                              selectedQuestions.includes(q.id) ? "bg-blue-50 border-blue-600 shadow-sm" : "bg-white border-transparent hover:border-slate-100"
                            )}
                          >
                             <div className="flex-1">
                               <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">{q.subject}</p>
                               <p className="text-xs font-bold text-slate-700 line-clamp-2">{q.content}</p>
                             </div>
                             <div className={cn(
                               "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                               selectedQuestions.includes(q.id) ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200"
                             )}>
                               {selectedQuestions.includes(q.id) && <Plus className="w-4 h-4 rotate-45" />}
                             </div>
                          </button>
                        ))}
                     </div>
                   </div>

                   <button 
                     disabled={isSubmitting || availableQuestions.length === 0}
                     className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-2xl shadow-blue-200 transition-all disabled:opacity-50"
                   >
                     {isSubmitting ? 'Menjadwalkan...' : 'Publikasikan Ujian'}
                   </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
