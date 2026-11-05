import { useState, useEffect } from 'react';
import { UserPlus, Loader, ShieldCheck, Mail, Ban, RotateCcw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { GROUPS } from '../config/groups';
import { ADMIN_EMAILS } from '../config/admins';
import { authService, authErrorMessage } from '../services/authService';

const inputCls = 'w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue';

export const UsuariosView = ({ profile }) => {
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', group: GROUPS[0] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => authService.subscribeUsers(setUsers, () => setLoadError(true)), []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await authService.createGroupUser(form, profile.email);
      setMessage({ ok: true, text: `Listo: ${form.email.trim()} ya puede entrar y ver el presentismo de ${form.group}.` });
      setForm(f => ({ ...f, email: '', password: '' }));
    } catch (err) {
      setMessage({ ok: false, text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (email) => {
    try {
      await authService.sendReset(email);
      setMessage({ ok: true, text: `Se mandó a ${email} un mail para elegir una contraseña nueva.` });
    } catch (err) {
      setMessage({ ok: false, text: authErrorMessage(err) });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6 overflow-y-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-brand-blue mb-2 tracking-tight">Usuarios</h2>
        <p className="text-sm md:text-base text-brand-grey">Creá las cuentas de los grupos. Cada una solo ve el presentismo de su grupo.</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6">
        <h3 className="font-bold text-brand-grey mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-brand-blue" /> Nuevo usuario de grupo</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="nu-email">Mail</label>
            <input id="nu-email" type="email" required autoComplete="off" className={inputCls}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="nu-pass">Contraseña</label>
            <input id="nu-pass" type="text" required minLength={6} autoComplete="new-password" className={inputCls}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="nu-group">Grupo</label>
            <select id="nu-group" className={inputCls} value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={busy}
          className="flex items-center gap-2 bg-brand-blue hover:opacity-90 disabled:opacity-60 text-white font-bold py-2.5 px-5 rounded-xl transition-opacity">
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Crear usuario
        </button>
        {message && (
          <p className={clsx('text-sm rounded-lg px-3 py-2 mt-4 border',
            message.ok ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200')}>
            {message.text}
          </p>
        )}
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm mb-6">
        <h3 className="font-bold text-brand-grey mb-3">Usuarios de grupo</h3>
        {loadError ? (
          <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No se pudo cargar la lista.</p>
        ) : users === null ? (
          <p className="text-sm text-slate-400 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Cargando...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no creaste usuarios de grupo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map(u => {
              const active = u.role === 'grupo';
              return (
                <li key={u.uid} className="py-3 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={clsx('font-medium break-all flex-1 min-w-[12rem]', active ? 'text-brand-grey' : 'text-slate-400 line-through')}>
                    {u.email}
                  </span>
                  <select
                    aria-label={`Grupo de ${u.email}`}
                    className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-sm"
                    value={u.group}
                    onChange={e => authService.changeGroup(u.uid, e.target.value)}
                  >
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button onClick={() => handleReset(u.email)} title="Mandar mail para cambiar la contraseña"
                    className="p-2 text-slate-400 hover:text-brand-blue hover:bg-slate-100 rounded-lg">
                    <Mail className="w-4 h-4" />
                  </button>
                  <button onClick={() => authService.setActive(u.uid, !active)}
                    title={active ? 'Quitar acceso' : 'Devolver acceso'}
                    className={clsx('p-2 rounded-lg', active ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50')}>
                    {active ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
        <h3 className="font-bold text-brand-grey mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-blue" /> Administradores</h3>
        <p className="text-xs text-slate-500 mb-3">Pueden usar toda la app. Esta lista se cambia en el código.</p>
        <ul className="space-y-1">
          {ADMIN_EMAILS.map(e => <li key={e} className="text-sm text-brand-grey break-all">{e}</li>)}
        </ul>
      </div>
    </div>
  );
};
