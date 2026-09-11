'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Phone, 
  Mail, 
  FileText,
  Shield,
  Loader2,
  X
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  status: 'ACTIVO' | 'INACTIVO';
  documentId: string | null;
  phone: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: {
    attendances: number;
    enrolledClasses: number;
    mentoredClasses: number;
    submissions: number;
  };
}

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    status: 'ACTIVO',
    documentId: '',
    phone: '',
    startDate: '',
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar usuario autenticado y lista de usuarios
  const loadData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT',
      status: 'ACTIVO',
      documentId: '',
      phone: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (user: UserItem) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // En blanco a menos que desee cambiarla
      role: user.role,
      status: user.status,
      documentId: user.documentId || '',
      phone: user.phone || '',
      startDate: user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : '',
      endDate: user.endDate ? new Date(user.endDate).toISOString().split('T')[0] : '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Alternar estado activo / inactivo directamente
  const handleToggleStatus = async (user: UserItem) => {
    const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const res = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      if (res.ok) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
      }
    } catch (err) {
      console.error('Error alternando estado:', err);
    }
  };

  // Guardar usuario (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const url = '/api/admin/users';
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create'
        ? formData
        : { ...formData, id: selectedUser?.id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al guardar el usuario.');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.documentId && u.documentId.toLowerCase().includes(search.toLowerCase()));

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
              <Users className="w-8 h-8 text-purple-600" />
              <span>Gestión de Usuarios</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Crea estudiantes y mentores, controla su estado (Activo/Inactivo) y define sus fechas de vigencia.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="glass-card rounded-3xl p-5 border border-white shadow-md mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="ALL">Todos los roles</option>
              <option value="STUDENT">Estudiantes</option>
              <option value="MENTOR">Mentores</option>
              <option value="ADMIN">Administradores</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="INACTIVO">Solo Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="glass-card rounded-3xl border border-white shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/70 border-b border-purple-100 text-[11px] font-black uppercase tracking-wider text-purple-900">
                  <th className="py-4 px-6">Usuario & Rol</th>
                  <th className="py-4 px-6">Estado (Click para cambiar)</th>
                  <th className="py-4 px-6">Documento & Contacto</th>
                  <th className="py-4 px-6">Fechas (Inicio - Fin)</th>
                  <th className="py-4 px-6">Actividad</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
                      <span>Cargando lista de usuarios...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No se encontraron usuarios con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isStudent = u.role === 'STUDENT';
                    const isMentor = u.role === 'MENTOR';
                    const isAdmin = u.role === 'ADMIN';

                    return (
                      <tr key={u.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm ${
                              isAdmin ? 'bg-purple-600' : isMentor ? 'bg-teal-500' : 'bg-pink-500'
                            }`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAdmin
                                  ? 'bg-purple-100 text-purple-800'
                                  : isMentor
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-pink-100 text-pink-800'
                              }`}>
                                {isAdmin ? 'Administrador' : isMentor ? 'Mentor(a)' : 'Estudiante'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Switch de Estado Activo / Inactivo */}
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              u.status === 'ACTIVO'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title="Haz clic para activar/inactivar"
                          >
                            {u.status === 'ACTIVO' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-600">
                          <p className="font-medium text-slate-700">{u.documentId || 'Sin documento'}</p>
                          <p className="text-slate-500">{u.phone || 'Sin teléfono'}</p>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-700">Inicio: </span>
                            {u.startDate ? new Date(u.startDate).toLocaleDateString('es-ES') : 'Indefinido'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Fin: </span>
                            {u.endDate ? new Date(u.endDate).toLocaleDateString('es-ES') : 'Indefinido'}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-600">
                          {isStudent && (
                            <p>
                              Asistencias: <strong className="text-emerald-700">{u._count.attendances}</strong> | Tareas: <strong className="text-purple-700">{u._count.submissions}</strong>
                            </p>
                          )}
                          {isMentor && (
                            <p>
                              Clases asignadas: <strong className="text-teal-700">{u._count.mentoredClasses}</strong>
                            </p>
                          )}
                          {isAdmin && <span className="text-slate-400">Acceso total</span>}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-xl text-purple-600 hover:bg-purple-100/70 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h2 className="text-xl font-black text-slate-800">
                {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'create' ? 'Contraseña *' : 'Nueva Contraseña (Opcional)'}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    placeholder={modalMode === 'edit' ? 'Dejar en blanco para no cambiar' : '••••••'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol en la Plataforma *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="STUDENT">Estudiante</option>
                    <option value="MENTOR">Mentor(a)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado de Acceso *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="ACTIVO">ACTIVO (Permitir ingreso)</option>
                    <option value="INACTIVO">INACTIVO (Bloquear ingreso)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Documento de Identidad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CC-12345678"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: +57 300 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Fechas de inicio y fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                    Fecha de Finalización
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Guardar Usuario' : 'Actualizar Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
