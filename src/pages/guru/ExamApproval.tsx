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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            Live Exam Monitoring
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Pantau aktivitas ujian siswa secara real-time.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
           <div className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl flex items-center gap-2">
             <Users className="w-5 h-5" />
             <span className="font-bold">{sessions.filter(s => s.status === 'ongoing').length} Aktif</span>
           </div>
           <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
             <AlertCircle className="w-5 h-5" />
             <span className="font-bold">{sessions.filter(s => s.status === 'blocked').length} Terblokir</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Monitor List */}
        <div className="lg:col-span-2 space-y-6">
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
                      className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                          session.status === 'ongoing' || session.status === 'late_approved' ? "bg-blue-600 shadow-blue-100" : 
                          session.status === 'blocked' ? "bg-red-600 shadow-red-100" : 
                          session.status === 'awaiting_late_approval' ? "bg-amber-500 shadow-amber-100" :
                          "bg-slate-100 shadow-transparent"
                        )}>
                          {session.status === 'ongoing' || session.status === 'late_approved' ? <Clock className="w-6 h-6 text-white" /> : 
                           session.status === 'blocked' ? <Lock className="w-6 h-6 text-white" /> : 
                           session.status === 'awaiting_late_approval' ? <Shield className="w-6 h-6 text-white animate-pulse" /> :
                           <CheckCircle2 className="w-6 h-6 text-slate-400" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{session.siswa?.full_name || 'Siswa Tanpa Nama'}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{session.exam?.title}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {session.status === 'awaiting_late_approval' ? 'MENUNGGU IZIN' : `Mulai: ${(() => {
                                const d = new Date(session.start_time);
                                return `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')}`;
                              })()}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
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
                             className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-black text-xs hover:bg-green-100 transition-all flex items-center gap-2 disabled:opacity-50"
                           >
                             <Unlock className="w-4 h-4" /> 
                             {updatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                             Buka Akses
                           </button>
                         ) : session.status === 'ongoing' ? (
                           <button 
                             onClick={() => updateStatus(session.id, 'blocked')}
                             disabled={updatingId === session.id}
                             className="px-4 py-2 bg-red-50 text-red-700 rounded-xl font-black text-xs hover:bg-red-100 transition-all flex items-center gap-2 disabled:opacity-50"
                           >
                             <Lock className="w-4 h-4" /> 
                             {updatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                             Blokir
                           </button>
                         ) : (
                           <span className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-black text-xs">Selesai</span>
                         )}
                         <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100">
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

        {/* Real-time Activity Feed */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-6 min-h-[400px] flex flex-col shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                 <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                 Real-time Logs
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {logs.length === 0 ? (
                  <p className="text-slate-600 text-center text-xs font-bold py-10 uppercase tracking-widest leading-relaxed">Menunggu aktivitas <br/> dari siswa...</p>
                ) : (
                  logs.map((log) => (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={log.id}
                      className={cn(
                        "p-4 rounded-2xl border-l-4 text-xs font-medium space-y-2",
                        log.event_type === 'anti_cheat_violation' ? "bg-red-500/10 border-red-500 text-red-200" :
                        log.event_type === 'unblock_request' ? "bg-yellow-500/10 border-yellow-500 text-yellow-200" :
                        "bg-blue-500/10 border-blue-500 text-blue-200"
                      )}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-black uppercase tracking-widest opacity-60">
                           {log.event_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold opacity-40">
                          {(() => {
                            const d = new Date(log.created_at);
                            const h = d.getHours().toString().padStart(2, '0');
                            const m = d.getMinutes().toString().padStart(2, '0');
                            const s = d.getSeconds().toString().padStart(2, '0');
                            return `${h}.${m}.${s}`;
                          })()}
                        </span>
                      </div>
                      <p className="leading-relaxed">{log.details}</p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-6 space-y-4">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Informasi Server</h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                   <Activity className="w-5 h-5 text-green-500" />
                   <span className="text-sm font-bold text-slate-700">Real-time Sync</span>
                 </div>
                 <span className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-200" />
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                   <Shield className="w-5 h-5 text-blue-500" />
                   <span className="text-sm font-bold text-slate-700">Anti-Cheat Engine</span>
                 </div>
                 <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg">AKTIF</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
