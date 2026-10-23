import { Upload, Settings2, LayoutGrid, Printer } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Import Students',
    description:
      'Upload your student roster or add them manually. Group by department, course, or semester for smarter arrangement.',
  },
  {
    icon: Settings2,
    number: '02',
    title: 'Configure Halls',
    description:
      'Set up exam halls with row and column layouts. Define capacity, block seats, and assign exams to each hall.',
  },
  {
    icon: LayoutGrid,
    number: '03',
    title: 'Auto-Arrange Seats',
    description:
      'Click one button — SeatWise distributes students intelligently across all halls with zero conflicts.',
  },
  {
    icon: Printer,
    number: '04',
    title: 'Print & Publish',
    description:
      'Generate seating charts and hall tickets instantly. Print or export for distribution to invigilators and students.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Four simple steps to perfect seating
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            No training required. Get from student list to printed seating chart
            in under five minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-blue-200 to-transparent" />
              )}

              <div className="relative p-6 rounded-2xl bg-white border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <step.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-3xl font-bold text-gray-100">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
