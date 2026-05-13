import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, CheckCircle2, Clock, Wallet, Smartphone, Plus } from 'lucide-react';
import { MOCK_NOSOCIOS } from '../services/mockData';
import clsx from 'clsx';

export const NoSociosView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [registered, setRegistered] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'efectivo' or 'mercadopago'
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions([]);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = MOCK_NOSOCIOS.filter(socio => 
        socio.name.toLowerCase().includes(lowercasedTerm)
      );
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

  const handleRegister = () => {
    if (!searchTerm.trim()) return;
    if (!paymentMethod) {
      alert("Por favor selecciona un método de pago.");
      return;
    }

    setRegistered(prev => [{
      id: Date.now(), // Generate a unique ID since it can be free text
      name: searchTerm,
      payment: paymentMethod,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }, ...prev]);
    
    setSearchTerm('');
    setPaymentMethod('');
    setShowOptions(false);
  };

  const handleSelectOption = (name) => {
    setSearchTerm(name);
    setShowOptions(false);
  };

  const handleRemove = (id) => {
    setRegistered(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-blue mb-2 tracking-tight">Ingreso de No Socios</h2>
        <p className="text-brand-grey">Registra el nombre y el método de pago.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 z-20">
        
        <div className="relative mb-6" ref={wrapperRef}>
          <label className="block text-sm font-bold text-brand-grey mb-2">Nombre de la persona</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 text-brand-grey rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all placeholder-slate-400 font-medium"
              placeholder="Ej: Pepe Hernández..."
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
              <ul className="max-h-48 overflow-y-auto py-2">
                {filteredOptions.map((opt) => (
                  <li 
                    key={opt.id}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-brand-grey transition-colors flex items-center justify-between"
                    onClick={() => handleSelectOption(opt.name)}
                  >
                    <span className="font-bold">{opt.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-brand-grey mb-3">Método de Pago</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod('efectivo')}
              className={clsx(
                "flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-300 font-bold",
                paymentMethod === 'efectivo' 
                  ? "bg-brand-blue/10 border-brand-blue text-brand-blue" 
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Wallet className="w-6 h-6 mb-2" />
              <span>Efectivo</span>
            </button>
            <button
              onClick={() => setPaymentMethod('mercadopago')}
              className={clsx(
                "flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-300 font-bold",
                paymentMethod === 'mercadopago' 
                  ? "bg-[#009EE3]/10 border-[#009EE3] text-[#009EE3]" 
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Smartphone className="w-6 h-6 mb-2" />
              <span>Mercado Pago</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!searchTerm.trim() || !paymentMethod}
          className="w-full bg-brand-blue hover:bg-brand-accent text-white font-black text-lg py-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Registrar Entrada
        </button>

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
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Aún no hay registros de no socios</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {registered.map((person) => (
                <li key={person.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-brand-grey font-bold text-lg">{person.name}</p>
                      <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full border font-bold",
                        person.payment === 'efectivo' 
                          ? "bg-brand-blue/10 border-brand-blue/30 text-brand-blue"
                          : "bg-[#009EE3]/10 border-[#009EE3]/30 text-[#009EE3]"
                      )}>
                        {person.payment === 'efectivo' ? 'Efectivo' : 'Mercado Pago'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1 font-medium">
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
