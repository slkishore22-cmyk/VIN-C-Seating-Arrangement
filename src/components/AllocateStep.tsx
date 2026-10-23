import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import PrintSheet from '@/components/PrintSheet';
import BalancePanel, { NEW_ROOM } from '@/components/BalancePanel';
import { deptColor } from '@/lib/colors';
import { buildRecords, publishSession, supabase } from '@/lib/publish';
import { allocationBlockSizes, compareRolls, createEmptyRoom, findViolations, placeInRoom, seatGroup } from '@/lib/seating';
import { readDrag, startDrag, type DragSource } from '@/lib/drag';
import type { Room, RoomConfig, Seat, Student } from '@/lib/types';

interface Props {
  rooms: Room[];
  balance: Student[];
  config: RoomConfig;
  onChange: (rooms: Room[], balance: Student[]) => void;
  onBack: () => void;
}

/** Placeholder letter for an occupied seat whose exam code is hidden: edge seats A, middle seats B. */
const benchLetter = (col: number, spc: number) => {
  const pos = col % spc;
  return pos === 0 || pos === spc - 1 ? 'A' : 'B';
};

const withGrid = (r: Room, grid: Seat[][]): Room => ({
  ...r,
  grid,
  students: grid.flat().filter((s): s is Student => !!s),
});

const sortBalance = (list: Student[]) =>
  [...list].sort(
    (a, b) => a.examCode.localeCompare(b.examCode) || a.department.localeCompare(b.department) || compareRolls(a, b),
  );

