import type { Room, RoomConfig, Seat, SeatPattern, Student } from '@/lib/types';

/**
 * Seat groups. No two horizontally or vertically adjacent seats share a group, and each group
 * of a room holds one block of students with the same degree and subject.
 *  - criss-cross: within each main column, seats go A/C/B on even rows and B/D/A on odd rows.
 *    A 5 × 9 room (3 × 3) gets groups of 15 / 15 / 9 / 6.
 *  - rotate: three groups shifting one seat right every row (A B C / B C A / C A B …), so every
 *    bench seats three subjects. A 7 × 6 room (2 × 3) gets three groups of 14.
 */
export type SeatGroup = 'A' | 'B' | 'C' | 'D';
const GROUPS: SeatGroup[] = ['A', 'B', 'C', 'D'];

export function seatGroup(
  row: number,
  col: number,
  seatsPerColumn: number,
  pattern: SeatPattern = 'criss-cross',
): SeatGroup {
  if (pattern === 'rotate') return (['A', 'B', 'C'] as const)[(row + col) % 3];
  const pos = col % seatsPerColumn;
  return row % 2 === 0 ? (['A', 'C', 'B'] as const)[pos % 3] : (['B', 'D', 'A'] as const)[pos % 3];
}

interface Slot {
  row: number;
  col: number;
  group: SeatGroup;
}
type SlotMap = Record<SeatGroup, Slot[]>;

/**
 * Fill order: down each main column (top row to bottom row), then the next main column.
 * Students are poured in roll-number order, so within each subject the rolls run
 * 1, 2, 3, 4, 5 down the first main column, then 6 … 10 down the next.
 */
const slotComparator = (spc: number) => (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.floor(a.col / spc) - Math.floor(b.col / spc) || a.row - b.row || (a.col % spc) - (b.col % spc);

export const normDept = (d: string) => d.toUpperCase().replace(/[\s.]+/g, '').trim();

function buildSlots(rows: number, mainColumns: number, spc: number, pattern?: SeatPattern): SlotMap {
  const slots: SlotMap = { A: [], B: [], C: [], D: [] };
  const cols = mainColumns * spc;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const group = seatGroup(r, c, spc, pattern);
      slots[group].push({ row: r, col: c, group });
    }
  for (const g of GROUPS) slots[g].sort(slotComparator(spc));
  return slots;
}

const rollNum = (roll: string) => parseInt(roll.replace(/\D/g, ''), 10);

export function compareRolls(a: Student, b: Student) {
  const na = rollNum(a.rollNumber);
  const nb = rollNum(b.rollNumber);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.rollNumber.localeCompare(b.rollNumber);
}

const emptyGrid = (rows: number, cols: number): Seat[][] =>
  Array.from({ length: rows }, () => Array<Seat>(cols).fill(null));

function refreshStudents(room: Room) {
  const list: Student[] = [];
  for (const row of room.grid) for (const s of row) if (s) list.push(s);
  room.students = list;
}

const roomRows = (config: RoomConfig) =>
  Math.ceil(config.studentsPerRoom / (config.mainColumns * config.seatsPerColumn));

export function createEmptyRoom(roomNumber: number, config: RoomConfig): Room {
  const rows = roomRows(config);
  const cols = config.mainColumns * config.seatsPerColumn;
  return {
    roomNumber,
    pattern: config.pattern,
    students: [],
    grid: emptyGrid(rows, cols),
    totalRows: rows,
    seatsPerRow: cols,
    mainColumns: config.mainColumns,
    seatsPerColumn: config.seatsPerColumn,
  };
}

/** Distinct seat-group sizes of a room, largest first: [15, 9, 6] for 5 × 9 criss-cross, [14] for 7 × 6 rotate. */
export function blockSizes(config: RoomConfig): number[] {
  const slots = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern);
  const sizes = new Set(GROUPS.map((g) => slots[g].length).filter((n) => n > 0));
  return Array.from(sizes).sort((a, b) => b - a);
}


// General-exam rooms: fixed 5 rows × 3 main columns × 2 seats = 30 seats.
const GEN_ROWS = 5;
const GEN_MAIN_COLS = 3;
const GEN_SPC = 2;

