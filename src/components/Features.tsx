import { Shuffle, Building2, Users, FileText, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Shuffle,
    title: 'Intelligent Auto-Seating',
    description:
      'Smart algorithms distribute students across halls preventing adjacent seat conflicts — shuffle, randomize, or assign by roll number.',
    color: 'blue',
  },
  {
    icon: Building2,
    title: 'Room & Hall Management',
    description:
      'Define multiple exam halls with custom row and column layouts. Set capacity limits and block unavailable seats instantly.',
    color: 'cyan',
  },
  {
    icon: Users,
    title: 'Student Roster Import',
    description:
      'Bulk import students from spreadsheets. Group by department, semester, or course — SeatWise keeps everything organized.',
    color: 'green',
  },
  {
    icon: FileText,
    title: 'Seating Charts & Hall Tickets',
    description:
      'Generate printable seating charts and individual hall tickets with seat numbers, hall names, and exam details in one click.',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Conflict-Free Guarantee',
    description:
      'Automatically prevents same-department neighbors and duplicate assignments. Every arrangement is validated before publishing.',
    color: 'cyan',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Arrange hundreds of students across multiple halls in seconds. No waiting, no lag — results the moment you click.',
    color: 'green',
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'group-hover:border-blue-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'group-hover:border-cyan-200' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'group-hover:border-green-200' },
};

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Everything you need to manage exam seating
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            From student import to printed hall tickets — SeatWise covers the
            entire seating workflow end to end.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const c = colorMap[f.color];
            return (
              <div
                key={f.title}
                className={`group p-7 rounded-2xl bg-white border border-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 ${c.border}`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}
                >
                  <f.icon className={`w-6 h-6 ${c.text}`} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
