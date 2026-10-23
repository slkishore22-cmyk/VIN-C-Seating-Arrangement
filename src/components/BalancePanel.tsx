import { useMemo, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { deptColor } from '@/lib/colors';
import { readDrag, startDrag, type DragSource } from '@/lib/drag';
import type { Room, Student } from '@/lib/types';

export const NEW_ROOM = -1;

/** One placement action from the balance list, with where each student sits now. */
export interface PlacedBatch {
  id: number;
  at: string;
  items: { student: Student; room: string }[];
}

interface Props {
  balance: Student[];
  placed: PlacedBatch[];
  rooms: Room[];
  roomLabel: (r: Room) => string;
  blockSizes: number[];
  onPlace: (target: number, students: Student[]) => void;
  /** A seated student dragged back onto the list. */
  onReturn: (src: Extract<DragSource, { from: 'seat' }>) => void;
  onUndoBatch: (id: number) => void;
  onUndoOne: (roll: string) => void;
  onUndoAll: () => void;
}

const freeSeats = (r: Room) => r.grid.reduce((n, row) => n + row.filter((s) => !s).length, 0);

export default function BalancePanel({
  balance,
  placed,
  rooms,
  roomLabel,
  blockSizes,
  onPlace,
  onReturn,
  onUndoBatch,
  onUndoOne,
  onUndoAll,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const targetIdx = target ?? (rooms.length > 0 ? rooms.length - 1 : NEW_ROOM);

  const groups = useMemo(() => {
    const map = new Map<string, { examCode: string; department: string; students: Student[] }>();
    for (const s of balance) {
      const key = `${s.examCode}|${s.department}`;
      if (!map.has(key)) map.set(key, { examCode: s.examCode, department: s.department, students: [] });
      map.get(key)!.students.push(s);
    }
    return Array.from(map.values());
  }, [balance]);

  const placedCount = placed.reduce((n, b) => n + b.items.length, 0);

  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDropping(true);
    },
    onDragLeave: () => setDropping(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDropping(false);
      const src = readDrag(e);
      if (src?.from === 'seat') onReturn(src);
    },
  };
  const ring = dropping ? '0 0 0 3px #1565C0' : undefined;

  if (balance.length === 0 && placedCount === 0)
    return (
      <div
        {...dropProps}
        className="no-print mb-6 px-4 py-3 rounded-2xl border-2 border-dashed text-center text-xs text-muted-foreground transition-shadow"
        style={{ boxShadow: ring }}
      >
        Balance list is empty — drag a seated student here to take them out of the room.
      </div>
    );

  const toggle = (rolls: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rolls) {
        if (on) next.add(r);
        else next.delete(r);
      }
      return next;
    });

  const chosen = balance.filter((s) => selected.has(s.rollNumber));
  const targetName = targetIdx === NEW_ROOM ? 'a new room' : `Room ${roomLabel(rooms[targetIdx])}`;

  const place = () => {
    onPlace(targetIdx, chosen);
    setSelected(new Set());
    setTarget(null);
  };

  return (
    <div className="no-print mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: students still waiting for a seat */}
      <div
        {...dropProps}
        className="p-4 sm:p-5 rounded-2xl border-2 transition-shadow flex flex-col min-w-0"
        style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', boxShadow: ring }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <p className="font-bold text-sm" style={{ color: '#B45309' }}>
            Balance list — {balance.length} not seated
          </p>
          {balance.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => toggle(balance.map((s) => s.rollNumber), true)}
                className="text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: '#B45309' }}
              >
                Select all
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: '#B45309' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: '#92400E' }}>
          Left over after filling blocks of {blockSizes.join(' / ')} with the same degree and subject.{' '}
          <strong>Drag a roll number onto any seat</strong>, or select several and put them in a room.
        </p>

        {balance.length === 0 ? (
          <p className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-8 text-center">
            Everyone is seated. Drag a seated student here to take them out of the room.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 flex-1">
            {groups.map((g) => {
              const rolls = g.students.map((s) => s.rollNumber);
              const all = rolls.every((r) => selected.has(r));
              const c = deptColor(g.department);
              return (
                <div key={`${g.examCode}|${g.department}`} className="bg-white/70 rounded-xl p-3 border border-amber-200">
                  <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={(e) => toggle(rolls, e.target.checked)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="font-mono font-semibold">{g.examCode}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>
                      {g.department}
                    </span>
                    <span className="text-xs text-muted-foreground">({g.students.length})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {g.students.map((s) => {
                      const on = selected.has(s.rollNumber);
                      return (
                        <button
                          key={s.rollNumber}
                          draggable
                          onDragStart={(e) => startDrag(e, { from: 'balance', roll: s.rollNumber })}
                          onClick={() => toggle([s.rollNumber], !on)}
                          aria-pressed={on}
                          title="Drag onto a seat, or click to select"
                          className={`px-2 py-1 rounded-md text-xs font-mono border transition-colors cursor-grab active:cursor-grabbing ${
                            on ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-amber-300 hover:border-amber-500'
                          }`}
                        >
                          {s.rollNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {balance.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: '#92400E' }}>
              {chosen.length} selected · put in
            </span>
            <select
              value={targetIdx}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="px-2 py-1.5 text-xs border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-full"
            >
              {rooms.map((r, i) => (
                <option key={r.roomNumber} value={i}>
                  Room {roomLabel(r)} ({freeSeats(r)} free){i === rooms.length - 1 ? ' — last room' : ''}
                </option>
              ))}
              <option value={NEW_ROOM}>New room</option>
            </select>
            <Button size="sm" disabled={chosen.length === 0} onClick={place} className="rounded-md text-xs">
              Put {chosen.length || ''} in {targetName}
            </Button>
          </div>
        )}
      </div>

      {/* Right: students placed from the balance list, undoable per placement */}
      <div
        className="p-4 sm:p-5 rounded-2xl border-2 flex flex-col min-w-0"
        style={{ backgroundColor: '#F0F7F0', borderColor: '#2E7D32' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <p className="font-bold text-sm" style={{ color: '#1B5E20' }}>
            Placed from balance — {placedCount}
          </p>
          {placedCount > 0 && (
            <button
              onClick={onUndoAll}
              className="text-xs font-medium underline-offset-2 hover:underline"
              style={{ color: '#1B5E20' }}
            >
              Undo all
            </button>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: '#2E7D32' }}>
          <strong>Undo</strong> sends that group back to the balance list and frees their seats. ✕ undoes one student.
        </p>

        {placedCount === 0 ? (
          <p className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-8 text-center">
            Students you place from the balance list will appear here.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 flex-1">
            {placed.map((b) => {
              const roomsUsed = Array.from(new Set(b.items.map((i) => i.room)));
              return (
                <div key={b.id} className="bg-white/80 rounded-xl p-3 border border-green-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {b.items.length} student{b.items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground"> → Room {roomsUsed.join(', ')}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">{b.at}</span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUndoBatch(b.id)}
                      className="h-7 px-3 text-xs rounded-md border-green-300 text-green-800 hover:bg-green-50"
                    >
                      ↶ Undo
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.items.map(({ student, room }) => (
                      <span
                        key={student.rollNumber}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs border border-green-300 bg-white"
                        title={`${student.examCode} · ${student.department} · Room ${room}`}
                      >
                        <span className="font-mono">{student.rollNumber}</span>
                        <span className="text-[10px] text-muted-foreground">R{room}</span>
                        <button
                          onClick={() => onUndoOne(student.rollNumber)}
                          aria-label={`Undo ${student.rollNumber}`}
                          className="w-4 h-4 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 leading-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
