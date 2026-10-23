import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section id="get-started" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Ready to simplify your next exam?
        </h2>
        <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
          Join hundreds of institutions using SeatWise to arrange seating
          fairly, efficiently, and in a fraction of the time.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#get-started"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Explore Features
          </a>
        </div>
      </div>
    </section>
  );
}
