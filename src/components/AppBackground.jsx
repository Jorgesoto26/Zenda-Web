// src/components/AppBackground.jsx
import React from 'react';

/**
 * Fondo institucional unificado para todas las pantallas de la app
 * Basado en la imagen public/assets/fondoGeneral.png
 */
export default function AppBackground({ children }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Fondo General Institucional fijado al marco móvil */}
      <div
        className="fixed inset-0 max-w-[480px] mx-auto pointer-events-none z-0 bg-cover bg-top bg-no-repeat"
        style={{
          backgroundImage: `url('/assets/fondoGeneral.png')`,
        }}
      />
      {/* Contenido interactivo en capa superior */}
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
