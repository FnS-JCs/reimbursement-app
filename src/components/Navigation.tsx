import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, FileText, LayoutDashboard, Settings } from 'lucide-react';

export function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const getNavLinks = () => {
    if (!user) return [];

    const links = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (user.role === 'F_S') {
      links.push({ to: '/fs-admin', label: 'F&S Admin', icon: Settings });
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900">SRCC Placement Cell</span>
            </Link>
            {navLinks.length > 0 && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === link.to
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-gray-500">{user?.role === 'F_S' ? 'F&S' : user?.role}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
