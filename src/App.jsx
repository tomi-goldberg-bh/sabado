import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SociosView } from './components/SociosView';
import { NoSociosView } from './components/NoSociosView';

function App() {
  const [activeTab, setActiveTab] = useState('socios');

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden font-sans text-brand-grey selection:bg-brand-blue selection:text-white">
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        {activeTab === 'socios' ? <SociosView /> : <NoSociosView />}
      </main>
    </div>
  );
}

export default App;
