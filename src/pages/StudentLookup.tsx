import { useState } from 'react';
import { findSeat, type SeatRecord } from '@/lib/publish';

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2.5 border-t border-neutral-200 text-[13px] text-neutral-500">
      <span>{label}</span>
      <span className={`font-semibold text-neutral-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function StudentLookup() {
  const [roll, setRoll] = useState('');
  const [result, setResult] = useState<SeatRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get('session'));

  const search = async () => {
    if (!roll.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const seat = await findSeat(roll, sessionId);
      if (seat) setResult(seat);
      else setError('Roll number not found. Please check and try again.');
    } catch {
      setError('Roll number not found. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-6 font-[system-ui,sans-serif]">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🎓</div>
        <h1 className="text-[22px] font-semibold text-neutral-900 mb-1">Exam Hall Finder</h1>
        <p className="text-sm text-neutral-500">Enter your roll number to find your seat</p>
      </div>

      <div className="bg-white rounded-xl p-6 w-full max-w-[380px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <label className="text-xs text-neutral-500 block mb-1.5">ROLL NUMBER</label>
        <input
          type="text"
          value={roll}
          onChange={(e) => setRoll(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="e.g. 21BBA001"
          autoFocus
          className="w-full px-3.5 py-3 border-[1.5px] border-neutral-200 rounded-lg text-base font-mono outline-none uppercase mb-3 focus:border-neutral-900"
        />
        <button
          onClick={search}
          disabled={loading || !roll.trim()}
          className={`w-full p-3 rounded-lg text-white text-[15px] font-medium ${loading ? 'bg-neutral-300' : 'bg-neutral-900'} disabled:cursor-default`}
        >
          {loading ? 'Searching...' : 'Find My Seat'}
        </button>
        {error && (
          <div className="mt-3 px-3.5 py-2.5 bg-[#fff3f3] border border-[#ffcccc] rounded-md text-[13px] text-[#cc0000]">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-xl p-6 w-full max-w-[380px] mt-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-2 border-[#2E7D32]">
          <div className="text-center mb-5">
            <div className="text-[40px] mb-1">✅</div>
            <div className="text-[13px] text-neutral-500">Seat found</div>
          </div>
          <div className="bg-[#f0f7f0] rounded-[10px] p-4 text-center mb-3">
            <div className="text-xs text-neutral-500 tracking-widest mb-1">ROOM NUMBER</div>
            <div className="text-5xl font-bold text-[#2E7D32] leading-none">{result.room_number}</div>
          </div>
          <div className="bg-neutral-100 rounded-[10px] p-4 text-center mb-3">
            <div className="text-xs text-neutral-500 tracking-widest mb-1">SEAT NUMBER</div>
            <div className="text-5xl font-bold text-[#1565C0] leading-none">{result.seat_number}</div>
          </div>
          <Row label="Roll Number" value={result.roll_number} mono />
          <Row label="Exam Code" value={result.exam_code || '—'} mono />
          <Row label="Department" value={result.dept || '—'} />
          <button
            onClick={() => {
              setResult(null);
              setRoll('');
            }}
            className="w-full mt-4 p-2.5 border border-neutral-300 rounded-lg bg-white text-[13px] text-neutral-500"
          >
            Search another roll number
          </button>
        </div>
      )}
    </div>
  );
}
