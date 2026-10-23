import { LayoutGrid } from 'lucide-react';

const footerLinks = {
  Product: ['Features', 'How It Works', 'Pricing', 'FAQ'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Seat<span className="text-blue-400">Wise</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              The smart exam seating arrangement platform for schools,
              colleges, and universities. Fair, fast, and conflict-free.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-white mb-4">{heading}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; 2026 SeatWise. All rights reserved.
          </p>
          <p className="text-sm">Built for educators, by educators.</p>
        </div>
      </div>
    </footer>
  );
}
