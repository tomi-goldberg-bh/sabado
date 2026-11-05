import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { SociosView } from './components/SociosView';
import { NoSociosView } from './components/NoSociosView';
import { PresentismoView } from './components/PresentismoView';
import { UsuariosView } from './components/UsuariosView';
import { LoginView, NoAccessView } from './components/LoginView';
import { authService } from './services/authService';
import { archivoService } from './services/archivoService';
import { sociosSheetService } from './services/sociosSheetService';
import { nosociosSheetService } from './services/nosociosSheetService';

const TABS_BY_ROLE = {
  admin: ['socios', 'nosocios', 'presentismo', 'usuarios'],
  grupo: ['presentismo'],
};

// Tareas de una sola vez que necesitan permisos de admin: subir los registros que
// el dispositivo tenía guardados localmente y armar la asistencia de los registros viejos.
async function runAdminMaintenance() {
  const [socios, juventud] = await Promise.all([
    sociosSheetService.fetchSocios(),
    nosociosSheetService.fetchSocios(),
  ]);
  const sheets = { socios, juventud };
  await archivoService.migrateLocalRecords(sheets);
  await archivoService.backfillAttendance(sheets);
}

function App() {
  // undefined = cargando, null = sin sesión
  const [profile, setProfile] = useState(undefined);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => authService.subscribe(setProfile), []);

  useEffect(() => {
    if (profile?.role === 'admin') runAdminMaintenance();
  }, [profile?.role]);

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center text-slate-400 gap-2">
        <Loader className="w-5 h-5 animate-spin" /> Cargando...
      </div>
    );
  }
  if (profile === null) return <LoginView />;
  if (!TABS_BY_ROLE[profile.role]) return <NoAccessView email={profile.email} />;

  const tabs = TABS_BY_ROLE[profile.role];
  const tab = tabs.includes(activeTab) ? activeTab : tabs[0];

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden font-sans text-brand-grey selection:bg-brand-blue selection:text-white">

      <Sidebar tabs={tabs} activeTab={tab} setActiveTab={setActiveTab} profile={profile} />

      <main className="flex-1 relative z-10 overflow-hidden flex flex-col pb-16 md:pb-0">
        {tab === 'socios' && <SociosView />}
        {tab === 'nosocios' && <NoSociosView />}
        {tab === 'presentismo' && <PresentismoView profile={profile} />}
        {tab === 'usuarios' && <UsuariosView profile={profile} />}
      </main>
    </div>
  );
}

export default App;
