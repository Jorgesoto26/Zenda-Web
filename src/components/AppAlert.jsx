import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from './Icon';

const AlertContext = createContext(null);

let globalShow = null;
export function setGlobalAlertFn(fn) {
  globalShow = fn;
}

export function appAlert(title, message, buttons) {
  if (globalShow) {
    globalShow({
      title,
      message,
      buttons: buttons?.map((b) => ({ text: b.text, style: b.style, onPress: b.onPress })),
    });
  } else {
    window.alert(`${title}\n\n${message}`);
  }
}

export function AppAlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', buttons: [], icon: null, type: 'info' });

  const hide = useCallback(() => setVisible(false), []);

  const showAlert = useCallback(
    ({ title = '', message = '', buttons = [{ text: 'OK', style: 'default' }], icon, type = 'info' }) => {
      const normalized = buttons.map((b) => ({
        text: b.text,
        style: b.style || 'default',
        onPress: b.onPress,
      }));
      setConfig({ title, message, buttons: normalized, icon, type });
      setVisible(true);
    },
    []
  );

  React.useEffect(() => {
    setGlobalAlertFn(showAlert);
  }, [showAlert]);

  const onPressButton = (btn) => {
    setVisible(false);
    setTimeout(() => btn.onPress && btn.onPress(), 100);
  };

  const iconMap = {
    info: { name: 'info', color: '#1E1E1F', bg: '#F1F3F7', border: '#EAECF0' },
    warning: { name: 'exclamation-triangle', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    error: { name: 'times', color: '#EE272D', bg: '#FEF2F2', border: '#FECACA' },
    success: { name: 'check', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  };
  const iconCfg = config.icon || iconMap[config.type] || iconMap.info;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert: hide }}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px] shadow-2xl border border-slate-200 text-center animate-scaleUp">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 border"
              style={{ backgroundColor: iconCfg.bg, borderColor: iconCfg.border }}
            >
              <Icon name={iconCfg.name} size={20} color={iconCfg.color} />
            </div>

            {config.title && (
              <h3 className="text-base font-extrabold text-[#1E1E1F] tracking-tight">{config.title}</h3>
            )}
            {config.message && (
              <p className="text-[13px] text-[#667085] mt-1.5 leading-relaxed font-medium px-1">
                {config.message}
              </p>
            )}

            <div className="flex gap-2.5 mt-5">
              {config.buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPressButton(btn)}
                    className={`flex-1 h-11 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center justify-center border ${
                      isDestructive || (!isCancel && !isDestructive)
                        ? 'bg-[#EE272D] text-white border-[#EE272D] shadow-sm hover:bg-[#D81E24]'
                        : 'bg-white text-[#1E1E1F] border-[#EAECF0] hover:bg-slate-50'
                    }`}
                  >
                    {btn.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAppAlert must be inside AppAlertProvider');
  return ctx;
}

