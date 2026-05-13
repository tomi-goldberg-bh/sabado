import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { MOCK_SOCIOS } from '../services/mockData';
import clsx from 'clsx';

export const SociosView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [registered, setRegistered] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions([]);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = MOCK_SOCIOS.filter(socio => 
        socio.name.toLowerCase().includes(lowercasedTerm)
      ).slice(0, 10); // show top 10 matches
      setFilteredOptions(filtered);
    }
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelectSocio = (socio) => {
    const isAlreadyRegistered = registered.some(r => r.id === socio.id);
    if (!isAlreadyRegistered) {
      setRegistered(prev => [{
        ...socio,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...prev]);
    }
    setSearchTerm('');
    setShowOptions(false);
  };

  const handleRemove = (id) => {
    setRegistered(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tight">Ingreso de Socios</h2>
        <p className="text-brand-grey">Busca el nombre del socio para registrar su entrada.</p>
      </div>

      <div className="relative mb-10 z-20" ref={wrapperRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-slate-200 text-brand-grey rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all placeholder-slate-400 text-lg shadow-sm"
            placeholder="Buscar por nombre o apellido..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowOptions(true);
            }}
            onFocus={() => setShowOptions(true)}
          />
        </div>

        {showOptions && filteredOptions.length > 0 && (
          <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30">
            <ul className="max-h-60 overflow-y-auto py-2">
              {filteredOptions.map((socio) => (
                <li 
                  key={socio.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-brand-grey transition-colors flex items-center justify-between group"
                  onClick={() => handleSelectSocio(socio)}
                >
                  <span className="font-medium text-lg">{socio.name}</span>
                  <span className="text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Registrar
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-0">
        <h3 className="text-xl font-bold text-brand-grey mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-blue" />
          Registros Recientes
          <span className="ml-auto bg-brand-light text-slate-500 text-xs py-1 px-3 rounded-full border border-slate-200">
            {registered.length} en total
          </span>
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {registered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Aún no hay registros de socios</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {registered.map((person) => (
                <li key={person.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div>
                    <p className="text-brand-grey font-bold text-lg">{person.name}</p>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5 font-medium">
                      <Clock className="w-3 h-3" /> {person.time}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleRemove(person.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
