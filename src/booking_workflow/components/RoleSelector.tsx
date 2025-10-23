import React from 'react';
import { User, Shield, Package, Radio } from 'lucide-react';
import type { UserRole } from '../types/workflow';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roles: { id: UserRole; label: string; icon: any; description: string; color: string }[] = [
  {
    id: 'Booking',
    label: 'Booking',
    icon: User,
    description: 'Create and manage booking requests',
    color: 'bg-blue-600'
  },
  {
    id: 'NOC',
    label: 'NOC',
    icon: Radio,
    description: 'Manage network operations and resources',
    color: 'bg-yellow-600'
  },
  {
    id: 'Ingest',
    label: 'Ingest',
    icon: Package,
    description: 'Handle content ingestion workflow',
    color: 'bg-green-600'
  },
  {
    id: 'Admin',
    label: 'Admin',
    icon: Shield,
    description: 'Full system access and analytics',
    color: 'bg-slate-800'
  }
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onRoleChange }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {roles.map(role => {
        const Icon = role.icon;
        const isActive = currentRole === role.id;
        return (
          <button
            key={role.id}
            onClick={() => onRoleChange(role.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              isActive
                ? `${role.color} border-transparent text-white shadow-lg scale-105`
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow'
            }`}
          >
            <Icon size={24} className={isActive ? 'text-white' : 'text-slate-600'} />
            <h3 className={`text-sm font-bold mt-2 ${isActive ? 'text-white' : 'text-slate-800'}`}>
              {role.label}
            </h3>
            <p className={`text-xs mt-1 ${isActive ? 'text-white text-opacity-90' : 'text-slate-500'}`}>
              {role.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
