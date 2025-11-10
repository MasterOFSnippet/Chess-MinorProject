import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LogOut, User, Home, Info } from 'lucide-react'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav
      className="
        sticky top-0 z-50
        backdrop-blur-md
        border-b
        transition-all duration-300
      "
      style={{
        backgroundColor: 'hsl(var(--color-background) / 0.75)',
        borderColor: 'hsl(var(--color-border))',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* ---------- Left: Logo + Nav Links ---------- */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 group"
            >
              <span className="text-3xl transition-transform group-hover:scale-110">♟️</span>
              <span className="text-2xl font-bold tracking-tight group-hover:text-[hsl(var(--color-primary))] transition-colors">
                ChessMaster
              </span>
            </Link>

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
          </div>

          {/* ---------- Right: User Section ---------- */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center gap-3 rounded-lg px-3 py-1.5 bg-[hsl(var(--color-muted)/0.5)] border border-[hsl(var(--color-border))]">
                  <User className="h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold text-sm">{user?.username}</span>
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--color-muted-foreground))]">
                      <span>Rating:</span>
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0.5 text-xs font-medium"
                      >
                        {user?.rating ?? '1200'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar;
