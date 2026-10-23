import { useState, useEffect } from 'react';
import { LayoutGrid, Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Stats', href: '#stats' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              <LayoutGrid className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Seat<span className="text-blue-600">Wise</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#get-started"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Get Started
            </a>
          </div>

          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3 bg-white/95 backdrop-blur-md rounded-b-xl border-b border-gray-100">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#get-started"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-semibold text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
