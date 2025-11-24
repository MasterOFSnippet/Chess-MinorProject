import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LogOut, User, Home, Info, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300"
      style={{
        backgroundColor: 'hsl(var(--color-background) / 0.75)',
        borderColor: 'hsl(var(--color-border))',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* ========== LOGO ========== */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
            onClick={closeMobileMenu}
          >
            <span className="text-3xl transition-transform group-hover:scale-110">♟️</span>
            <span className="text-2xl font-bold tracking-tight group-hover:text-[hsl(var(--color-primary))] transition-colors">
              ChessMaster
            </span>
          </Link>

          {/* ========== DESKTOP NAVIGATION ========== */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-1 hover:bg-[hsl(var(--color-muted))]">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="ghost" size="sm" className="gap-1 hover:bg-[hsl(var(--color-muted))]">
                  <Info className="h-4 w-4" />
                  About
                </Button>
              </Link>
            </div>
          )}

          {/* ========== DESKTOP USER INFO ========== */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 rounded-lg px-3 py-1.5 bg-[hsl(var(--color-muted)/0.5)] border border-[hsl(var(--color-border))]">
                  <User className="h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold text-sm">{user?.username}</span>
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--color-muted-foreground))]">
                      <span>Rating:</span>
                      <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-medium">
                        {user?.rating ?? '1200'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button onClick={handleLogout} variant="destructive" size="sm" className="gap-1">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* ========== MOBILE MENU BUTTON ========== */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-[hsl(var(--color-muted))] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* ========== MOBILE MENU DROPDOWN ========== */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden py-4 space-y-2 border-t border-[hsl(var(--color-border))] mt-2"
            style={{
              animation: 'slideDown 200ms ease-out'
            }}
          >
            {isAuthenticated && (
              <>
                {/* User Info Mobile */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[hsl(var(--color-muted)/0.5)] border border-[hsl(var(--color-border))] mb-3">
                  <User className="h-5 w-5 text-[hsl(var(--color-muted-foreground))]" />
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold text-base">{user?.username}</span>
                    <div className="flex items-center gap-1 text-sm text-[hsl(var(--color-muted-foreground))]">
                      <span>Rating:</span>
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                        {user?.rating ?? '1200'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <Link to="/" onClick={closeMobileMenu}>
                  <button className="w-full flex items-center gap-2 px-4 py-3 rounded-md text-left hover:bg-[hsl(var(--color-muted))] transition-colors">
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Home</span>
                  </button>
                </Link>

                <Link to="/about" onClick={closeMobileMenu}>
                  <button className="w-full flex items-center gap-2 px-4 py-3 rounded-md text-left hover:bg-[hsl(var(--color-muted))] transition-colors">
                    <Info className="h-5 w-5" />
                    <span className="font-medium">About</span>
                  </button>
                </Link>

                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full gap-2 mt-3"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </Button>
              </>
            )}

            {!isAuthenticated && (
              <div className="space-y-2">
                <Link to="/login" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={closeMobileMenu}>
                  <Button className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ========== ANIMATION STYLES ========== */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;