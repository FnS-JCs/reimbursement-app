import { useState } from 'react';
import { JCDashboard } from './JCDashboard';
import { SCDashboard } from './SCDashboard';
import { FSDashboard } from './FSDashboard';
import { Navigation } from '../components/Navigation';

type Role = 'JC' | 'SC' | 'F_S';

export function Dashboard() {
  const [mockRole, setMockRole] = useState<Role>('JC');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-2">Demo Mode - Switch Role:</p>
          <div className="flex gap-2">
            {(['JC', 'SC', 'F_S'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setMockRole(role)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mockRole === role
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role === 'JC' ? 'Junior Coordinator' : role === 'SC' ? 'Senior Coordinator' : 'Finance & Strategy'}
              </button>
            ))}
          </div>
        </div>
        <main>
          {mockRole === 'JC' && <JCDashboard />}
          {mockRole === 'SC' && <SCDashboard />}
          {mockRole === 'F_S' && <FSDashboard />}
        </main>
      </div>
    </div>
  );
}
