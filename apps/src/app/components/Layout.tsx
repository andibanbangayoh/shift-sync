import { Link, useLocation } from 'react-router';
import { Calendar, Users, BarChart3, ArrowLeftRight, LayoutDashboard, Bell } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { Badge } from '../components/ui/badge';
import { notifications } from '../data/mockData';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Scheduler', href: '/scheduler', icon: Calendar },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Swaps & Coverage', href: '/swaps', icon: ArrowLeftRight },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Calendar className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base">ShiftSync</h1>
              <p className="text-xs text-muted-foreground">Manager View</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="size-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-sm text-white">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">Jane Doe</p>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base">Downtown Branch</h2>
            <Badge variant="outline" className="text-xs">EST</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 size-5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-xs text-destructive-foreground">{unreadCount}</span>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
