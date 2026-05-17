import { useState, useEffect, FormEvent } from 'react';
import { 
  UserPlus, 
  Search, 
  UserCog, 
  Shield, 
  GraduationCap, 
  User,
  Mail,
  Calendar,
  X,
  Plus,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'guru' | 'siswa';
  created_at: string;
  class?: string;
  major?: string;
  class_index?: string;
}

const CLASSES = ['X', 'XI', 'XII'];
const MAJORS = ['BR', 'DKV', 'PPLG', 'AKL', 'MP'];
const INDICES = ['1', '2', '3', '4'];

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('123456');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'guru' | 'siswa'>('siswa');
  const [newUserClass, setNewUserClass] = useState('');
  const [newUserMajor, setNewUserMajor] = useState('');
  const [newUserIndex, setNewUserIndex] = useState('');
  
  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'guru' | 'siswa'>('siswa');
  const [editClass, setEditClass] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editIndex, setEditIndex] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const [authUser, setAuthUser] = useState<any>(null);

  const supabase = getSupabase();

  useEffect(() => {
    // Get current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user);
    });

    fetchUsers();

    // Real-time listener for profiles table
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers(prev => [payload.new as UserProfile, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new as UserProfile } : u));
          } else if (payload.eventType === 'DELETE') {
            setUsers(prev => prev.filter(u => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [isRecursionError, setIsRecursionError] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorStatus(null);
    setIsRecursionError(false);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P17') {
          setIsRecursionError(true);
          console.error('RLS Infinite Recursion detected in Supabase. Please check your Policies.');
        }
        throw error;
      }
      setUsers(profiles as UserProfile[]);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setErrorStatus(err.message || 'Gagal mengambil data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setErrorStatus(null);
    console.log('Attempting to create user:', { email: newUserEmail, role: newUserRole });
    
    try {
      // 1. Sign up the user
      const trimmedEmail = newUserEmail.trim();
      const trimmedName = newUserName.trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: newUserPass,
        options: {
          data: {
            full_name: trimmedName,
            role: newUserRole 
          }
        }
      });

      if (signUpError) {
        console.error('Sign up error details:', signUpError);
        // Handle rate limit specifically
        if (signUpError.message?.toLowerCase().includes('rate limit exceeded')) {
          throw new Error('Limit Supabase: Pendaftaran terlalu cepat. Akun gratis dibatasi jumlah pendaftaran per jam. Silakan tunggu 30-60 menit atau gunakan email lain.');
        }
        throw signUpError;
      }
      
      if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
        throw new Error('Pendaftaran gagal. Email ini mungkin sudah terdaftar di sistem.');
      }

      console.log('User registered in Auth:', data.user.id, 'Setting role to:', newUserRole);

      // 2. Assign Role and Details explicitly
      // We perform a small delay to allow any server-side triggers (like on_auth_user_created) to finish.
      await new Promise(resolve => setTimeout(resolve, 800));

      const profilePayload = {
        id: data.user.id,
        full_name: trimmedName,
        role: newUserRole,
        class: newUserRole === 'siswa' ? (newUserClass || null) : null,
        major: newUserRole === 'siswa' ? (newUserMajor || null) : null,
        class_index: newUserRole === 'siswa' ? (newUserIndex || null) : null
      };

      console.log('Sending profile update for:', data.user.id, profilePayload);

      // We use simple update first because most likely the row was created by a trigger
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', data.user.id);
      
      if (updateError) {
        console.warn('First profile update failed, trying upsert:', updateError);
        
        // If update failed (maybe row doesn't exist yet), try upsert
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profilePayload);

        if (upsertError) {
          console.error('Profile registration failed completely:', upsertError);
          
          if (upsertError.code === '42501') {
            throw new Error(`Akses Ditolak (RLS): Akun Admin Anda (ID: ${authUser?.id?.slice(0,5)}) tidak memiliki izin untuk mengubah data user lain. Pastikan Anda sudah menjalankan script SQL untuk memberikan izin kepada "admin" di Dashboard Supabase.`);
          }
          throw upsertError;
        }
      }

      successHandler();
    } catch (err: any) {
      console.error('handleAddUser error:', err);
      setErrorStatus(err.message || 'Terjadi kesalahan saat mendaftarkan akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const successHandler = () => {
    closeAddModal();
    fetchUsers();
    alert(`Berhasil! Akun ${newUserName} telah didaftarkan sebagai ${newUserRole.toUpperCase()}.`);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setEditingId(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Gagal mengubah role.');
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteUser = async () => {
    if (!deleteId || isSubmitting) return;
    if (deleteId === authUser?.id) {
      setDeleteError('Anda tidak bisa menghapus akun Anda sendiri.');
      return;
    }
    
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      // 1. Get all sessions for this user to delete their logs first
      const { data: userSessions } = await supabase
        .from('exam_sessions')
        .select('id')
        .eq('siswa_id', deleteId);

      if (userSessions && userSessions.length > 0) {
        const sessionIds = userSessions.map(s => s.id);
        // Delete logs for these sessions
        await supabase.from('exam_logs').delete().in('session_id', sessionIds);
        // Delete the sessions themselves
        await supabase.from('exam_sessions').delete().in('id', sessionIds);
      }

      // 2. Try to delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', deleteId);
      
      if (error) {
        console.error('Delete error:', error);
        if (error.code === '23503') {
          setDeleteError('Gagal: Pengguna ini masih memiliki data terkait (ujian/bank soal) yang tidak bisa dihapus otomatis. Hapus data tersebut secara manual terlebih dahulu.');
        } else if (error.code === '42501') {
          setDeleteError('Gagal: Anda tidak memiliki izin untuk menghapus pengguna. Pastikan Role Anda adalah Admin di Database.');
        } else {
          setDeleteError(`Error: ${error.message}`);
        }
        return;
      }
      
      fetchUsers(); 
      setShowDeleteModal(false);
      setDeleteId(null);
      alert('Pengguna berhasil dihapus.');
    } catch (err: any) {
      console.error('Technical error during delete:', err);
      setDeleteError('Terjadi kesalahan teknis saat mencoba menghapus data kaitan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (id: string) => {
    setDeleteId(id);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.id.includes(searchQuery))
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'guru': return <UserCog className="w-4 h-4 text-blue-500" />;
      case 'siswa': return <GraduationCap className="w-4 h-4 text-emerald-500" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setErrorStatus(null);
    setNewUserName('');
    setNewUserEmail('');
  };

  const openEditModal = (user: UserProfile) => {
    setEditingId(user.id);
    setEditName(user.full_name || '');
    setEditRole(user.role);
    setEditClass(user.class || '');
    setEditMajor(user.major || '');
    setEditIndex(user.class_index || '');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditName('');
    setErrorStatus(null);
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorStatus(null);

    // Validasi sederhana: Jika siswa, kelas dan jurusan harus dipilih
    if (editRole === 'siswa' && (!editClass || !editMajor)) {
      setErrorStatus('Untuk Siswa, Kelas dan Jurusan wajib dipilih.');
      setIsSubmitting(false);
      return;
    }

    try {
      const updateData: any = { 
        full_name: editName.trim(),
        role: editRole,
        class: editRole === 'siswa' ? editClass : null,
        major: editRole === 'siswa' ? editMajor : null,
        class_index: editRole === 'siswa' ? editIndex : null
      };

      console.log('Updating user profile:', editingId, updateData);

      const { data, error, status } = await supabase
        .from('profiles')
        .update(updateData) 
        .eq('id', editingId)
        .select();

      if (error) {
        console.error('Update operation failed:', error);
        if (error.code === '42501') {
          throw new Error('Akses Ditolak (RLS): Pastikan Anda sudah menjalankan script SQL di Supabase Editor agar Admin berhak mengedit profil.');
        }
        throw error;
      }
      
      // Jika data kosong, kemungkinan role Admin Anda sendiri di database bukan 'admin'
      if (!data || data.length === 0) {
        const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', authUser?.id).maybeSingle();
        if (myProfile?.role !== 'admin') {
          throw new Error(`Gagal: Role akun Anda (ID: ${authUser?.id?.slice(0,5)}) adalah "${myProfile?.role || 'null'}". Anda harus memiliki role "admin" di database agar bisa mengubah user lain.`);
        }
        throw new Error('Gagal: Data tidak berubah. Ini menandakan query berhasil tapi tidak ada baris yang memenuhi kriteria update. Pastikan ID user yang diedit valid.');
      }
      
      console.log('Update successful, response status:', status, data);
      
      alert('Informasi akun berhasil diperbarui!');
      closeEditModal();
      fetchUsers();
    } catch (err: any) {
      console.error('Update error detailed:', err);
      setErrorStatus(err.message || 'Gagal memperbarui pengguna. Periksa koneksi internet atau database Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-primary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-primary tracking-tight">Manajemen Pengguna</h2>
          <p className="text-muted font-medium text-sm">Atur hak akses dan identitas di sistem CBT.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-accent/20"
        >
          <UserPlus className="w-5 h-5" />
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-card rounded-[32px] border border-border-premium shadow-sm overflow-hidden text-primary">
        <div className="p-6 border-b border-border-premium bg-background/50 flex items-center gap-4">
          <Search className="w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Cari nama siswa, guru atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-primary placeholder:text-muted/40 font-bold"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/80 border-b border-border-premium">
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Profil Pengguna</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Akses Peran</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Terdaftar</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-premium">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-background rounded-2xl" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-background rounded w-1/4" />
                          <div className="h-3 bg-background rounded w-1/2" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    {isRecursionError ? (
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                          <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-red-500">Security Loop Detected</h3>
                        <p className="text-muted text-xs font-medium">
                          Supabase RLS recursion error. Your admin policy has a loop.
                        </p>
                        <div className="mt-6 p-4 bg-background border border-border-premium rounded-2xl text-left space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">LANGKAH PERBAIKAN TOTAL (REBUILD DATABASE):</p>
                          <p className="text-xs font-medium opacity-80 text-red-400 font-bold">PERINGATAN: SQL ini akan menghapus data ujian lama agar struktur kembali normal.</p>
                          <pre className="p-3 bg-black/20 rounded-xl text-[10px] font-mono text-primary overflow-x-auto whitespace-pre">
                            {`-- 1. HAPUS TABEL LAMA (RESET TOTAL)
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;

-- 2. BUAT ULANG TABEL EXAMS
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT,
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'published',
    anti_cheat_enabled BOOLEAN DEFAULT true,
    target_classes TEXT[],
    target_majors TEXT[],
    target_indices TEXT[],
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BUAT ULANG TABEL RELASI SOAL
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BUAT ULANG TABEL SESI (HASIL UJIAN)
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES profiles(id),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    score FLOAT DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'submitted',
    violations_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(siswa_id, exam_id)
);

-- 5. MATIKAN RLS AGAR TIDAK ADA ERROR IZIN
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- 6. PENYEGARAN SISTEM
NOTIFY pgrst, 'reload schema';`}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <>
                        <User className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                        <p className="text-muted font-bold">Tidak ada data pengguna.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-background/80 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-background rounded-[20px] flex items-center justify-center text-muted group-hover:scale-110 transition-transform shadow-sm border border-border-premium">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-col gap-1">
                          <p className="font-bold text-primary leading-none">
                            {user.full_name && user.full_name !== 'Tanpa Nama' ? user.full_name : `User ${user.id.slice(0, 5)}`}
                          </p>
                          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-tighter">
                            ID: {user.id.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                      <div className="flex flex-col gap-2">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1 rounded-xl border font-black text-[9px] tracking-wider uppercase w-fit",
                          user.role === 'admin' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                          user.role === 'guru' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                          "bg-emerald-500/10 border-emerald-500/10 text-emerald-500"
                        )}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </div>
                        {user.role === 'siswa' && (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            {user.class ? `${user.class} ${user.major} ${user.class_index || ''}` : '(Kelas belum diatur)'}
                          </p>
                        )}
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[11px] font-black text-muted uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-3 bg-card border border-border-premium rounded-2xl text-muted hover:text-blue-500 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                      >
                        <UserCog className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => initiateDelete(user.id)}
                        className="p-3 bg-card border border-border-premium rounded-2xl text-muted hover:text-red-500 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-primary/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-[40px] p-8 md:p-10 max-w-md w-full shadow-2xl relative border border-border-premium"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
                  <X className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-primary">Hapus Profil?</h3>
                  <p className="text-muted font-medium leading-relaxed">
                    Tindakan ini akan menghapus data profil dari database. <span className="text-accent font-bold">Catatan:</span> Karena alasan keamanan, Anda juga harus menghapus akun ini secara manual di menu "Authentication" Supabase agar user tidak bisa login lagi.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm font-bold text-red-500">
                    ⚠️ {deleteError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="py-4 bg-background hover:bg-background/80 text-muted rounded-2xl font-bold transition-all border border-border-premium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={deleteUser}
                    disabled={isSubmitting}
                    className="py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden border border-border-premium"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              <button 
                onClick={closeAddModal}
                className="absolute top-8 right-8 p-3 hover:bg-background rounded-2xl text-muted transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-primary tracking-tight">Daftarkan Akun</h3>
                  <p className="text-muted mt-2 font-medium italic text-xs">Penting: Matikan "Confirm Email" di Supabase Auth Settings agar user bisa langsung login.</p>
                </div>

                <form onSubmit={handleAddUser} className="space-y-6">
                  {errorStatus && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-pulse">
                      ⚠️ {errorStatus}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                      <input 
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-bold transition-all" 
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Alamat Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                      <input 
                        required
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-bold transition-all" 
                        placeholder="go46@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Role Akun</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all appearance-none cursor-pointer"
                      >
                        <option value="siswa">SISWA</option>
                        <option value="guru">GURU</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Password Default</label>
                      <input 
                        required
                        type="password"
                        value={newUserPass}
                        onChange={(e) => setNewUserPass(e.target.value)}
                        className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-bold transition-all" 
                      />
                    </div>
                  </div>

                  {newUserRole === 'siswa' && (
                    <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Kelas</label>
                        <select 
                          required={newUserRole === 'siswa'}
                          value={newUserClass}
                          onChange={(e) => setNewUserClass(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Pilih Kelas</option>
                          {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Jurusan</label>
                        <select 
                          required={newUserRole === 'siswa'}
                          value={newUserMajor}
                          onChange={(e) => setNewUserMajor(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Pilih Jurusan</option>
                          {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nomor</label>
                        <select 
                          value={newUserIndex}
                          onChange={(e) => setNewUserIndex(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Tanpa Nomor</option>
                          {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-accent hover:bg-accent/90 text-white rounded-3xl font-black shadow-2xl shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    Daftarkan Sekarang
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-primary/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden border border-border-premium"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              <button 
                onClick={closeEditModal}
                className="absolute top-8 right-8 p-3 hover:bg-background rounded-2xl text-muted transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-primary tracking-tight">Edit Pengguna</h3>
                  <p className="text-muted mt-2 font-medium">Perbarui informasi identitas pengguna ini.</p>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-6">
                  {errorStatus && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-pulse">
                      ⚠️ {errorStatus}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40" />
                      <input 
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-bold transition-all" 
                        placeholder="Nama Pengguna"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Role Akun</label>
                    <select 
                      value={editRole}
                      disabled={editingId === authUser?.id}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className={cn(
                        "w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all appearance-none",
                        editingId === authUser?.id ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer"
                      )}
                    >
                      <option value="siswa">SISWA</option>
                      <option value="guru">GURU</option>
                      <option value="admin">ADMIN</option>
                    </select>
                    {editingId === authUser?.id && (
                      <p className="text-[9px] text-accent font-bold ml-1 mt-1 uppercase tracking-tight">Anda tidak dapat mengubah peran Anda sendiri demi keamanan.</p>
                    )}
                  </div>

                  {editRole === 'siswa' && (
                    <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Kelas</label>
                        <select 
                          required={editRole === 'siswa'}
                          value={editClass}
                          onChange={(e) => setEditClass(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Pilih Kelas</option>
                          {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Jurusan</label>
                        <select 
                          required={editRole === 'siswa'}
                          value={editMajor}
                          onChange={(e) => setEditMajor(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Pilih Jurusan</option>
                          {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nomor</label>
                        <select 
                          value={editIndex}
                          onChange={(e) => setEditIndex(e.target.value)}
                          className="w-full px-4 py-4 bg-background border-2 border-transparent rounded-2xl focus:border-accent text-primary outline-none font-black text-xs transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Tanpa Nomor</option>
                          {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-accent hover:bg-accent/90 text-white rounded-3xl font-black shadow-2xl shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    Simpan Perubahan
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


