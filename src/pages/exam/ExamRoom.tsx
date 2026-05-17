import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Clock, 
  Send, 
  CheckSquare,
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Lock,
  MessageSquare,
  Activity
} from 'lucide-react';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { cn } from '../../lib/utils';
import { getSupabase } from '../../lib/supabase';

interface Question {
  id: string;
  subject: string;
  question_text: string;
  options: string[];
  correct_answer: number;
}

interface ExamData {
  id: string;
  title: string;
  duration_minutes: number;
  anti_cheat_enabled: boolean;
}

export default function ExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const supabase = getSupabase();
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initTimer = (sessionData: any, examData: ExamData) => {
    const start = new Date(sessionData.start_time || sessionData.created_at).getTime();
    const duration = examData.duration_minutes * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((start + duration - now) / 1000));
    setTimeLeft(remaining);
  };

  // Initialize Exam & Session
  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    const initExam = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          if (!user) navigate('/login');
          return;
        }

        // 1. Fetch Exam Info
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();

        if (examError || !isMounted) throw examError;

        // 2. Fetch or Create Session
        let { data: activeSession, error: sError } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('exam_id', examId)
          .eq('siswa_id', user.id)
          .maybeSingle();

        if (sError) throw sError;

        if (!activeSession) {
          const { data: newData, error: createError } = await supabase
            .from('exam_sessions')
            .insert({ 
              exam_id: examId,
              siswa_id: user.id,
              status: 'ongoing',
              start_time: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) throw createError;
          activeSession = newData;
        }

        if (!activeSession || !isMounted) return;

        // Time Enforcement - Only check if NOT late_approved
        if (activeSession.status !== 'late_approved') {
          const now = Date.now();
          const start = new Date(examData.start_time).getTime();
          const end = new Date(examData.end_time || (start + examData.duration_minutes * 60 * 1000)).getTime();
          
          if (now < start) {
            toast.error('Ujian belum dimulai!');
            navigate('/app/exam');
            return;
          }

          if (now > end + 300000) { // 5 min grace period
            toast.error('Sesi Ujian sudah berakhir!');
            navigate('/app/exam');
            return;
          }
        }

        setExam(examData);

        // 3. Fetch Questions
        const { data: eqData, error: eqError } = await supabase
          .from('exam_questions')
          .select('question_id')
          .eq('exam_id', examId);

        if (eqError || !isMounted) throw eqError;
        
        const questionIds = (eqData || []).map(d => d.question_id);
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds);

        if (qError || !isMounted) throw qError;
        setQuestions(qData || []);

        setSessionId(activeSession.id);
        setIsBlocked(activeSession.status === 'blocked');
        initTimer(activeSession, examData);

        // 4. Real-time listener
        // Unique channel name each time to avoid collisions if previous cleanup was slow
        const channelName = `session_${activeSession.id}_${Date.now()}`;
        channel = supabase.channel(channelName);
        
        channel
          .on(
            'postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'exam_sessions', 
              filter: `id=eq.${activeSession.id}` 
            },
            (payload: any) => {
              if (!isMounted) return;
              const updatedStatus = payload.new.status;
              setIsBlocked(updatedStatus === 'blocked');
              if (updatedStatus === 'submitted') {
                navigate('/app/history');
              }
            }
          )
          .subscribe();

      } catch (err) {
        if (isMounted) {
          console.error('Initialization error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initExam();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [examId, navigate]);

  // Anti-cheat violation reporter
  const handleViolation = useCallback(async (reason: string) => {
    if (!sessionId || isBlocked) return;

    try {
      // 1. Log the violation
      await supabase.from('exam_logs').insert({
        session_id: sessionId,
        event_type: 'anti_cheat_violation',
        details: reason
      });

      // 2. Update session with block status
      const { error } = await supabase
        .from('exam_sessions')
        .update({ status: 'blocked' })
        .eq('id', sessionId);

      if (!error) setIsBlocked(true);
    } catch (err) {
      console.error('Failed to report violation:', err);
    }
  }, [sessionId, isBlocked, supabase]);

  useAntiCheat({
    onViolation: handleViolation,
    enabled: !!exam?.anti_cheat_enabled && !isBlocked && !loading
  });

  // Timer logic
  useEffect(() => {
    if (isBlocked || loading || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBlocked, loading, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleSubmit = async () => {
    if (!sessionId || questions.length === 0) return;
    
    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        const userAnswer = answers[q.id];
        const correctOption = q.options[q.correct_answer];
        if (userAnswer === correctOption) {
          correctCount++;
        }
      });

      const finalScore = Math.round((correctCount / questions.length) * 100);

      const { error } = await supabase
        .from('exam_sessions')
        .update({ 
          status: 'submitted', 
          completed_at: new Date().toISOString(),
          score: finalScore,
          correct_answers: correctCount,
          total_questions: questions.length
        })
        .eq('id', sessionId);

      if (error) throw error;
      navigate('/app/history');
    } catch (err) {
      console.error('Submit error:', err);
      alert('Gagal mengirim jawaban. Coba lagi.');
    }
  };

  const handleRequestUnblock = async () => {
    if (!sessionId) return;
    try {
      await supabase.from('exam_logs').insert({
        session_id: sessionId,
        event_type: 'unblock_request',
        details: 'Siswa meminta izin untuk melanjutkan ujian.'
      });
      setRequestSent(true);
    } catch (err) {
      console.error('Request unblock error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-bold opacity-60 animate-pulse text-[var(--primary)]">Menyiapkan Ruang Ujian...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md space-y-8"
        >
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-900/50">
            <Lock className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight uppercase">DIBLOKIR</h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Anda terdeteksi melakukan pelanggaran (keluar dari tab ujian). Akses Anda telah diblokir sementara sesuai protokol keamanan ujian.
            </p>
          </div>
          
          <div className="pt-6 space-y-4">
            {!requestSent ? (
              <button 
                onClick={handleRequestUnblock}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" /> Hubungi Guru Pengawas
              </button>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700">
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <Activity className="w-8 h-8 text-yellow-500 mb-3 animate-bounce" />
                    <p className="font-bold">Menunggu Persetujuan</p>
                    <p className="text-slate-500 text-sm mt-1">Status Anda dipantau secara real-time.</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
            <button 
              onClick={() => navigate('/app')}
              className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
            >
              Keluar Sesi
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col font-sans select-none overflow-hidden text-[var(--primary)]">
      {/* Top Bar */}
      <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-premium)] shadow-sm px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-lg truncate max-w-[200px]">
              {exam?.title}
            </h1>
            <p className="text-[10px] text-accent uppercase tracking-widest font-black">Lingkungan Ujian Aman</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all",
            timeLeft < 300 ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" : "bg-accent/10 text-accent border-accent/20"
          )}>
            <Clock className="w-5 h-5" />
            <span className="text-xl font-mono font-black">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6 overflow-hidden">
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-0 lg:pr-2">
          {questions.length > 0 && currentQuestion && (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-premium)] shadow-sm p-8 sm:p-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-accent/20">
                    {currentQuestionIndex + 1}
                  </span>
                  <div>
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">Pertanyaan</p>
                    <p className="text-sm font-bold opacity-60">{questions.length} Total Soal</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-premium max-w-none">
                <h2 className="text-xl sm:text-2xl font-bold leading-relaxed text-[var(--primary)]">
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  const label = ['A', 'B', 'C', 'D', 'E'][idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(option)}
                      className={cn(
                        "group w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4",
                        isSelected 
                          ? "bg-accent/10 border-accent ring-4 ring-accent/5" 
                          : "bg-black/5 dark:bg-white/5 border-transparent hover:border-[var(--border-premium)] hover:bg-[var(--bg-card)]"
                      )}
                    >
                      <span className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 transition-all",
                        isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-[var(--bg-main)] text-[var(--primary)] opacity-40 border border-[var(--border-premium)]"
                      )}>
                        {label}
                      </span>
                      <span className={cn(
                        "font-bold text-lg",
                        isSelected ? "text-accent" : "opacity-70"
                      )}>{option}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between py-4">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-premium)] rounded-2xl font-bold opacity-60 hover:opacity-100 disabled:opacity-20 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Sebelumnya
            </button>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"
              >
                Selesaikan Ujian <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-8 py-4 bg-accent text-white rounded-2xl font-black hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
              >
                Berikutnya <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Nav */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-premium)] shadow-sm p-6">
            <h3 className="font-black text-[10px] opacity-40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-accent" />
              Peta Progres
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id];
                const isCurrent = currentQuestionIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "aspect-square rounded-xl font-black text-xs transition-all flex items-center justify-center border-2",
                      isCurrent 
                        ? "bg-accent border-accent text-white scale-110 shadow-xl" 
                        : isAnswered 
                          ? "bg-accent/10 border-accent/20 text-accent font-bold" 
                          : "bg-black/5 dark:bg-white/5 border-transparent opacity-40 hover:opacity-100 hover:bg-[var(--bg-card)] hover:border-[var(--border-premium)]"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-[var(--border-premium)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Terjawab</span>
                <span className="text-sm font-black text-accent">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500" 
                  style={{ width: `${(Object.keys(answers).length / (questions.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] p-10 md:p-14 max-w-xl w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Send className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Kirim Jawaban?</h3>
              <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                Pekerjaan Anda akan segera diperiksa secara otomatis. Pastikan semua soal telah terjawab.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-2xl shadow-green-100"
                >
                  Ya, Kirim Ujian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

