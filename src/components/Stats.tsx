const stats = [
  { value: '500+', label: 'Institutions' },
  { value: '2M+', label: 'Students Seated' },
  { value: '10K+', label: 'Exams Arranged' },
  { value: '99.9%', label: 'Conflict-Free' },
];

export default function Stats() {
  return (
    <section id="stats" className="py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 overflow-hidden p-12 lg:p-16">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                  {s.value}
                </p>
                <p className="mt-2 text-sm lg:text-base text-blue-100 font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
