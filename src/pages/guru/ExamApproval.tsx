import { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  AlertCircle, 
  Activity, 
  Lock, 
  Unlock, 
  Clock,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Search,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ExamSession {
  id: string;
  status: 'ongoing' | 'submitted' | 'blocked' | 'awaiting_late_approval' | 'late_approved';
  start_time: string;
  siswa_id: string;
  siswa: {
    full_name: string;
    role: string;
  };
  exam: {
    id: string;
    title: string;
  };
}

interface ExamLog {
  id: string;
  session_id: string;
  event_type: string;
  details: string;
  created_at: string;
}

export default function ExamApproval() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [logs, setLogs] = useState<ExamLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    fetchActiveSessions();
    
    // 1. Real-time Log Listener
    const logChannel = supabase
      .channel('realtime_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_logs' },
        (payload) => {
          setLogs(prev => [payload.new as ExamLog, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    // 2. Real-time Session Listener
    const sessionChannel = supabase
      .channel('realtime_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchActiveSessions(); // Re-fetch to get nested data
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => 
              prev.map(s => s.id === payload.new.id ? { ...s, status: payload.new.status } : s)
            );
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, []);

  const fetchActiveSessions = async () => {
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
        setSessions([]);
        setLoading(false);
        return;
      }

      // 2. Get sessions for those exams
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          siswa:profiles!siswa_id(full_name),
          exam:exams(title)
        `)
        .in('exam_id', myExamIds)
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data as any[]);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (sessionId: string, newStatus: string) => {
    setUpdatingId(sessionId);
    // Optimistic Update
    const prevSessions = [...sessions];
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus as any } : s));

    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);
      
      if (error) throw error;

      // Log the teacher's action
      await supabase.from('exam_logs').insert({
        session_id: sessionId,
        event_type: 'teacher_action',
        details: `Guru mengubah status menjadi ${newStatus}`
      });

      toast.success(`Status diperbarui ke ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Gagal memperbarui status.');
      setSessions(prevSessions); // Rollback
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.siswa?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.exam?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center sm:justify-start gap-3">
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            Monitoring Ujian
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">Pantau aktivitas siswa secara real-time.</p>
        </div>
        
        <div className="flex items-center justify-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 mx-auto sm:mx-0">
           <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl flex items-center gap-2">
             <Users className="w-4 h-4 sm:w-5 h-5" />
             <span className="text-xs sm:text-sm font-black tracking-tight">{sessions.filter(s => s.status === 'ongoing').length} Aktif</span>
           </div>
           <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
             <AlertCircle className="w-4 h-4 sm:w-5 h-5" />
             <span className="text-xs sm:text-sm font-black tracking-tight">{sessions.filter(s => s.status === 'blocked').length} Terblokir</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Main Monitor List */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/20">
               <div className="flex-1 relative w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                 <input 
                   type="text" 
                   placeholder="Cari siswa atau mata pelajaran..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-800"
                 />
               </div>
               <button 
                 onClick={fetchActiveSessions}
                 className="p-3 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl transition-all border border-slate-200 dark:border-white/5"
                 title="Refresh"
               >
                 <Activity className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-500 font-bold">Menghubungkan ke Server...</p>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-20 text-center">
                  <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium tracking-tight">Tidak ada sesi ujian aktif.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredSessions.map((session) => (
                    <motion.div 
                      layout
                      key={session.id} 
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-slate-50 transition-colors gap-4 sm:gap-6"
                    >
                      <div className="flex items-center gap-4 shrink-0">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                          session.status === 'ongoing' || session.status === 'late_approved' ? "bg-blue-600 shadow-blue-500/20" : 
                          session.status === 'blocked' ? "bg-red-600 shadow-red-500/20" : 
                          session.status === 'awaiting_late_approval' ? "bg-amber-500 shadow-amber-500/20" :
                          "bg-slate-100 shadow-transparent"
                        )}>
                          {session.status === 'ongoing' || session.status === 'late_approved' ? <Clock className="w-6 h-6 text-white" /> : 
                           session.status === 'blocked' ? <Lock className="w-6 h-6 text-white" /> : 
                           session.status === 'awaiting_late_approval' ? <Shield className="w-6 h-6 text-white animate-pulse" /> :
                           <CheckCircle2 className="w-6 h-6 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 truncate leading-tight">{session.siswa?.full_name || 'Siswa Tanpa Nama'}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate max-w-[120px]">{session.exam?.title}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                              {session.status === 'awaiting_late_approval' ? 'MENUNGGU IZIN' : `Mulai: ${(() => {
                                const d = new Date(session.start_time);
                                return `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}`;
                              })()}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                         {session.status === 'awaiting_late_approval' ? (
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => updateStatus(session.id, 'late_approved')}
                               disabled={updatingId === session.id}
                               className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                             >
                               {updatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                               Izinkan Ujian
                             </button>
                             <button 
                               onClick={() => updateStatus(session.id, 'blocked')}
                               disabled={updatingId === session.id}
                               className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-100 transition-all disabled:opacity-50"
                             >
                               Tolak
                             </button>
                           </div>
                         ) : session.status === 'blocked' ? (
                           <button 
                             onClick={() => updateStatus(session.id, 'ongoing')}
                             disabled={updatingId === session.id}
                             className="w-full sm:w-auto px-5 py-3 bg-green-50 text-green-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                           >
                             <Unlock className="w-4 h-4" /> 
                             {updatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                             Buka Akses
                           </button>
                         ) : session.status === 'ongoing' ? (
                           <button 
                             onClick={() => updateStatus(session.id, 'blocked')}
                             disabled={updatingId === session.id}
                             className="w-full sm:w-auto px-5 py-3 bg-red-50 text-red-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                           >
                             <Lock className="w-4 h-4" /> 
                             {updatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                             Blokir
                           </button>
                         ) : (
                           <span className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-black text-xs">Selesai</span>
                         )}
                         <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 hidden sm:block">
                           <MessageCircle className="w-5 h-5" />
                         </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
