import { useState, useEffect, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  HelpCircle,
  Loader2,
  X,
  Edit2,
  Filter,
  CheckCircle2,
  BookOpen,
  Hash,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  SquareStack
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Form State
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [draftQuestions, setDraftQuestions] = useState<Array<{
    question_text: string;
    subject: string;
    options: string[];
    correctAnswer: number;
    tempId: string;
  }>>([{
    question_text: '',
    subject: 'RPL',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tempId: Math.random().toString(36).substr(2, 9)
  }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const supabase = getSupabase();

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        fetchQuestions(authUser.id);
      }
    };
    init();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('questions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, async (payload) => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          fetchQuestions(authUser.id);
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const fetchQuestions = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err: any) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addAnotherDraft = () => {
    setDraftQuestions(prev => [
      ...prev,
      {
        question_text: '',
        subject: prev[prev.length - 1]?.subject || 'RPL',
        options: ['', '', '', ''],
        correctAnswer: 0,
        tempId: Math.random().toString(36).substr(2, 9)
      }
    ]);
  };

  const removeDraft = (idx: number) => {
    if (draftQuestions.length === 1) return;
    setDraftQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDraft = (idx: number, key: string, value: any) => {
    setDraftQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: value };
      return updated;
    });
  };

  const handlePublishQuestions = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    const invalid = draftQuestions.find(q => 
      !q.question_text.trim() || 
      q.options.some(opt => !opt.trim())
    );

    if (invalid) {
      alert('Terdapat soal atau opsi yang masih kosong. Mohon lengkapi semua data.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Unauthorized');

      const payloads = draftQuestions.map(q => ({
        subject: q.subject,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correctAnswer,
        created_by: authUser.id
      }));

      let res;
      if (editingQuestion) {
        // If editing, we only update the first one in the draft list (since edit mode only shows one)
        res = await supabase
          .from('questions')
          .update(payloads[0])
          .eq('id', editingQuestion.id);
      } else {
        // Insert multiple records
        res = await supabase
          .from('questions')
          .insert(payloads);
      }

      if (res.error) {
        console.error('Supabase error:', res.error);
        if (res.error.message?.toLowerCase().includes('column "question_text"')) {
          throw new Error('Gagal: Kolom "question_text" tidak ditemukan di tabel "questions". Hubungi administrator.');
        }
        throw new Error(res.error.message || 'Database error occurred.');
      }
      
      setShowAddModal(false);
      setEditingQuestion(null);
      resetForm();
      if (authUser) fetchQuestions(authUser.id);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert('GAGAL: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDraftQuestions([{
      question_text: '',
      subject: 'RPL',
      options: ['', '', '', ''],
      correctAnswer: 0,
      tempId: Math.random().toString(36).substr(2, 9)
    }]);
  };

  const startEdit = (q: Question) => {
    setEditingQuestion(q);
    setDraftQuestions([{
      question_text: q.question_text,
      subject: q.subject,
      options: [...q.options],
      correctAnswer: q.correct_answer,
      tempId: q.id
    }]);
    setShowAddModal(true);
  };

  const deleteQuestion = async (id: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      setDeletingId(null);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) fetchQuestions(authUser.id);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjectsList = [
    'RPL',
    'Bahasa Jepang',
    'Muatan Lokal',
    'PKWU',
    'Pendidikan Agama Islam',
    'Pendidikan Agama Kristen',
    'Matematika',
    'PJOK',
    'Bahasa Inggris',
    'Sejarah',
    'Bahasa Indonesia',
    'PKN'
  ];
  const dynamicSubjects = ['Semua', ...Array.from(new Set(questions.map(q => q.subject)))];

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'Semua' || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-8 space-y-10 min-h-screen">
      {/* Clean Action Header Section */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-950/60 p-6 sm:p-10 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 blur-[120px] -mr-48 -mt-48 rounded-full mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] -ml-24 -mb-24 rounded-full mix-blend-screen opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
              Bank <span className="text-accent underline decoration-slate-400/20 underline-offset-4">Soal</span>
            </h1>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em] ml-0.5">Pusat Manajemen Materi Ujian</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex-1 md:flex-none p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-400 hover:text-accent transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Filter className={cn("w-4 h-4", showFilters && "text-accent")} />
              {showFilters ? 'Sembunyikan' : 'Tampilkan Filter'}
            </button>
            <motion.button 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={() => setShowAddModal(true)}
              className="flex-1 md:flex-none group relative inline-flex items-center justify-center gap-4 bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-black transition-all hover:bg-accent dark:hover:bg-accent hover:text-white shadow-lg active:scale-95 overflow-hidden shrink-0 text-sm"
            >
              <div className="hidden sm:block bg-white/10 dark:bg-black/5 group-hover:bg-white/20 p-2 rounded-lg transition-colors">
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </div>
              <span className="tracking-tighter uppercase whitespace-nowrap">Buat Materi Baru</span>
              <ArrowRight className="hidden sm:block w-4 h-4 transition-transform group-hover:translate-x-2" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* Advanced Filters */}
        <aside className={cn(
          "lg:col-span-3 space-y-6 lg:block",
          showFilters ? "block animate-in fade-in slide-in-from-top-4" : "hidden"
        )}>
          <div className="sticky top-10 space-y-6">
            <div className="bg-white/90 dark:bg-slate-900/40 backdrop-blur-3xl p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-xl space-y-10 transition-all">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">
                  <SquareStack className="w-4 h-4" />
                  Mode Tampilan
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[9px] transition-all border",
                      viewMode === 'grid' 
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                    )}
                  >
                    <LayoutGrid className="w-3 h-3" /> GRID
                  </button>
                  <button 
                    onClick={() => {
                      setViewMode('carousel');
                      setCarouselIndex(0);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[9px] transition-all border",
                      viewMode === 'carousel' 
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                    )}
                  >
                    <SquareStack className="w-3 h-3" /> SWAP
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">
                  <Search className="w-4 h-4" />
                  Eksplorasi Katalog
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Keywords, materi..."
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-transparent dark:border-white/5 rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent/40 transition-all text-sm placeholder:text-slate-400 dark:placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">
                  <Filter className="w-4 h-4" />
                  Filter Kategoris
                </div>
                <div className="flex flex-col gap-2">
                  {dynamicSubjects.map((sub, i) => (
                    <button 
                      key={typeof sub === 'string' ? sub : i} 
                      onClick={() => setSelectedSubject(sub)}
                      className={cn(
                        "group flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black transition-all border relative overflow-hidden",
                        selectedSubject === sub 
                          ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                          : "bg-slate-50 dark:bg-white/5 border-slate-100/50 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-accent/30 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/10"
                      )}
                    >
                      {typeof sub === 'string' ? sub.toUpperCase() : String(sub).toUpperCase()}
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black transition-colors",
                        selectedSubject === sub ? "bg-white/20 text-white" : "bg-slate-200/50 dark:bg-slate-950 text-slate-400 dark:text-slate-600"
                      )}>
                        {sub === 'Semua' ? questions.length : questions.filter(q => q.subject === sub).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Data Stream */}
        <main className="lg:col-span-9">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white/5 dark:bg-slate-950/30 rounded-[32px] border border-slate-200 dark:border-white/5 backdrop-blur-md">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl animate-pulse" />
                <div className="absolute inset-0 border-2 border-slate-100 dark:border-white/5 rounded-full" />
                <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-slate-900 dark:text-white font-black text-lg tracking-tight">Menyinkronkan Arsip</p>
                <p className="text-slate-400 dark:text-slate-600 font-medium text-xs">Menghubungkan ke basis data edukasi...</p>
              </div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white dark:bg-slate-950/30 rounded-[40px] border border-dashed border-slate-200 dark:border-white/10 p-20 text-center space-y-6 backdrop-blur-md shadow-sm">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/80 rounded-[32px] flex items-center justify-center mx-auto border border-slate-200/60 dark:border-white/5 shadow-inner">
                <HelpCircle className="w-8 h-8 text-slate-200 dark:text-slate-500/20" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter">Tidak Ada Data Yang Sesuai</h3>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-sm mx-auto leading-relaxed italic">"Arsip soal belum tersedia untuk kriteria ini. Mulailah membangun bank soal Anda."</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 pb-20">
              <AnimatePresence>
                {filteredQuestions.map((q, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
                    layout
                    key={q.id} 
                    className="group bg-white dark:bg-slate-900/40 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-200/60 dark:border-white/5 hover:border-accent dark:hover:border-accent/30 shadow-sm dark:shadow-lg transition-all relative overflow-hidden"
                  >
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    
                    <div className="flex flex-col lg:flex-row gap-8 sm:gap-10 relative z-10">
                      <div className="flex-1 space-y-6">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full">
                            <div className="w-1 h-1 rounded-full bg-accent" />
                            <span className="text-[8px] sm:text-[9px] font-black text-accent uppercase tracking-[0.2em]">{q.subject}</span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-slate-800/40 border border-indigo-100 dark:border-white/10 rounded-full">
                            <Clock className="w-3 h-3 text-indigo-400 dark:text-slate-600" />
                            <span className="text-[8px] sm:text-[9px] font-mono text-indigo-400 dark:text-slate-600 uppercase tracking-[0.2em]">ID: {q.id.slice(0,8).toUpperCase()}</span>
                          </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-[1.3] tracking-tight">
                          {q.question_text}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {q.options.map((opt, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-[20px] text-xs font-bold border transition-all",
                                q.correct_answer === i 
                                  ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 shadow-sm shadow-green-500/5 ring-1 ring-green-500/10" 
                                  : "bg-white dark:bg-slate-950/40 border-slate-100 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 font-black text-[10px] transition-all border",
                                q.correct_answer === i 
                                  ? "bg-green-500 border-green-400 text-white shadow-md shadow-green-500/30" 
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-600"
                              )}>
                                {String.fromCharCode(65 + i)}
                              </div>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                              {q.correct_answer === i && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-3 shrink-0 justify-end lg:justify-start">
                        <button 
                          onClick={() => startEdit(q)}
                          className="flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl border border-slate-200 dark:border-white/5 transition-all shadow-md"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        
                        <div className="relative group/delete">
                          <AnimatePresence mode="wait">
                            {deletingId === q.id ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex gap-2"
                              >
                                <button 
                                  onClick={() => deleteQuestion(q.id)}
                                  className="px-6 py-4 bg-red-600 text-white rounded-[20px] text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                                >
                                  HAPUS
                                </button>
                                <button 
                                  onClick={() => setDeletingId(null)}
                                  className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center border border-white/5"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </motion.div>
                            ) : (
                              <button 
                                onClick={() => setDeletingId(q.id)}
                                className="w-12 h-12 bg-white/5 hover:bg-red-600/10 hover:text-red-500 text-slate-600 rounded-2xl border border-white/5 transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="relative pb-20">
               <div className="flex items-center justify-between mb-8 px-4 font-black text-slate-500 text-[10px] tracking-[0.4em]">
                  <span>CATALOG SLIDE {carouselIndex + 1} / {filteredQuestions.length}</span>
                  <div className="flex gap-3">
                     <button 
                       disabled={carouselIndex === 0}
                       onClick={() => setCarouselIndex(prev => prev - 1)}
                       className="p-4 bg-white/5 disabled:opacity-20 rounded-2xl border border-white/5"
                     >
                       <ChevronLeft />
                     </button>
                     <button 
                       disabled={carouselIndex === filteredQuestions.length - 1}
                       onClick={() => setCarouselIndex(prev => prev + 1)}
                       className="p-4 bg-white/5 disabled:opacity-20 rounded-2xl border border-white/5"
                     >
                       <ChevronRight />
                     </button>
                  </div>
               </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={filteredQuestions[carouselIndex]?.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="bg-white dark:bg-slate-900 p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] border border-slate-200 dark:border-white/10 shadow-2xl min-h-[400px] flex flex-col justify-between transition-all"
                  >
                     <div className="space-y-8">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3 px-5 py-2.5 bg-accent/10 dark:bg-accent/20 rounded-full border border-accent/20 dark:border-accent/30">
                              <BookOpen className="w-4 h-4 text-accent" />
                              <span className="text-[10px] font-black text-accent uppercase tracking-widest">{filteredQuestions[carouselIndex]?.subject}</span>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => startEdit(filteredQuestions[carouselIndex])}
                                className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteQuestion(filteredQuestions[carouselIndex]?.id)}
                                className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>

                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
                           {filteredQuestions[carouselIndex]?.question_text}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {filteredQuestions[carouselIndex]?.options.map((opt, i) => (
                              <div 
                                key={i}
                                className={cn(
                                  "p-6 rounded-2xl border-2 transition-all flex items-center gap-5",
                                  filteredQuestions[carouselIndex]?.correct_answer === i 
                                    ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20" 
                                    : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400"
                                )}
                              >
                                 <div className={cn(
                                   "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border",
                                   filteredQuestions[carouselIndex]?.correct_answer === i ? "bg-white text-green-600 border-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                                 )}>
                                    {String.fromCharCode(65 + i)}
                                 </div>
                                 <span className="text-sm font-bold">{opt}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </motion.div>
               </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Advanced Editor Suite */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-white/90 dark:bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <div className="min-h-full flex items-start justify-center w-full py-8 sm:py-20">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  className="bg-white dark:bg-slate-950/80 backdrop-blur-3xl rounded-[32px] p-5 sm:p-10 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-white/5 relative"
                >
                  <button 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingQuestion(null);
                      resetForm();
                    }} 
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-slate-200 dark:border-white/5 z-30 shadow-md"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <div className="space-y-8">
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 dark:bg-accent/20 text-accent rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-accent/20">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Live Multi-Editor Suite
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                          {editingQuestion ? 'Revisi Materi' : 'Konstruksi Massal'}
                        </h3>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">Slot Draft #{currentDraftIndex + 1} dari {draftQuestions.length}</p>
                      </div>

                      <div className="flex gap-2">
                        {!editingQuestion && (
                          <button 
                            type="button"
                            onClick={() => {
                              addAnotherDraft();
                              setCurrentDraftIndex(draftQuestions.length);
                            }}
                            className="flex items-center gap-2.5 bg-accent dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl font-black hover:bg-slate-900 dark:hover:bg-accent transition-all text-[10px] shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            SLOT BARU
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="flex items-center justify-center gap-2">
                        {draftQuestions.map((_, i) => (
                           <button
                             key={i}
                             type="button"
                             onClick={() => setCurrentDraftIndex(i)}
                             className={cn(
                               "w-1.5 h-1.5 rounded-full transition-all",
                                currentDraftIndex === i ? "bg-accent w-5" : "bg-slate-200 dark:bg-white/10 hover:bg-accent/30"
                             )}
                           />
                        ))}
                    </div>

                    <form onSubmit={handlePublishQuestions} className="space-y-6">
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <motion.div 
                            key={currentDraftIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-slate-50 dark:bg-slate-900/60 p-5 sm:p-8 rounded-3xl border border-slate-100 dark:border-white/5 space-y-8"
                          >
                            <div className="absolute -left-2.5 -top-2.5 flex items-center justify-center w-9 h-9 bg-accent text-white rounded-xl font-black shadow-lg z-20 text-xs">
                              {currentDraftIndex + 1}
                            </div>

                            {draftQuestions.length > 1 && !editingQuestion && (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (currentDraftIndex > 0) setCurrentDraftIndex(prev => prev - 1);
                                  removeDraft(currentDraftIndex);
                                }}
                                className="absolute -right-2.5 -top-2.5 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg border border-white/10 z-20"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Draft Form Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                              <div className="lg:col-span-12 space-y-3">
                                <textarea 
                                  required
                                  value={draftQuestions[currentDraftIndex].question_text}
                                  onChange={(e) => updateDraft(currentDraftIndex, 'question_text', e.target.value)}
                                  className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-accent/10 focus:border-accent/40 text-slate-900 dark:text-white transition-all outline-none font-bold min-h-[100px] text-base placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-sm"
                                  placeholder="Tulis soal Anda..."
                                />
                              </div>

                              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Pelajaran</label>
                                    <div className="relative">
                                      <select 
                                        value={draftQuestions[currentDraftIndex].subject}
                                        onChange={(e) => updateDraft(currentDraftIndex, 'subject', e.target.value)}
                                        className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl font-black text-xs text-slate-900 dark:text-white outline-none cursor-pointer focus:border-accent transition-all appearance-none text-center shadow-md"
                                      >
                                        {subjectsList.map(s => <option key={s} className="dark:bg-slate-900" value={s}>{s.toUpperCase()}</option>)}
                                      </select>
                                      <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-700 rotate-90" />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Kunci Jawaban</label>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[0, 1, 2, 3].map((val) => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => updateDraft(currentDraftIndex, 'correctAnswer', val)}
                                          className={cn(
                                            "py-3 rounded-lg font-black text-sm transition-all border",
                                            draftQuestions[currentDraftIndex].correctAnswer === val 
                                              ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30" 
                                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-600 hover:border-accent"
                                          )}
                                        >
                                          {String.fromCharCode(65 + val)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 px-1">
                                    <div className="w-6 h-6 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
                                      <CheckCircle2 className="w-3 h-3 text-accent" />
                                    </div>
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Pilihan Jawaban</label>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {draftQuestions[currentDraftIndex].options.map((opt, optIdx) => (
                                      <div key={optIdx} className="relative group">
                                        <div className={cn(
                                          "absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center font-black transition-all border z-10 text-[9px]",
                                          draftQuestions[currentDraftIndex].correctAnswer === optIdx 
                                            ? "bg-green-500 border-green-400 text-white" 
                                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-600"
                                        )}>
                                          {String.fromCharCode(65 + optIdx)}
                                        </div>
                                        <input 
                                          required
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...draftQuestions[currentDraftIndex].options];
                                            newOpts[optIdx] = e.target.value;
                                            updateDraft(currentDraftIndex, 'options', newOpts);
                                          }}
                                          className={cn(
                                            "w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 rounded-xl font-bold outline-none border transition-all text-slate-900 dark:text-white text-xs placeholder:text-slate-300 dark:placeholder:text-slate-800",
                                            draftQuestions[currentDraftIndex].correctAnswer === optIdx ? "border-green-500 ring-4 ring-green-500/5" : "border-slate-200 dark:border-white/10 focus:border-accent"
                                          )}
                                          placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex gap-2 flex-1">
                           <button 
                             type="button"
                             disabled={currentDraftIndex === 0}
                             onClick={() => setCurrentDraftIndex(prev => prev - 1)}
                             className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white disabled:opacity-20 rounded-xl font-black border border-slate-200 dark:border-white/5 flex items-center justify-center gap-2 text-[10px]"
                           >
                              <ChevronLeft className="w-3.5 h-3.5" /> PREV
                           </button>
                           <button 
                             type="button"
                             disabled={currentDraftIndex === draftQuestions.length - 1}
                             onClick={() => setCurrentDraftIndex(prev => prev + 1)}
                             className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white disabled:opacity-20 rounded-xl font-black border border-slate-200 dark:border-white/5 flex items-center justify-center gap-2 text-[10px]"
                           >
                              NEXT <ChevronRight className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        
                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-[1.5] py-4 bg-accent text-white rounded-2xl font-black text-lg shadow-lg transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              MEMPROSES...
                            </>
                          ) : (
                            <>
                              <span className="tracking-tight">{editingQuestion ? 'SIMPAN PERUBAHAN' : `PUBLISH (${draftQuestions.length})`}</span>
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
