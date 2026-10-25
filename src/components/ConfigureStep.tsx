import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { seatGroup, type SeatGroup } from '@/lib/seating';
import type { RoomConfig, SeatPattern, SeatSpacing } from '@/lib/types';

interface Layout {
  rows: number;
  mainColumns: number;
  seatsPerColumn: number;
  pattern?: SeatPattern;
}

/** Hall layouts offered. Rows × (main columns × seats per column) = room strength. */
const PRESETS: Layout[] = [
  { rows: 7, mainColumns: 2, seatsPerColumn: 3, pattern: 'rotate' },
  { rows: 5, mainColumns: 3, seatsPerColumn: 3 },
];
const CUSTOM = -1;

/** How students sit within the room's seats. */
const SPACINGS: { value: SeatSpacing; label: string; hint: string }[] = [
  { value: 'one-line', label: 'One line', hint: 'A _ C one subject, middle seats another' },
  { value: 'gap', label: 'One gap one', hint: 'A _ C every other row, gaps other subjects' },
  { value: 'cross', label: 'Cross', hint: 'Zigzag 1 _ _ / _ _ 2, middle one gap one' },
];

/** Preview colour per seat group: the main subject, then the subjects filling the gaps. */
const GROUP_COLOR: Record<SeatGroup, [active: string, idle: string]> = {
  A: ['bg-ring', 'bg-border'],
  B: ['bg-amber-400', 'bg-amber-200'],
  C: ['bg-emerald-400', 'bg-emerald-200'],
  D: ['bg-rose-400', 'bg-rose-200'],
};

const strength = (l: Layout) => l.rows * l.mainColumns * l.seatsPerColumn;

function LayoutPreview({
  rows,
  mainColumns,
  seatsPerColumn,
  spacing,
  active,
}: Layout & { spacing?: SeatSpacing; active?: boolean }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: mainColumns }).map((_, c) => (
        <div key={c} className="flex flex-col gap-0.5">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-0.5">
              {Array.from({ length: seatsPerColumn }).map((_, s) => {
                const col = c * seatsPerColumn + s;
                const group = spacing ? seatGroup(r, col, seatsPerColumn, undefined, spacing) : 'A';
                return (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-[2px] transition-colors ${GROUP_COLOR[group][active ? 0 : 1]}`}
                  />
                );
              })}
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
  const [spacing, setSpacing] = useState<SeatSpacing>(initial.spacing ?? 'one-line');

  const config: RoomConfig =
    selected === CUSTOM
      ? { studentsPerRoom, mainColumns, seatsPerColumn, spacing }
      : {
          studentsPerRoom: strength(PRESETS[selected]),
          mainColumns: PRESETS[selected].mainColumns,
          seatsPerColumn: PRESETS[selected].seatsPerColumn,
          pattern: PRESETS[selected].pattern,
          spacing,
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
    <div className="max-w-5xl mx-auto px-4">
      <Button variant="outline" onClick={onBack} className="rounded-xl px-6 h-10 text-sm mb-6">
        ← Back
      </Button>
      <h2 className="text-2xl font-bold text-center mb-2">Room Configuration</h2>
      <p className="text-sm text-muted-foreground text-center mb-8">Choose a seating matrix for each room</p>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <h3 className="text-sm font-semibold text-center mb-3">Room Layout</h3>
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
                    active
                      ? 'border-ring bg-gold-light shadow-sm'
                      : 'border-border bg-background hover:border-muted-foreground'
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
                  </p>
                  <LayoutPreview {...p} spacing={spacing} active={active} />
                </button>
              );
            })}
          </div>

          <button
            role="radio"
            aria-checked={selected === CUSTOM}
            onClick={() => setSelected(CUSTOM)}
            className={`mt-3 w-full rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              selected === CUSTOM
                ? 'border-ring bg-gold-light'
                : 'border-dashed border-border hover:border-muted-foreground'
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
        </div>

        <div>
          <h3 className="text-sm font-semibold text-center mb-3">Seating Arrangement</h3>
          <div role="radiogroup" aria-label="Seating arrangement" className="grid gap-3">
            {SPACINGS.map((o) => {
              const active = spacing === o.value;
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSpacing(o.value)}
                  className={`rounded-2xl border-2 p-3 flex items-center justify-between gap-3 text-left transition-all ${
                    active
                      ? 'border-ring bg-gold-light shadow-sm'
                      : 'border-border bg-background hover:border-muted-foreground'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'gold-text' : ''}`}>{o.label}</p>
                    <p className="text-[11px] text-muted-foreground">{o.hint}</p>
                  </div>
                  <LayoutPreview rows={5} mainColumns={1} seatsPerColumn={3} spacing={o.value} active={active} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
