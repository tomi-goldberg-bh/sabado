import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { SociosView } from './components/SociosView';
import { NoSociosView } from './components/NoSociosView';
import { archivoService } from './services/archivoService';

function App() {
  const [activeTab, setActiveTab] = useState('socios');

  // Sube a la base compartida los registros que este dispositivo tenía guardados solo localmente.
  useEffect(() => {
    archivoService.migrateLocalRecords();
  }, []);

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden font-sans text-brand-grey selection:bg-brand-blue selection:text-white">
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col pb-16 md:pb-0">
        {activeTab === 'socios' ? <SociosView /> : <NoSociosView />}
      </main>
    </div>
  );
}

export default App;
