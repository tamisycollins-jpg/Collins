import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Lock,
  UserCheck,
  UserX,
  RefreshCw,
  Check,
  AlertCircle,
  Key,
  Shield,
} from 'lucide-react';
import { AppUser, UserRole } from '../../types';
import { getAuthHeaders } from '../../services/storage';

export function UserManagementSection() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNomComplet, setNewNomComplet] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VENDEUR');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorMsg('Veuillez renseigner le nom d’utilisateur et le mot de passe.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          nomComplet: newNomComplet.trim() || newUsername.trim(),
          role: newRole,
          actif: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Compte "${newUsername}" créé avec succès.`);
        setNewUsername('');
        setNewPassword('');
        setNewNomComplet('');
        setShowAddForm(false);
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.message || 'Erreur lors de la création du compte.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de connexion serveur.');
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: user.username,
          actif: !user.actif,
          role: user.role,
        }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch {}
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">
              Gestion Multi-Utilisateurs & Droits d'Accès
            </h2>
            <p className="text-[11px] text-slate-500">
              Attribuez des comptes distincts pour les vendeurs, la caisse ou la consultation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Fermer le formulaire' : 'Ajouter un utilisateur'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateUser}
          className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Nouveau Compte Utilisateur</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nom d’utilisateur (Identifiant) *
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ex: Caisse1"
                required
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mot de passe *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nom complet / Affichage
              </label>
              <input
                type="text"
                value={newNomComplet}
                onChange={(e) => setNewNomComplet(e.target.value)}
                placeholder="Ex: Jean (Vendeur Caisse)"
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rôle & Privilèges
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ADMIN">ADMIN (Accès total & configuration)</option>
                <option value="VENDEUR">VENDEUR (Vente, encaissement, impression)</option>
                <option value="CONSULTATION">CONSULTATION (Lecture seule des stocks)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-xs"
            >
              Enregistrer l'utilisateur
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Comptes actifs sur le serveur ({users.length}) :
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {users.map((u) => (
            <div
              key={u.id || u.username}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                u.actif
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-rose-50/50 border-rose-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-slate-900 text-xs truncate">
                    {u.username}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      u.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : u.role === 'VENDEUR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {u.nomComplet || u.username}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                <span>{u.actif ? 'Actif' : 'Désactivé'}</span>
                {u.username.toLowerCase() !== 'clinic auto' && (
                  <button
                    type="button"
                    onClick={() => handleToggleUserStatus(u)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    {u.actif ? 'Désactiver' : 'Activer'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
