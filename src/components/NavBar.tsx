
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  Database, 
  Home, 
  LineChart, 
  LogIn,
  LogOut,
  Menu, 
  Upload, 
  User, 
  X, 
  Zap,
  Settings,
  History
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { path: "/", label: "Home", icon: <Home className="w-4 h-4 mr-2" /> },
    { path: "/upload", label: "Upload", icon: <Upload className="w-4 h-4 mr-2" /> },
    { path: "/dashboard", label: "Dashboard", icon: <Database className="w-4 h-4 mr-2" /> },
    { path: "/history", label: "History", icon: <History className="w-4 h-4 mr-2" /> },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border animate-fade-in">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center group" onClick={closeMenu}>
          <LineChart className="h-6 w-6 text-primary mr-2 group-hover:animate-pulse-soft" />
          <span className="font-semibold text-lg">Data Drishti</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link flex items-center ${
                isActive(link.path) ? "text-primary font-medium active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User and Theme Controls */}
        <div className="hidden md:flex items-center space-x-2">
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 p-2 rounded-full transition-colors hover:bg-secondary">
                <User className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button className="flex items-center gap-1" variant="outline" size="sm">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-full transition-colors hover:bg-secondary"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-b border-border animate-fade-in">
          <div className="container mx-auto py-4 px-4 space-y-4">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center p-2 rounded-md ${
                    isActive(link.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : ""
                  }`}
                  onClick={closeMenu}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </nav>
            
            <div className="flex flex-col pt-4 border-t border-border space-y-2">
              {user ? (
                <>
                  <div className="flex items-center p-2">
                    <User className="h-4 w-4 mr-2" />
                    <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center p-2 rounded-md"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  className="flex items-center p-2 rounded-md"
                  onClick={closeMenu}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Link>
              )}
              
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
