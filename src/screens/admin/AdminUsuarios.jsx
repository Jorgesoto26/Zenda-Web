import React, { useState, useEffect, useCallback } from 'react';
import AppBackground from '../../components/AppBackground';
import Icon from '../../components/Icon';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import UserHeaderBadge from '../../components/UserHeaderBadge';
import BillingAlertBanner from '../../components/BillingAlertBanner';
import { UserCard } from './components/UserCard';
import { UserModal } from './components/UserModal';
import OrganizationModal from './components/OrganizationModal';
import { HierarchyBreadcrumb } from './components/HierarchyBreadcrumb';
import {
  getSubordinates,
  createAdminUser,
  updateAdminUser,
  toggleAdminUser,
} from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { appAlert } from '../../components/AppAlert';

export default function AdminUsuarios() {
  const { t } = useTranslation();
  const { userId, isReadOnly } = useAuth();
  const [hierarchyStack, setHierarchyStack] = useState([{ id: userId, name: 'Mi Equipo' }]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('activos');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [orgModalVisible, setOrgModalVisible] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const targetParentId = hierarchyStack.length > 1 ? hierarchyStack[hierarchyStack.length - 1].id : null;
      const data = await getSubordinates(targetParentId);
      setUsers(data || []);
    } catch (err) {
      console.error('Error cargando subordinados:', err);
      appAlert(t('common.error'), err.message || 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [hierarchyStack, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleNavigateHierarchy = (subAdmin) => {
    setHierarchyStack((prev) => [
      ...prev,
      {
        id: subAdmin.id,
        name: `${subAdmin.nombre || ''} ${subAdmin.apellido || ''}`.trim() || 'Administrador',
      },
    ]);
  };

  const handlePopHierarchy = (targetIndex) => {
    setHierarchyStack((prev) => prev.slice(0, targetIndex + 1));
  };

  const handleSaveUser = async (userData) => {
    if (isReadOnly) {
      appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible crear o modificar usuarios.'
      );
      return;
    }

    if (editingUser) {
      await updateAdminUser(editingUser.id, userData);
      appAlert('Usuario Actualizado', 'Los datos y límites han sido actualizados exitosamente.');
    } else {
      const currentParent = hierarchyStack[hierarchyStack.length - 1];
      const superiorId = hierarchyStack.length > 1 ? currentParent.id : null;
      await createAdminUser({ ...userData, superior_id: superiorId });
      appAlert('Usuario Creado', 'El nuevo usuario ha sido registrado exitosamente.');
    }
    loadUsers();
  };

  const handleToggle = async (user) => {
    if (isReadOnly) {
      appAlert(
        'Modo Solo Lectura',
        'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible modificar usuarios.'
      );
      return;
    }

    try {
      const res = await toggleAdminUser(user.id);
      appAlert('Actualizado', `Usuario ${res?.activo ? 'habilitado' : 'inhabilitado'} correctamente`);
      loadUsers();
    } catch (e) {
      appAlert(t('common.error'), e.message || 'No se pudo cambiar el estado');
    }
  };

  const activosCount = users.filter((u) => u.activo !== false).length;
  const inactivosCount = users.filter((u) => u.activo === false).length;

  const filteredUsers = users.filter((u) => {
    const isActivo = u.activo !== false;
    const matchStatus = statusFilter === 'activos' ? isActivo : !isActivo;
    if (!matchStatus) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (u.nombre && u.nombre.toLowerCase().includes(q)) ||
        (u.apellido && u.apellido.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AppBackground>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header Superior con UserHeaderBadge */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-[#1E1E1F] tracking-wide">
              {t('users.title')}
            </h1>
            <div className="my-0.5">
              <UserHeaderBadge />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {activosCount} {t('users.active_filter').toLowerCase()} · {inactivosCount}{' '}
              {t('users.inactive_filter').toLowerCase()}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setOrgModalVisible(true)}
              title="Configuración Empresa"
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Icon name="building" size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isReadOnly) {
                  appAlert(
                    'Modo Solo Lectura',
                    'Tu cuenta se encuentra en periodo de gracia por facturación pendiente. No es posible crear usuarios.'
                  );
                  return;
                }
                setEditingUser(null);
                setModalVisible(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#EE272D] hover:bg-[#d91f25] text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Icon name="user-plus" size={13} />
              <span>Nuevo</span>
            </button>
          </div>
        </header>

        {/* Banner de Facturación */}
        <BillingAlertBanner />

        {/* Migas de pan de jerarquía */}
        <HierarchyBreadcrumb stack={hierarchyStack} onPop={handlePopHierarchy} />

        {/* Segmented Control Activos / Inactivos */}
        <div className="px-4 mt-3">
          <AnimatedSegmentedControl
            options={[
              {
                key: 'activos',
                label: t('users.active_filter'),
                badge: activosCount,
              },
              {
                key: 'inactivos',
                label: t('users.inactive_filter'),
                badge: inactivosCount,
              },
            ]}
            selectedKey={statusFilter}
            onChange={(key) => setStatusFilter(key)}
          />
        </div>

        {/* Buscador */}
        <div className="px-4 mt-3">
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-[#EE272D]">
            <Icon name="search" size={15} className="text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder={t('users.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-medium outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="times" size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="px-4 mt-3.5 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-[#EE272D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onEdit={(usr) => {
                  setEditingUser(usr);
                  setModalVisible(true);
                }}
                onToggle={handleToggle}
                onNavigateHierarchy={handleNavigateHierarchy}
              />
            ))
          ) : (
            <div className="bg-white/80 rounded-2xl p-8 text-center border border-slate-200/80 my-4">
              <Icon name="users" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {statusFilter === 'activos'
                  ? t('users.no_active_users')
                  : t('users.no_inactive_users')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? t('users.empty_search') : 'Usa el botón Nuevo para agregar usuarios'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Crear/Editar Usuario */}
        {modalVisible && (
          <UserModal
            visible={modalVisible}
            user={editingUser}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveUser}
          />
        )}

        {/* Modal de Organización / Empresa */}
        {orgModalVisible && (
          <OrganizationModal
            visible={orgModalVisible}
            onClose={() => setOrgModalVisible(false)}
          />
        )}
      </div>
    </AppBackground>
  );
}
