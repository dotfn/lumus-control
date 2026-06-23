import React from 'react';
import { Sparkles, Github, Download, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../features/settings/components/ThemeToggle';
import { Link } from 'react-router-dom';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);


  const navLinks = [
    { label: 'Características', to: '/#features' },
    { label: 'Demo Interactiva', to: '/demo' },
    { label: 'Descargas', to: '/download' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-theme-bg text-theme-text font-sans scroll-smooth select-text relative">
      {/* Dynamic Background Glow for marketing pages */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, rgba(0, 122, 255, 0.12) 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-theme-border bg-theme-bg/85 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-all">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-display font-bold text-base tracking-tight text-theme-text transition-colors">
                Lumus Control
              </span>
              <span className="block text-[9px] text-theme-textSecondary font-mono -mt-0.5 tracking-wider uppercase">
                Open Source
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-theme-textSecondary hover:text-theme-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <a
              href="https://github.com/dotfn/lumus-control"
              target="_blank"
              rel="noreferrer"
              className="p-2 hover:bg-theme-input text-theme-textSecondary hover:text-theme-text rounded-xl border border-theme-border transition-all"
              aria-label="Repositorio en GitHub"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
            </a>
            <Link
              to="/download"
              className="flex items-center gap-1.5 px-4 py-2 bg-theme-accent hover:opacity-90 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-500/15"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </Link>
          </div>


          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-theme-input text-theme-text rounded-xl border border-theme-border transition-all"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-theme-border bg-theme-bg/95 p-6 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-theme-textSecondary hover:text-theme-text transition-colors py-1.5"
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-theme-border pt-4 mt-2 flex items-center gap-4">
                <a
                  href="https://github.com/dotfn/lumus-control"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-theme-textSecondary hover:text-theme-text transition-all"
                >
                  <Github className="w-4 h-4" /> GitHub Project
                </a>
                <Link
                  to="/download"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-theme-accent text-white font-semibold text-xs rounded-xl transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-theme-border bg-theme-sidebar/40 py-12 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-theme-text">
              Lumus Control
            </span>
          </div>

          <p className="text-xs text-theme-textSecondary font-medium text-center md:text-left">
            © {new Date().getFullYear()} Lumus Control. Desarrollado con código abierto para privacidad y rendimiento local.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/dotfn/lumus-control"
              target="_blank"
              rel="noreferrer"
                  className="text-xs text-theme-textSecondary hover:text-theme-text transition-colors flex items-center gap-1"
                  aria-label="Repositorio en GitHub"
                >
                  <Github className="w-3.5 h-3.5" aria-hidden="true" /> GitHub
            </a>
            <Link
              to="/download"
              className="text-xs text-theme-textSecondary hover:text-theme-text transition-colors"
            >
              Documentación
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