/** Left seat of each bench gets the first half of the roll list, right seat the second half. */
function allocateGeneral(students: Student[], startRoom: number): Room[] {
  const sorted = [...students].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
  const cols = GEN_MAIN_COLS * GEN_SPC;
  const perSide = GEN_ROWS * GEN_MAIN_COLS;
  const half = Math.ceil(sorted.length / 2);

  const byDept = (list: Student[]) => {
    const map = new Map<string, Student[]>();
    for (const s of list) {
      const d = s.department.trim().toUpperCase();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return Array.from(map.values());
  };
  const chunk = (groups: Student[][]) => {
    const out: Student[][] = [];
    for (const g of groups) for (let i = 0; i < g.length; i += perSide) out.push(g.slice(i, i + perSide));
    return out;
  };

  const left = chunk(byDept(sorted.slice(0, half)));
  const right = chunk(byDept(sorted.slice(half)));
  const count = Math.max(left.length, right.length);
  const rooms: Room[] = [];

  for (let i = 0; i < count; i++) {
    const grid = emptyGrid(GEN_ROWS, cols);
    const l = left[i] ?? [];
    const r = right[i] ?? [];
    let li = 0;
    let ri = 0;
    for (let row = 0; row < GEN_ROWS; row++)
      for (let mc = 0; mc < GEN_MAIN_COLS; mc++) {
        const seat = mc * GEN_SPC;
        if (li < l.length) grid[row][seat] = l[li++];
        if (ri < r.length) grid[row][seat + 1] = r[ri++];
      }
    rooms.push({
      roomNumber: startRoom + i,
      students: [...l, ...r],
      grid,
      totalRows: GEN_ROWS,
      seatsPerRow: cols,
      isGeneral: true,
      mainColumns: GEN_MAIN_COLS,
      seatsPerColumn: GEN_SPC,
    });
  }
  return rooms;
}

export interface AllocationResult {
  rooms: Room[];
  /** Leftovers smaller than the smallest block, kept out of the rooms for manual placement. */
  balance: Student[];
}

export function allocateSeating(all: Student[], config: RoomConfig): AllocationResult {
  const general = all.filter((s) => s.isGeneral);
  const normal = all.filter((s) => !s.isGeneral);
  const generalRooms = allocateGeneral(general, 1);
  const firstRoomNo = generalRooms.length + 1;

  // One queue per degree + subject, rolls ascending.
  const queues = new Map<string, { examCode: string; students: Student[] }>();
  for (const s of normal) {
    const key = `${s.examCode}|${normDept(s.department)}`;
    if (!queues.has(key)) queues.set(key, { examCode: s.examCode, students: [] });
    queues.get(key)!.students.push(s);
  }
  const pending = Array.from(queues.values());
  for (const q of pending) q.students.sort(compareRolls);

  const proto = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern);
  // Big groups first (the 15-seat main-column groups in 5 × 9), then the middle-column groups.
  const groupOrder = GROUPS.filter((g) => proto[g].length > 0).sort((a, b) => proto[b].length - proto[a].length);
  /** Below this, a degree + subject remainder is too small for any group and goes to balance. */
  const minBlock = Math.min(...groupOrder.map((g) => proto[g].length));

  /** Queue with the most students left that satisfies `ok`; ties by exam code. */
  const largest = (ok: (q: (typeof pending)[number]) => boolean) =>
    pending
      .filter(ok)
      .sort((a, b) => b.students.length - a.students.length || a.examCode.localeCompare(b.examCode))[0];

  // Room by room, every seat group is filled with a block cut from one degree + subject, so each
  // bench gets its full set of students. The subject with the most students left goes first.
  // An exam code takes only one group per room, so front/back and side-by-side seats never share
  // a subject. A group takes a full-size block when some subject still has that many students;
  // otherwise the largest remainder that is at least the smallest group size.
  const rooms: Room[] = [];
  while (pending.some((q) => q.students.length >= minBlock)) {
    const room = createEmptyRoom(firstRoomNo + rooms.length, config);
    const used = new Set<string>();
    for (const g of groupOrder) {
      const size = proto[g].length;
      const q =
        largest((q) => !used.has(q.examCode) && q.students.length >= size) ??
        largest((q) => !used.has(q.examCode) && q.students.length >= minBlock);
      if (!q) continue;
      const block = q.students.splice(0, size);
      proto[g].forEach((slot, i) => {
        if (i < block.length) room.grid[slot.row][slot.col] = block[i];
      });
      used.add(q.examCode);
    }
    refreshStudents(room);
    if (room.students.length === 0) break;
    rooms.push(room);
  }

  const balance = pending.flatMap((q) => q.students);

  balance.sort(
    (a, b) => a.examCode.localeCompare(b.examCode) || a.department.localeCompare(b.department) || compareRolls(a, b),
  );

  const placed = rooms.reduce((n, r) => n + r.students.length, 0) + generalRooms.reduce((n, r) => n + r.students.length, 0);
  if (placed + balance.length !== all.length)
    console.warn(`[seating] Mismatch: ${all.length} students vs ${placed} seated + ${balance.length} balance.`);

  return { rooms: [...generalRooms, ...rooms], balance };
}

/** Same-exam-code neighbours (right or below), ignoring general rooms. */
export function findViolations(room: Room) {
  const cells = new Set<string>();
  let count = 0;
  if (room.isGeneral) return { count, cells };
  const rows = room.grid.length;
  const cols = room.grid[0]?.length ?? 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const s = room.grid[r][c];
      if (!s) continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < rows && nc < cols && room.grid[nr][nc]?.examCode === s.examCode) {
          cells.add(`${r}-${c}`);
          cells.add(`${nr}-${nc}`);
          count++;
        }
      }
    }
  return { count, cells };
}

/**
 * Puts manually chosen balance students into a room's empty seats, preferring seats with
 * no same-subject neighbour. Returns the updated room and anyone who didn't fit.
 */
export function placeInRoom(room: Room, students: Student[]): { room: Room; unplaced: Student[] } {
  const grid = room.grid.map((row) => [...row]);
  const unplaced: Student[] = [];
  const neighbours = (r: number, c: number) =>
    [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]
      .map(([nr, nc]) => grid[nr]?.[nc])
      .filter((s): s is Student => !!s);

  for (const s of students) {
    let fallback: [number, number] | null = null;
    let chosen: [number, number] | null = null;
    for (let r = 0; r < grid.length && !chosen; r++)
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]) continue;
        fallback ??= [r, c];
        if (!neighbours(r, c).some((n) => n.examCode === s.examCode)) {
          chosen = [r, c];
          break;
        }
      }
    const seat = chosen ?? fallback;
    if (seat) grid[seat[0]][seat[1]] = s;
    else unplaced.push(s);
  }

  const updated = { ...room, grid };
  refreshStudents(updated);
  return { room: updated, unplaced };
}
