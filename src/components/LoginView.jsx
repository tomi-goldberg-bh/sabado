import { useState } from 'react';
import { LogIn, Loader, Mail } from 'lucide-react';
import { authService, authErrorMessage } from '../services/authService';

const Logo = () => (
  <svg width="64" height="64" viewBox="0 0 100 100" className="drop-shadow-sm">
    <path d="M25 15 L75 15 L100 50 L75 85 L25 85 L0 50 Z" fill="#11527D" />
    <path d="M40 35 L60 35 L53 45 L53 85 L47 85 L47 45 Z" fill="#FFFFFF" />
  </svg>
);

export const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await authService.login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Escribí tu mail y después tocá "Olvidé mi contraseña".');
      return;
    }
    try {
      await authService.sendReset(email);
      setInfo(`Si ${email.trim()} tiene cuenta, le llega un mail para elegir una contraseña nueva.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo />
          <h1 className="text-2xl font-black text-brand-grey tracking-tight mt-3">Bet Hilel</h1>
          <p className="text-sm text-slate-500">Ingresá con tu mail y contraseña</p>
        </div>

        <label className="block text-sm font-bold text-brand-grey mb-1" htmlFor="email">Mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
        />

        <label className="block text-sm font-bold text-brand-grey mb-1" htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 mb-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
        />

        <button type="button" onClick={handleReset} className="text-sm text-brand-blue font-medium hover:underline mb-5 flex items-center gap-1">
          <Mail className="w-3.5 h-3.5" /> Olvidé mi contraseña
        </button>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {info && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-opacity"
        >
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Ingresar
        </button>
      </form>
    </div>
  );
};

export const NoAccessView = ({ email }) => (
  <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="flex justify-center"><Logo /></div>
      <h1 className="text-xl font-black text-brand-grey mt-3 mb-2">Sin acceso</h1>
      <p className="text-sm text-slate-500 mb-6">
        La cuenta <span className="font-bold break-all">{email}</span> no tiene permisos en la app. Pedile a un administrador que te dé acceso.
      </p>
      <button
        onClick={() => authService.logout()}
        className="w-full bg-slate-100 hover:bg-slate-200 text-brand-grey font-bold py-3 rounded-xl transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  </div>
);
