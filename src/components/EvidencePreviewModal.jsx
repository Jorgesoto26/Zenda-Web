import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { supabase } from '../lib/supabase';

export default function EvidencePreviewModal({
  visible,
  onClose,
  title = 'Evidencia Multimedia',
  imageUri,
  initialUri,
  filePath,
  readOnly = false,
  onTakePhoto,
  onPickGallery,
  onRemovePhoto,
}) {
  const [loading, setLoading] = useState(false);
  const [resolvedUri, setResolvedUri] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function resolve() {
      const raw = imageUri || initialUri || filePath;
      if (!raw) {
        setResolvedUri(null);
        return;
      }
      if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:'))) {
        setResolvedUri(raw);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.storage.from('Evidencias').createSignedUrl(raw, 3600);
        if (!error && data?.signedUrl && isMounted) {
          setResolvedUri(data.signedUrl);
        }
      } catch (e) {
        console.warn('Error resolving signed url in EvidencePreviewModal:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (visible) {
      resolve();
    } else {
      setResolvedUri(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [visible, imageUri, initialUri, filePath]);

  if (!visible) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[440px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-sm font-bold text-white truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <Icon name="times" size={16} />
          </button>
        </div>

        {/* Image Box */}
        <div className="min-h-[280px] max-h-[440px] bg-black flex items-center justify-center p-2 relative overflow-hidden">
          {loading ? (
            <div className="h-8 w-8 border-2 border-[#EE272D] border-t-transparent rounded-full animate-spin" />
          ) : resolvedUri ? (
            <img
              src={resolvedUri}
              alt="Evidencia"
              className="max-h-[400px] w-auto max-w-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-center p-6 text-neutral-500">
              <Icon name="image" size={36} color="#555" />
              <p className="text-xs mt-2 font-medium">Sin imagen disponible</p>
            </div>
          )}
        </div>

        {/* Action Buttons if not read-only */}
        {!readOnly && (
          <div className="p-3 border-t border-neutral-800 flex items-center justify-end gap-2 bg-neutral-950">
            {resolvedUri && onRemovePhoto && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 flex items-center gap-1.5"
              >
                <Icon name="trash" size={14} color="#F87171" />
                <span>Eliminar</span>
              </button>
            )}
            {onTakePhoto && (
              <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#EE272D] hover:bg-[#D81E24] flex items-center gap-1.5">
                <Icon name="camera" size={14} color="#FFF" />
                <span>Tomar Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onTakePhoto}
                />
              </label>
            )}
            {onPickGallery && (
              <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center gap-1.5">
                <Icon name="image" size={14} color="#AAA" />
                <span>Galería</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickGallery}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

