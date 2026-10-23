import { ArrowRight, CheckCircle2, Users, Building2, FileSpreadsheet } from 'lucide-react';

const badges = [
  { icon: Users, label: 'Student Management' },
  { icon: Building2, label: 'Room Allocation' },
  { icon: FileSpreadsheet, label: 'Auto Seating' },
];

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-100 via-cyan-50 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-cyan-50 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Smart Exam Hall Management
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-gray-900">
              Arrange exam seating
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                in minutes, not hours
              </span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              SeatWise automates student placement across exam halls with
              intelligent algorithms — no overlaps, no manual spreadsheets, no
              stress. Just fair, organized seating every time.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#get-started"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                Start Arranging
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual mockup */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl bg-white border border-gray-100 shadow-2xl shadow-blue-500/10 overflow-hidden">
              {/* Mockup header */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs font-medium text-gray-400">
                  Seating Chart — Hall A
                </span>
              </div>

              {/* Mockup grid */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Mathematics Final — 120 Students
                    </p>
                    <p className="text-xs text-gray-400">Dec 15, 2026 · 10:00 AM</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-600 text-xs font-semibold">
                    Arranged
                  </span>
                </div>

                {/* Seat grid */}
                <div className="grid grid-cols-8 gap-1.5">
                  {Array.from({ length: 40 }).map((_, i) => {
                    const taken = i % 5 !== 2;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-md text-[9px] flex items-center justify-center font-medium transition-all ${
                          taken
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-gray-50 text-gray-300 border border-gray-100'
                        }`}
                      >
                        {taken ? `${i + 1}` : '—'}
                      </div>
                    );
                  })}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Halls</p>
                    <p className="text-lg font-bold text-blue-600">3</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="text-lg font-bold text-cyan-600">120</p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="text-lg font-bold text-green-600">96%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-5 rounded-xl bg-white shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">No conflicts</p>
                <p className="text-[10px] text-gray-400">Verified automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
