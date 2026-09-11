'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  User, 
  Lock, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Save,
  ShieldCheck
} from 'lucide-react';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          setPhone(data.user.phone || '');
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo actualizar el perfil.');
        setSaving(false);
        return;
      }

      setSuccessMsg('¡Datos actualizados exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
            <User className="w-8 h-8 text-purple-600" />
            <span>Mi Perfil y Seguridad</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Consulta los datos de tu cuenta, periodo de vinculación y actualiza tu contraseña de acceso.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
            <p>Cargando información del perfil...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta de Resumen de Usuario */}
            <div className="glass-card rounded-3xl p-6 border border-white shadow-xl space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 mx-auto">
                {currentUser?.name?.charAt(0)}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-800">{currentUser?.name}</h2>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
                <div className="mt-2">
                  <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {currentUser?.role === 'ADMIN' ? 'Administradora' : currentUser?.role === 'MENTOR' ? 'Mentora' : 'Estudiante'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estado:</span>
                  <span className="font-bold text-emerald-600 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {currentUser?.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Documento:</span>
                  <span className="font-semibold text-slate-700">{currentUser?.documentId || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fecha Inicio:</span>
                  <span className="font-semibold text-slate-700">
                    {currentUser?.startDate ? new Date(currentUser.startDate).toLocaleDateString('es-ES') : 'Indefinido'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fecha Fin:</span>
                  <span className="font-semibold text-slate-700">
                    {currentUser?.endDate ? new Date(currentUser.endDate).toLocaleDateString('es-ES') : 'Indefinido'}
                  </span>
                </div>
              </div>
            </div>

            {/* Formulario de Modificación de Datos y Clave */}
            <div className="md:col-span-2 glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>Actualizar Datos de Contacto y Contraseña</span>
              </h2>

              {successMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="+57 300 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                    Cambiar Contraseña (Opcional)
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contraseña Actual
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Confirmar Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          placeholder="Repite la nueva contraseña"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all flex items-center space-x-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
