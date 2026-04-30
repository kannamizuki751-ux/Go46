import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'guru' | 'siswa';
  created_at: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('123456');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'guru' | 'siswa'>('siswa');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
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
            setUsers(prev => prev.filter(u => u.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(profiles as UserProfile[]);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In a production app, use Admin API or Edge Function
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPass,
        options: {
          data: {
            full_name: newUserName,
          }
        }
      });

      if (error) throw error;
      
      if (data.user && newUserRole !== 'siswa') {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: newUserRole })
          .eq('id', data.user.id);
        
        if (roleError) console.error('Failed to set role:', roleError);
      }

      alert(`Berhasil! Akun ${newUserName} telah didaftarkan. Password default: ${newUserPass}`);
      setShowAddModal(false);
      setNewUserName('');
      setNewUserEmail('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
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

  const deleteUser = async (userId: string) => {
    if (!confirm('Hapus pengguna ini dari database profil? (Catatan: Auth user tidak terhapus otomatis di level demo ini)')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.error('Delete error:', err);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Pengguna</h2>
          <p className="text-slate-500 font-medium text-sm">Atur hak akses dan identitas di sistem CBT.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200"
        >
          <UserPlus className="w-5 h-5" />
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, guru atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 font-bold"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profil Pengguna</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akses Peran</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Terdaftar</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-slate-100 rounded w-1/4" />
                          <div className="h-3 bg-slate-100 rounded w-1/2" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Tidak ada data pengguna.</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-[20px] flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform shadow-sm">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none">{user.full_name || 'Tanpa Nama'}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-tighter">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="bg-white border-2 border-blue-100 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="guru">GURU</option>
                          <option value="siswa">SISWA</option>
                        </select>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-red-500">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-black text-[10px] tracking-wider uppercase",
                        user.role === 'admin' ? "bg-purple-50 border-purple-100 text-purple-700" :
                        user.role === 'guru' ? "bg-blue-50 border-blue-100 text-blue-700" :
                        "bg-emerald-50 border-emerald-100 text-emerald-700"
                      )}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingId(user.id)}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all"
                      >
                        <UserCog className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-600 hover:border-red-200 hover:shadow-lg transition-all"
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
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-8 right-8 p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Daftarkan Akun</h3>
                  <p className="text-slate-400 mt-2 font-medium">Buat identitas pendaftaran baru dalam sistem.</p>
                </div>

                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold transition-all" 
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        required
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold transition-all" 
                        placeholder="email@sekolah.id"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Akun</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-xs transition-all appearance-none cursor-pointer"
                      >
                        <option value="siswa">SISWA</option>
                        <option value="guru">GURU</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Default</label>
                      <input 
                        required
                        type="password"
                        value={newUserPass}
                        onChange={(e) => setNewUserPass(e.target.value)}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold transition-all" 
                      />
                    </div>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
      </AnimatePresence>
    </div>
  );
}


