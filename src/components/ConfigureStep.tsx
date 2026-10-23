import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { RoomConfig, SeatPattern } from '@/lib/types';

interface Layout {
  rows: number;
  mainColumns: number;
  seatsPerColumn: number;
  pattern?: SeatPattern;
}

/** Hall layouts offered. Rows × (main columns × seats per column) = room strength. */
const PRESETS: Layout[] = [
  // Three subjects per room, 14 each (rotating one seat per row).
  { rows: 7, mainColumns: 2, seatsPerColumn: 3, pattern: 'rotate' },
  { rows: 5, mainColumns: 3, seatsPerColumn: 3 },
];
const CUSTOM = -1;

const strength = (l: Layout) => l.rows * l.mainColumns * l.seatsPerColumn;

function LayoutPreview({ rows, mainColumns, seatsPerColumn, active }: Layout & { active?: boolean }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: mainColumns }).map((_, c) => (
        <div key={c} className="flex flex-col gap-0.5">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-0.5">
              {Array.from({ length: seatsPerColumn }).map((_, s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-[2px] transition-colors ${active ? 'bg-ring' : 'bg-border'}`}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface Props {
  totalStudents: number;
  initial: RoomConfig;
  onGenerate: (config: RoomConfig) => void;
  onBack: () => void;
}

export default function ConfigureStep({ totalStudents, initial, onGenerate, onBack }: Props) {
  // A previous choice that isn't a preset was a custom layout.
  const [selected, setSelected] = useState(() =>
    PRESETS.findIndex(
      (p) =>
        strength(p) === initial.studentsPerRoom &&
        p.mainColumns === initial.mainColumns &&
        p.seatsPerColumn === initial.seatsPerColumn &&
        (p.pattern ?? 'criss-cross') === (initial.pattern ?? 'criss-cross'),
    ),
  );
  const [studentsPerRoom, setStudentsPerRoom] = useState(initial.studentsPerRoom);
  const [mainColumns, setMainColumns] = useState(initial.mainColumns);
  const [seatsPerColumn, setSeatsPerColumn] = useState(initial.seatsPerColumn);

  const config: RoomConfig =
    selected === CUSTOM
      ? { studentsPerRoom, mainColumns, seatsPerColumn }
      : {
          studentsPerRoom: strength(PRESETS[selected]),
          mainColumns: PRESETS[selected].mainColumns,
          seatsPerColumn: PRESETS[selected].seatsPerColumn,
          pattern: PRESETS[selected].pattern,
        };
  const cols = config.mainColumns * config.seatsPerColumn;
  const rows = Math.ceil(config.studentsPerRoom / cols);
  const roomsRequired = Math.ceil(totalStudents / config.studentsPerRoom);

  const fields = [
    { label: 'Students per Room', value: studentsPerRoom, set: setStudentsPerRoom },
    { label: 'Main Columns', value: mainColumns, set: setMainColumns },
    { label: 'Seats per Column', value: seatsPerColumn, set: setSeatsPerColumn },
  ];

  return (
    <div className="max-w-xl mx-auto px-4">
      <Button variant="outline" onClick={onBack} className="rounded-xl px-6 h-10 text-sm mb-6">
        ← Back
      </Button>
      <h2 className="text-2xl font-bold text-center mb-2">Room Configuration</h2>
      <p className="text-sm text-muted-foreground text-center mb-8">Choose a seating matrix for each room</p>

      <div role="radiogroup" aria-label="Seating matrix" className="grid grid-cols-2 gap-3">
        {PRESETS.map((p, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(i)}
              className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                active ? 'border-ring bg-gold-light shadow-sm' : 'border-border bg-background hover:border-muted-foreground'
              }`}
            >
              <span
                className={`absolute top-3 left-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-ring' : 'border-border'
                }`}
              >
                {active && <span className="w-2 h-2 rounded-full bg-ring" />}
              </span>
              <p className={`text-3xl font-bold ${active ? 'gold-text' : ''}`}>{strength(p)}</p>
              <p className="text-sm font-semibold mt-0.5">
                {p.rows} × {p.mainColumns * p.seatsPerColumn}
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                {p.mainColumns} columns · {p.seatsPerColumn} seats each
                {p.pattern === 'rotate' && (
                  <>
                    <br />3 subjects × {strength(p) / 3}
                  </>
                )}
              </p>
              <LayoutPreview {...p} active={active} />
            </button>
          );
        })}
      </div>

      <button
        role="radio"
        aria-checked={selected === CUSTOM}
        onClick={() => setSelected(CUSTOM)}
        className={`mt-3 w-full rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          selected === CUSTOM ? 'border-ring bg-gold-light' : 'border-dashed border-border hover:border-muted-foreground'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected === CUSTOM ? 'border-ring' : 'border-border'
          }`}
        >
          {selected === CUSTOM && <span className="w-2 h-2 rounded-full bg-ring" />}
        </span>
        Custom layout
      </button>

      {selected === CUSTOM && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {fields.map((f) => (
            <div key={f.label} className="text-center">
              <label className="block text-sm font-medium mb-2">{f.label}</label>
              <input
                type="number"
                min={1}
                value={f.value}
                onChange={(e) => f.set(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 text-center text-2xl font-semibold border-2 rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-secondary rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{config.studentsPerRoom}</p>
            <p className="text-xs text-muted-foreground">Room Strength</p>
          </div>
          <div>
            <p className="text-2xl font-bold gold-text">{roomsRequired}</p>
            <p className="text-xs text-muted-foreground">Rooms Required</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {rows} × {cols}
            </p>
            <p className="text-xs text-muted-foreground">Layout (Rows × Cols)</p>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Button onClick={() => onGenerate(config)} className="px-12 h-12 text-base rounded-xl">
          Generate Seating
        </Button>
      </div>
    </div>
  );
}
