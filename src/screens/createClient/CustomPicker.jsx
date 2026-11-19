import React, { useState } from 'react';
import Icon from '../../components/Icon';

export default function CustomPicker({
  data = [],
  selectedValue,
  onSelect,
  placeholder = 'Seleccionar opción',
  visible,
  onClose,
}) {
  const [searchText, setSearchText] = useState('');

  if (!visible) return null;

  const filteredData = data.filter((item) =>
    (item.valor || item.nombre || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col p-6 shadow-2xl border border-slate-100 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-base text-[#1E1E1F]">{placeholder}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <Icon name="times" size={16} />
          </button>
        </div>

        {/* Buscador */}
        <div className="mt-3 relative">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus-within:border-[#EE272D] focus-within:ring-2 focus-within:ring-[#EE272D]/20">
            <Icon name="search" size={15} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1E1E1F] outline-none placeholder:text-slate-400 font-medium"
              autoFocus
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="times" size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de opciones */}
        <div className="mt-3 overflow-y-auto space-y-1.5 flex-1 pr-1">
          {filteredData.length > 0 ? (
            filteredData.map((item) => {
              const isSelected = String(selectedValue) === String(item.id);
              const label = item.valor || item.nombre;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(String(item.id), label);
                    handleClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between font-semibold text-sm transition-colors ${
                    isSelected
                      ? 'bg-red-50 text-[#EE272D] border border-red-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && <Icon name="check" size={15} className="text-[#EE272D]" />}
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se encontraron resultados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

