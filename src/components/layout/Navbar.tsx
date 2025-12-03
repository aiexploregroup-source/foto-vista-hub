import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Feed', path: '/' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: User, label: 'Profile', path: user ? `/profile/${user.id}` : '/auth' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Desktop only */}
          <Link 
            to="/" 
            className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="font-display text-2xl font-semibold gradient-text">
              Pixela
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center justify-around w-full md:w-auto md:gap-1">
            {navItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || 
                (path.includes('/profile/') && location.pathname.startsWith('/profile/'));
              
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                    "hover:bg-accent",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                  <span className="text-xs md:text-sm font-medium">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sign Out - Desktop only */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