export default function AllocateStep({ rooms, balance, config, onChange, onBack }: Props) {
  const [current, setCurrent] = useState(0);
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<'single' | 'all' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [publishedCount, setPublishedCount] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [names, setNames] = useState<Record<number, string>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  /** True while a seated student is being dragged; shows the "back to balance" drop zone. */
  const [draggingSeat, setDraggingSeat] = useState(false);
  /** Each placement from the balance list (newest first), so it can be undone as a group. */
  const [batches, setBatches] = useState<{ id: number; at: string; rolls: string[] }[]>([]);

  /** Where every seated student is right now, by roll number. */
  const locations = useMemo(() => {
    const map = new Map<string, { roomIdx: number; row: number; col: number; student: Student }>();
    rooms.forEach((r, roomIdx) =>
      r.grid.forEach((rowSeats, row) =>
        rowSeats.forEach((s, col) => s && map.set(s.rollNumber, { roomIdx, row, col, student: s })),
      ),
    );
    return map;
  }, [rooms]);

  const roomLabel = (r: Room) => names[r.roomNumber]?.trim() || String(r.roomNumber);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(c + 1, rooms.length - 1));
      else if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rooms.length]);

  const codeCounts = useMemo(() => {
    const map = new Map<string, number>();
    rooms.forEach((r) => r.students.forEach((s) => map.set(s.examCode, (map.get(s.examCode) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rooms]);

  const violations = useMemo(() => rooms.map(findViolations), [rooms]);
  const totalViolations = violations.reduce((n, v) => n + v.count, 0);

  /** Seats chosen balance students in the target room; overflow spills into new rooms. */
  const placeBalance = (target: number, chosen: Student[]) => {
    const next = [...rooms];
    const nextNo = () => Math.max(0, ...next.map((r) => r.roomNumber)) + 1;
    let idx = target;
    if (idx === NEW_ROOM) {
      next.push(createEmptyRoom(nextNo(), config));
      idx = next.length - 1;
    }
    let rest = chosen;
    for (let i = idx; rest.length > 0; i++) {
      if (i >= next.length) next.push(createEmptyRoom(nextNo(), config));
      const res = placeInRoom(next[i], rest);
      next[i] = res.room;
      rest = res.unplaced;
    }
    const placed = new Set(chosen.map((s) => s.rollNumber));
    onChange(
      next,
      balance.filter((s) => !placed.has(s.rollNumber)),
    );
    recordPlacement(chosen.map((s) => s.rollNumber));
    setCurrent(idx);
    setPublished(false);
  };

  const recordPlacement = (rolls: string[]) => {
    if (rolls.length === 0) return;
    const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fresh = new Set(rolls);
    setBatches((prev) => [
      { id: Date.now() + Math.random(), at, rolls },
      // A student placed again leaves their older group.
      ...prev.map((b) => ({ ...b, rolls: b.rolls.filter((r) => !fresh.has(r)) })).filter((b) => b.rolls.length > 0),
    ]);
  };

  /** Frees the seats of these students and puts them back on the balance list. */
  const unseat = (rolls: string[]) => {
    const grids = new Map<number, Seat[][]>();
    const back: Student[] = [];
    for (const roll of rolls) {
      const loc = locations.get(roll);
      if (!loc) continue;
      if (!grids.has(loc.roomIdx)) grids.set(loc.roomIdx, rooms[loc.roomIdx].grid.map((r) => [...r]));
      grids.get(loc.roomIdx)![loc.row][loc.col] = null;
      back.push(loc.student);
    }
    if (back.length === 0) return;
    const next = [...rooms];
    for (const [i, g] of grids) next[i] = withGrid(rooms[i], g);
    commit(next, sortBalance([...balance, ...back]));
  };

  const undoBatch = (id: number) => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) return;
    unseat(batch.rolls);
    setBatches((prev) => prev.filter((b) => b.id !== id));
  };

  const undoOne = (roll: string) => {
    unseat([roll]);
    setBatches((prev) =>
      prev.map((b) => ({ ...b, rolls: b.rolls.filter((r) => r !== roll) })).filter((b) => b.rolls.length > 0),
    );
  };

  const undoAll = () => {
    unseat(batches.flatMap((b) => b.rolls));
    setBatches([]);
  };

  /** Batches as shown: only students still seated (ones dragged back to balance drop out). */
  const placedBatches = batches
    .map((b) => ({
      id: b.id,
      at: b.at,
      items: b.rolls.flatMap((roll) => {
        const loc = locations.get(roll);
        return loc ? [{ student: loc.student, room: roomLabel(rooms[loc.roomIdx]) }] : [];
      }),
    }))
    .filter((b) => b.items.length > 0);

  const commit = (nextRooms: Room[], nextBalance: Student[]) => {
    onChange(nextRooms, nextBalance);
    setPublished(false);
  };

  /** Shows the dropped student's subject so the move is visible in the grid. */
  const reveal = (s: Student) => setVisibleCodes((prev) => (prev.has(s.examCode) ? prev : new Set(prev).add(s.examCode)));

  /** Drop onto a seat: empty seat → move there; occupied seat → swap (a balance drop sends the occupant to balance). */
  const dropOnSeat = (src: DragSource, roomIdx: number, row: number, col: number) => {
    const grids = new Map<number, Seat[][]>();
    const gridOf = (i: number) => {
      if (!grids.has(i)) grids.set(i, rooms[i].grid.map((r) => [...r]));
      return grids.get(i)!;
    };
    const target = gridOf(roomIdx);
    const occupant = target[row][col];
    let nextBalance = balance;
    let moved: Student;

    if (src.from === 'balance') {
      const s = balance.find((b) => b.rollNumber === src.roll);
      if (!s) return;
      moved = s;
      target[row][col] = s;
      nextBalance = balance.filter((b) => b !== s);
      if (occupant) nextBalance = sortBalance([...nextBalance, occupant]);
      recordPlacement([s.rollNumber]);
    } else {
      if (src.roomIdx === roomIdx && src.row === row && src.col === col) return;
      const from = gridOf(src.roomIdx);
      const s = from[src.row]?.[src.col];
      if (!s) return;
      moved = s;
      from[src.row][src.col] = occupant;
      target[row][col] = s;
    }

    const next = [...rooms];
    for (const [i, g] of grids) next[i] = withGrid(rooms[i], g);
    commit(next, nextBalance);
    reveal(moved);
  };

  /** Drop onto a room tab: first free seat in that room, avoiding same-subject neighbours where possible. */
  const dropOnRoom = (src: DragSource, roomIdx: number) => {
    if (src.from === 'balance') {
      const s = balance.find((b) => b.rollNumber === src.roll);
      if (s) placeBalance(roomIdx, [s]);
      return;
    }
    if (src.roomIdx === roomIdx) return;
    const s = rooms[src.roomIdx].grid[src.row]?.[src.col];
    if (!s) return;
    const res = placeInRoom(rooms[roomIdx], [s]);
    if (res.unplaced.length > 0) {
      alert(`Room ${roomLabel(rooms[roomIdx])} has no free seat.`);
      return;
    }
    const fromGrid = rooms[src.roomIdx].grid.map((r) => [...r]);
    fromGrid[src.row][src.col] = null;
    const next = [...rooms];
    next[src.roomIdx] = withGrid(rooms[src.roomIdx], fromGrid);
    next[roomIdx] = res.room;
    commit(next, balance);
    setCurrent(roomIdx);
    reveal(s);
  };

  /** Drop a seated student onto the balance list: take them out of the room. */
  const returnToBalance = (src: Extract<DragSource, { from: 'seat' }>) => {
    const s = rooms[src.roomIdx]?.grid[src.row]?.[src.col];
    if (!s) return;
    const grid = rooms[src.roomIdx].grid.map((r) => [...r]);
    grid[src.row][src.col] = null;
    const next = [...rooms];
    next[src.roomIdx] = withGrid(rooms[src.roomIdx], grid);
    commit(next, sortBalance([...balance, s]));
  };

  const balancePanel = (
    <BalancePanel
      balance={balance}
      rooms={rooms}
      roomLabel={roomLabel}
      blockSizes={allocationBlockSizes(config)}
      onPlace={placeBalance}
      onReturn={returnToBalance}
      placed={placedBatches}
      onUndoBatch={undoBatch}
      onUndoOne={undoOne}
      onUndoAll={undoAll}
    />
  );

  if (rooms.length === 0)
    return (
      <div className="max-w-6xl mx-auto px-4">
        {balancePanel}
        <div className="text-center py-20 text-muted-foreground">No rooms to display.</div>
      </div>
    );

  const room = rooms[current];
  const totalSeated = rooms.reduce((n, r) => n + r.students.length, 0);
  const revealed = rooms.reduce((n, r) => n + r.students.filter((s) => visibleCodes.has(s.examCode)).length, 0);
  const pct = totalSeated > 0 ? Math.round((revealed / totalSeated) * 100) : 0;
  const roomViolations = violations[current]?.count ?? 0;

  const toggleCode = (code: string) =>
    setVisibleCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const print = (mode: 'single' | 'all') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(null), 200);
    }, 50);
  };

  const publish = async () => {
    if (publishing || published) return;
    if (
      balance.length > 0 &&
      !confirm(`${balance.length} balance student(s) are not seated yet and won't be able to find a seat. Publish anyway?`)
    )
      return;
    setPublishing(true);
    try {
      const id = `session_${Date.now()}`;
      const records = buildRecords(rooms, roomLabel, id);
      await publishSession(records, id, rooms.length);
      setSessionId(id);
      setPublishedCount(records.length);
      setPublished(true);
      setShowQr(true);
    } catch (err) {
      alert('Publish failed: ' + ((err as Error)?.message || 'Unknown error'));
    } finally {
      setPublishing(false);
    }
  };

  const renderGrid = (r: Room, idx: number) => {
    const v = violations[idx];
    const mainCols = r.mainColumns ?? config.mainColumns;
    const spc = r.seatsPerColumn ?? config.seatsPerColumn;
    return (
      <table className="border-collapse mx-auto" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            {Array.from({ length: mainCols }).map((_, mc) => (
              <Fragment key={mc}>
                {Array.from({ length: spc }).map((_, s) => (
                  <th
                    key={s}
                    className="border border-border px-2 py-2 text-xs font-semibold bg-secondary text-secondary-foreground"
                    style={{ minWidth: 90 }}
                  >
                    {mc * spc + s + 1}
                  </th>
                ))}
                {mc < mainCols - 1 && <th className="w-4 border-none" style={{ minWidth: 16 }} />}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.grid.map((row, ri) => (
            <tr key={ri}>
              {row.map((s, ci) => {
                const pos = ci % spc;
                const gap = pos === spc - 1 && Math.floor(ci / spc) !== mainCols - 1;
                const isViolation = v?.cells.has(`${ri}-${ci}`);
                const shown = !!s && visibleCodes.has(s.examCode);
                let bg: string;
                let border: string;
                let content: ReactNode;

                if (s && shown) {
                  const c = deptColor(s.department);
                  bg = c.bg;
                  border = isViolation ? '3px solid #EF4444' : '2px solid white';
                  content = (
                    <div className="flex flex-col items-center justify-center">
                      <span style={{ fontSize: 9, color: c.text, fontWeight: 500 }}>{s.department}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFD700' }}>{s.examCode}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.text, fontFamily: 'monospace' }}>
                        {s.rollNumber}
                      </span>
                    </div>
                  );
                } else if (s) {
                  bg = 'hsl(var(--muted))';
                  border = '1px solid hsl(var(--border))';
                  content = (
                    <span className="text-muted-foreground text-xs font-medium">
                      {r.isGeneral ? (pos % 2 === 0 ? 'A' : 'B') : benchLetter(ci, spc)}
                    </span>
                  );
                } else {
                  bg = 'hsl(var(--background))';
                  border = '1px solid hsl(var(--border))';
                  content = (
                    <span className="text-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
                      {r.isGeneral ? (pos % 2 === 0 ? 'A' : 'B') : seatGroup(ri, ci, spc, r.pattern)}
                    </span>
                  );
                }

                const key = `${idx}-${ri}-${ci}`;
                const isTarget = dragOver === key;
                return (
                  <Fragment key={ci}>
                    <td
                      className="text-center align-middle seat-cell"
                      draggable={!!s}
                      onDragStart={(e) => {
                        if (!s) return;
                        startDrag(e, { from: 'seat', roomIdx: idx, row: ri, col: ci });
                        setDraggingSeat(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOver !== key) setDragOver(key);
                      }}
                      onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const src = readDrag(e);
                        if (src) dropOnSeat(src, idx, ri, ci);
                      }}
                      onDragEnd={() => {
                        setDragOver(null);
                        setDraggingSeat(false);
                      }}
                      title={s ? `${s.rollNumber} — drag to move or swap` : 'Empty seat — drop a student here'}
                      style={{
                        minWidth: 90,
                        height: 65,
                        backgroundColor: isTarget ? '#E3F2FD' : bg,
                        padding: '4px 6px',
                        border,
                        outline: isTarget ? '3px dashed #1565C0' : undefined,
                        outlineOffset: -3,
                        cursor: s ? 'grab' : undefined,
                        boxShadow: isViolation && shown ? 'inset 0 0 8px rgba(239,68,68,0.4)' : undefined,
                      }}
                    >
                      {content}
                    </td>
                    {gap && <td className="border-none" style={{ minWidth: 16 }} />}
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const studentLink = `${window.location.origin}/student?session=${sessionId}`;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {draggingSeat && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (dragOver !== 'to-balance') setDragOver('to-balance');
          }}
          onDragLeave={() => setDragOver((k) => (k === 'to-balance' ? null : k))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            setDraggingSeat(false);
            const src = readDrag(e);
            if (src?.from === 'seat') returnToBalance(src);
          }}
          // Pinned with top/bottom only (no translate or scale) so it never shifts while hovering.
          className="no-print fixed z-50 right-4 top-[20vh] bottom-[20vh] w-44 max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:w-auto max-sm:h-24 rounded-2xl border-[3px] border-dashed flex flex-col items-center justify-center gap-2 text-center p-4 shadow-xl transition-colors"
          style={{
            backgroundColor: dragOver === 'to-balance' ? '#FDE68A' : 'rgba(255, 251, 235, 0.95)',
            borderColor: dragOver === 'to-balance' ? '#B45309' : '#F59E0B',
          }}
        >
          {/* Children ignore the pointer so moving over the text doesn't toggle the hover state. */}
          <span className="text-3xl pointer-events-none">↩</span>
          <span className="text-sm font-bold pointer-events-none" style={{ color: '#B45309' }}>
            Drop here
          </span>
          <span className="text-xs pointer-events-none" style={{ color: '#92400E' }}>
            Back to the Balance (empty) list
          </span>
        </div>
      )}

      <div className="no-print">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-xl px-6 h-10 text-sm mb-6 border-foreground text-foreground bg-background hover:bg-secondary"
        >
          ← Back
        </Button>
      </div>

      {totalViolations > 0 && (
        <div className="no-print mb-6 p-4 rounded-2xl border-2" style={{ backgroundColor: '#FEF2F2', borderColor: '#EF4444' }}>
          <p className="font-bold text-sm" style={{ color: '#DC2626' }}>
            ⚠ SEATING VIOLATIONS DETECTED
          </p>
          <p className="text-sm mt-1" style={{ color: '#991B1B' }}>
            {totalViolations} adjacent pair{totalViolations !== 1 ? 's' : ''} share the same exam code across all rooms.
            Cells with violations are highlighted with a red border in the grid below.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {rooms.map((r, i) =>
              violations[i].count === 0 ? null : (
                <span
                  key={r.roomNumber}
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                >
                  Room {roomLabel(r)}: {violations[i].count} violation{violations[i].count !== 1 ? 's' : ''}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {balancePanel}

      <div className="no-print flex flex-wrap gap-2 mb-4 justify-center">
        {rooms.map((r, i) => {
          const bad = violations[i].count > 0;
          return (
            <button
              key={r.roomNumber}
              onClick={() => setCurrent(i)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== `tab-${i}`) setDragOver(`tab-${i}`);
              }}
              onDragLeave={() => setDragOver((k) => (k === `tab-${i}` ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const src = readDrag(e);
                if (src) dropOnRoom(src, i);
              }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all border ${
                i === current
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-foreground border-border hover:border-foreground'
              }`}
              style={{
                ...(bad && i !== current ? { borderColor: '#EF4444' } : {}),
                ...(dragOver === `tab-${i}` ? { outline: '3px dashed #1565C0', outlineOffset: 2 } : {}),
              }}
            >
              Room {roomLabel(r)}
              {bad && <span style={{ color: '#EF4444' }}> •</span>}
            </button>
          );
        })}
      </div>

      <div className="no-print mb-6 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Rename room:</span>
        {rooms.map((r) => (
          <div key={r.roomNumber} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">#{r.roomNumber} →</span>
            <input
              type="text"
              value={names[r.roomNumber] ?? ''}
              onChange={(e) => setNames((prev) => ({ ...prev, [r.roomNumber]: e.target.value }))}
              placeholder={String(r.roomNumber)}
              maxLength={20}
              className="px-2 py-1 text-xs border border-border rounded-md bg-background w-24 focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        ))}
      </div>

      <div className="no-print mb-3 p-3 bg-secondary rounded-2xl">
        <div className="flex flex-wrap gap-2">
          {codeCounts.map(([code, count]) => {
            const on = visibleCodes.has(code);
            return (
              <button
                key={code}
                onClick={() => toggleCode(code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
                style={{
                  border: on ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  background: on ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <span
                  className="inline-block rounded-full flex-shrink-0"
                  style={{ width: 10, height: 10, background: on ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                />
                {code}
                <span style={{ fontSize: 11, color: on ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="no-print flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisibleCodes(new Set(codeCounts.map(([c]) => c)))}
          className="text-xs rounded-md"
        >
          Fill All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisibleCodes(new Set())}
          className="text-xs rounded-md border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          Clear
        </Button>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: '#2E7D32' }} />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {revealed} / {totalSeated} — {pct}%
        </span>
      </div>

      <div className="no-print">
        <h3 className="text-xl font-bold text-center mb-4">
          Room {roomLabel(room)}
          {room.isGeneral && (
            <span
              className="text-xs font-semibold ml-2 px-2 py-0.5 rounded-full"
              style={{ background: 'hsl(45, 100%, 90%)', color: 'hsl(35, 80%, 35%)' }}
            >
              GENERAL
            </span>
          )}
          <span className="text-sm font-normal text-muted-foreground ml-2">({room.students.length} students)</span>
          {roomViolations > 0 && (
            <span className="text-sm font-semibold ml-2" style={{ color: '#EF4444' }}>
              — {roomViolations} violation{roomViolations !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="overflow-x-auto pb-4">{renderGrid(room, current)}</div>
        <p className="text-center text-xs text-muted-foreground">
          Drag a student onto an empty seat to move, onto another student to swap, onto a room tab to send them there,
          or onto the Balance list to unseat. Use ← → arrow keys to switch rooms.
        </p>
      </div>

      <div className="no-print mt-8 flex flex-wrap gap-3 justify-center">
        <Button onClick={() => print('single')} variant="outline" className="px-8 h-12 text-base rounded-xl">
          Print This Room
        </Button>
        <Button onClick={() => print('all')} className="px-12 h-12 text-base rounded-xl">
          Print All Rooms
        </Button>
        <button
          onClick={publish}
          disabled={publishing || published}
          className="px-6 h-12 rounded-xl text-white text-[15px] font-medium disabled:cursor-default"
          style={{ background: published ? '#2E7D32' : '#1565C0' }}
          title={supabase ? undefined : 'Supabase is not configured — publishing to this browser only'}
        >
          {publishing ? 'Publishing...' : published ? '✓ Published to Students' : '📤 Publish to Students'}
        </button>
        {published && (
          <Button variant="outline" onClick={() => setShowQr(true)} className="px-6 h-12 text-base rounded-xl">
            Show QR
          </Button>
        )}
      </div>

      {showQr && published && (
        <div className="no-print fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-semibold mb-1">Published Successfully</h2>
            <p className="text-[13px] text-neutral-500 mb-5">
              {publishedCount} students · {rooms.length} rooms
            </p>
            {!supabase && (
              <p className="text-xs mb-4 p-2 rounded-md" style={{ background: '#FFFBEB', color: '#92400E' }}>
                Supabase isn't configured, so this session is saved in this browser only. Add your keys to .env so
                students can look up seats from their phones.
              </p>
            )}
            <div className="inline-block p-3 border border-neutral-200 rounded-lg mb-4 bg-white">
              <QRCodeSVG value={studentLink} size={180} level="H" />
            </div>
            <p className="text-[11px] text-neutral-500 mb-4 break-all">{studentLink}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => navigator.clipboard.writeText(studentLink)}
                className="flex-1 p-2.5 rounded-md border border-neutral-300 bg-white text-[13px]"
              >
                Copy Link
              </button>
              <button onClick={() => setShowQr(false)} className="flex-1 p-2.5 rounded-md bg-neutral-900 text-white text-[13px]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="print-area" className="hidden print:block">
        {(printMode === 'single' ? [room] : rooms).map((r, i, list) => (
          <div key={r.roomNumber} className={i === list.length - 1 ? '' : 'page-break'}>
            <PrintSheet room={r} roomLabel={roomLabel(r)} />
          </div>
        ))}
      </div>
    </div>
  );
}
