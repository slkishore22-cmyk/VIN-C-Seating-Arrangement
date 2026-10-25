import type { Room, RoomConfig, Seat, SeatPattern, SeatSpacing, Student } from '@/lib/types';

/**
 * Seat groups. No two horizontally or vertically adjacent seats share a group, and each group
 * of a room holds one block of students with the same degree and subject.
 *  - criss-cross: within each main column, seats go A/C/B on even rows and B/D/A on odd rows.
 *    A 5 × 9 room (3 × 3) gets groups of 15 / 15 / 9 / 6.
 *  - rotate: three groups shifting one seat right every row (A B C / B C A / C A B …), so every
 *    bench seats three subjects. A 7 × 6 room (2 × 3) gets three groups of 14.
 *
 * A seating arrangement (spacing) replaces the pattern. Group A holds one degree + subject and the
 * other groups fill the seats around it with other subjects. The same subject may sit one behind
 * another, never side by side.
 *  - one-line: edge seats of every bench A, middle seats B (A B A).
 *  - gap: even rows A B A, odd rows B C B.
 *  - cross: A zigzags between the bench edges (left on even rows, right on odd rows), B takes
 *    the opposite edge and C / D the middle seat one gap one (C even rows, D odd rows).
 *    15 / 15 / 9 / 6 in a 5 × 9 room:
 *      1 C B
 *      B D 2
 *      3 C B
 */
export type SeatGroup = 'A' | 'B' | 'C' | 'D';
const GROUPS: SeatGroup[] = ['A', 'B', 'C', 'D'];

export function seatGroup(
  row: number,
  col: number,
  seatsPerColumn: number,
  pattern: SeatPattern = 'criss-cross',
  spacing?: SeatSpacing,
): SeatGroup {
  const edge = (col % seatsPerColumn) % 2 === 0;
  if (spacing === 'one-line') return edge ? 'A' : 'B';
  if (spacing === 'gap') return row % 2 === 0 ? (edge ? 'A' : 'B') : edge ? 'B' : 'C';
  if (spacing === 'cross') {
    const pos = col % seatsPerColumn;
    if (pos === (row % 2 === 0 ? 0 : seatsPerColumn - 1)) return 'A';
    if (pos === 0 || pos === seatsPerColumn - 1) return 'B';
    return row % 2 === 0 ? 'C' : 'D';
  }
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

/** One line / one gap one: rolls run down one seat column (1, 2, 3 down A) before the next. */
const columnComparator = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  a.col - b.col || a.row - b.row;

export const normDept = (d: string) =>
  d
    .toUpperCase()
    .replace(/[\s.]+/g, '')
    .trim();

function buildSlots(
  rows: number,
  mainColumns: number,
  spc: number,
  pattern?: SeatPattern,
  spacing?: SeatSpacing,
): SlotMap {
  const slots: SlotMap = { A: [], B: [], C: [], D: [] };
  const cols = mainColumns * spc;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const group = seatGroup(r, c, spc, pattern, spacing);
      slots[group].push({ row: r, col: c, group });
    }
  // Cross zigzags down each bench (1 left, 2 right, 3 left …); the others run down one seat column.
  const order = spacing && spacing !== 'cross' ? columnComparator : slotComparator(spc);
  for (const g of GROUPS) slots[g].sort(order);
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
    spacing: config.spacing,
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
  const slots = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern, config.spacing);
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

/**
 * Block sizes the allocation actually uses: only the main group for criss-cross (15 in 5 × 9),
 * every group for rotate (14 in 7 × 6).
 */
export const allocationBlockSizes = (config: RoomConfig) =>
  config.pattern === 'rotate' || config.spacing === 'one-line' || config.spacing === 'gap'
    ? blockSizes(config)
    : config.spacing === 'cross'
      ? blockSizes(config)
      : blockSizes(config).slice(0, 1);

export function allocateSeating(all: Student[], config: RoomConfig): AllocationResult {
  const general = all.filter((s) => s.isGeneral);
  const normal = all.filter((s) => !s.isGeneral);
  const generalRooms = allocateGeneral(general, 1);
  const firstRoomNo = generalRooms.length + 1;

  // 42 (rotate) and 45 (criss-cross) follow separate rules; seating arrangements fill every seat.
  const { rooms, balance } =
    config.spacing === 'cross'
      ? allocateCross(normal, config, firstRoomNo)
      : config.spacing
        ? allocateSpaced(normal, config, firstRoomNo)
        : config.pattern === 'rotate'
          ? allocateRoomByRoom(normal, config, firstRoomNo)
          : allocateMainBlocks(normal, config, firstRoomNo);

  balance.sort(
    (a, b) => a.examCode.localeCompare(b.examCode) || a.department.localeCompare(b.department) || compareRolls(a, b),
  );

  const placed =
    rooms.reduce((n, r) => n + r.students.length, 0) + generalRooms.reduce((n, r) => n + r.students.length, 0);
  if (placed + balance.length !== all.length)
    console.warn(`[seating] Mismatch: ${all.length} students vs ${placed} seated + ${balance.length} balance.`);

  return { rooms: [...generalRooms, ...rooms], balance };
}

/**
 * Criss-cross (45 = 5 × 9): each degree + subject is cut into blocks of the main group size only
 * (15), e.g. 50 → 15 × 3 + 5 balance, 29 → 15 + 14 balance. Each block takes one whole seat group;
 * an exam code takes at most one group per room. The highest-count subject goes first.
 */
function allocateMainBlocks(normal: Student[], config: RoomConfig, firstRoomNo: number): AllocationResult {
  const [size] = blockSizes(config);

  const groups = new Map<string, Student[]>();
  for (const s of normal) {
    const key = `${s.examCode}|${normDept(s.department)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const codeTotals = new Map<string, number>();
  for (const s of normal) codeTotals.set(s.examCode, (codeTotals.get(s.examCode) ?? 0) + 1);

  type Block = { examCode: string; codeTotal: number; groupSize: number; seq: number; students: Student[] };
  const blocks: Block[] = [];
  const balance: Student[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort(compareRolls);
    let i = 0;
    for (; i + size <= sorted.length; i += size)
      blocks.push({
        examCode: sorted[0].examCode,
        codeTotal: codeTotals.get(sorted[0].examCode)!,
        groupSize: sorted.length,
        seq: i,
        students: sorted.slice(i, i + size),
      });
    balance.push(...sorted.slice(i));
  }
  // Highest-count subject first, so it takes the first rooms; within a subject, larger degree first.
  blocks.sort(
    (a, b) =>
      b.codeTotal - a.codeTotal ||
      a.examCode.localeCompare(b.examCode) ||
      b.groupSize - a.groupSize ||
      a.students[0].department.localeCompare(b.students[0].department) ||
      a.seq - b.seq,
  );

  const rooms: Room[] = [];
  const slots: SlotMap[] = [];
  const roomCodes: Set<string>[] = [];
  let free: { roomIdx: number; group: SeatGroup; cap: number }[] = [];

  const addRoom = () => {
    const idx = rooms.length;
    rooms.push(createEmptyRoom(firstRoomNo + idx, config));
    const sl = buildSlots(
      rooms[idx].grid.length,
      config.mainColumns,
      config.seatsPerColumn,
      config.pattern,
      config.spacing,
    );
    slots.push(sl);
    roomCodes.push(new Set());
    for (const g of GROUPS) if (sl[g].length > 0) free.push({ roomIdx: idx, group: g, cap: sl[g].length });
  };

  for (const block of blocks) {
    const n = block.students.length;
    let pick: (typeof free)[number] | undefined;
    for (;;) {
      const fits = free.filter((f) => f.cap >= n && !roomCodes[f.roomIdx].has(block.examCode));
      pick = fits.find((f) => f.cap === n) ?? fits.sort((a, b) => a.cap - b.cap || a.roomIdx - b.roomIdx)[0];
      if (pick) break;
      addRoom();
    }
    const target = rooms[pick.roomIdx];
    slots[pick.roomIdx][pick.group].slice(0, n).forEach((slot, i) => {
      target.grid[slot.row][slot.col] = block.students[i];
    });
    roomCodes[pick.roomIdx].add(block.examCode);
    free = free.filter((f) => f !== pick);
  }
  rooms.forEach(refreshStudents);
  return { rooms, balance };
}

/**
 * Rotate (42 = 7 × 6): room by room, each of the three 14-seat groups takes a 14-block from the
 * degree + subject with the most students left, three different subjects per room. Remainders
 * smaller than 14 go to balance.
 */
function allocateRoomByRoom(normal: Student[], config: RoomConfig, firstRoomNo: number): AllocationResult {
  const queues = new Map<string, { examCode: string; students: Student[] }>();
  for (const s of normal) {
    const key = `${s.examCode}|${normDept(s.department)}`;
    if (!queues.has(key)) queues.set(key, { examCode: s.examCode, students: [] });
    queues.get(key)!.students.push(s);
  }
  const pending = Array.from(queues.values());
  for (const q of pending) q.students.sort(compareRolls);

  const proto = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern, config.spacing);
  const groupOrder = GROUPS.filter((g) => proto[g].length > 0).sort((a, b) => proto[b].length - proto[a].length);
  const minBlock = Math.min(...groupOrder.map((g) => proto[g].length));

  /** Queue with the most students left that satisfies `ok`; ties by exam code. */
  const largest = (ok: (q: (typeof pending)[number]) => boolean) =>
    pending.filter(ok).sort((a, b) => b.students.length - a.students.length || a.examCode.localeCompare(b.examCode))[0];

  const rooms: Room[] = [];
  while (pending.some((q) => q.students.length >= minBlock)) {
    const room = createEmptyRoom(firstRoomNo + rooms.length, config);
    const used = new Set<string>();
    for (const g of groupOrder) {
      const size = proto[g].length;
      const q = largest((q) => !used.has(q.examCode) && q.students.length >= size);
      if (!q) continue;
      const block = q.students.splice(0, size);
      proto[g].forEach((slot, i) => {
        room.grid[slot.row][slot.col] = block[i];
      });
      used.add(q.examCode);
    }
    refreshStudents(room);
    if (room.students.length === 0) break;
    rooms.push(room);
  }
  return { rooms, balance: pending.flatMap((q) => q.students) };
}

/**
 * Seating arrangements (one line / one gap one / cross): room by room, every seat group is poured
 * full from the degree + subject with the most students left. A group may take several subjects
 * one after another (its seats are never side by side), but a subject in one group of a room is
 * kept out of the other groups, so neighbours on a bench always differ. Nothing goes to balance;
 * seats stay empty only when no other subject is left to sit beside the last one.
 */
/**
 * Cross: subjects in order of size, highest first. Each is cut into blocks that fill one seat
 * group, taken by the first room without that subject: zigzag (15), opposite zigzag (15), then the
 * middle one gap one (9, then 6). So the first subject takes the zigzags of rooms 1, 2, 3 …, the
 * second the opposite zigzags, the third and fourth the middles. What can't fill a whole group goes
 * to balance.
 */
function allocateCross(normal: Student[], config: RoomConfig, firstRoomNo: number): AllocationResult {
  const groups = new Map<string, Student[]>();
  for (const s of normal) {
    const key = `${s.examCode}|${normDept(s.department)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const codeTotals = new Map<string, number>();
  for (const s of normal) codeTotals.set(s.examCode, (codeTotals.get(s.examCode) ?? 0) + 1);
  // Highest-count subject first; within a subject, larger degree first.
  const queues = Array.from(groups.values())
    .map((list) => [...list].sort(compareRolls))
    .sort(
      (a, b) =>
        codeTotals.get(b[0].examCode)! - codeTotals.get(a[0].examCode)! ||
        a[0].examCode.localeCompare(b[0].examCode) ||
        b.length - a.length ||
        a[0].department.localeCompare(b[0].department),
    );

  const proto = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern, config.spacing);
  const fillGroups = GROUPS.filter((g) => proto[g].length > 0);
  const mainSize = proto.A.length;

  const rooms: Room[] = [];
  const roomCodes: Set<string>[] = [];
  const free: { roomIdx: number; group: SeatGroup }[] = [];
  const addRoom = () => {
    rooms.push(createEmptyRoom(firstRoomNo + rooms.length, config));
    roomCodes.push(new Set());
    for (const g of fillGroups) free.push({ roomIdx: rooms.length - 1, group: g });
  };

  const balance: Student[] = [];
  for (const list of queues) {
    const code = list[0].examCode;
    let i = 0;
    for (;;) {
      const left = list.length - i;
      // First room (then zigzag, opposite zigzag, middle) without this subject whose group it can fill.
      let idx = free.findIndex((f) => !roomCodes[f.roomIdx].has(code) && proto[f.group].length <= left);
      if (idx < 0 && left >= mainSize) {
        addRoom();
        idx = free.length - fillGroups.length;
      }
      if (idx < 0) break;
      const { roomIdx, group } = free[idx];
      const slots = proto[group];
      slots.forEach((slot, k) => (rooms[roomIdx].grid[slot.row][slot.col] = list[i + k]));
      i += slots.length;
      roomCodes[roomIdx].add(code);
      free.splice(idx, 1);
    }
    balance.push(...list.slice(i));
  }
  rooms.forEach(refreshStudents);
  return { rooms, balance };
}

function allocateSpaced(normal: Student[], config: RoomConfig, firstRoomNo: number): AllocationResult {
  const queues = new Map<string, { examCode: string; students: Student[] }>();
  for (const s of normal) {
    const key = `${s.examCode}|${normDept(s.department)}`;
    if (!queues.has(key)) queues.set(key, { examCode: s.examCode, students: [] });
    queues.get(key)!.students.push(s);
  }
  const pending = Array.from(queues.values());
  for (const q of pending) q.students.sort(compareRolls);

  const proto = buildSlots(roomRows(config), config.mainColumns, config.seatsPerColumn, config.pattern, config.spacing);
  // Main seats (A) first, then the gap groups, largest first.
  const groupOrder = GROUPS.filter((g) => proto[g].length > 0).sort(
    (a, b) => Number(b === 'A') - Number(a === 'A') || proto[b].length - proto[a].length,
  );

  const rooms: Room[] = [];
  while (pending.some((q) => q.students.length > 0)) {
    const room = createEmptyRoom(firstRoomNo + rooms.length, config);
    const codes = new Map<SeatGroup, Set<string>>(groupOrder.map((g) => [g, new Set()]));
    const filled = new Map<SeatGroup, number>(groupOrder.map((g) => [g, 0]));
    const usable = (g: SeatGroup, code: string) => groupOrder.every((o) => o === g || !codes.get(o)!.has(code));

    const pour = (g: SeatGroup) => {
      const q = pending
        .filter((q) => q.students.length > 0 && usable(g, q.examCode))
        .sort((a, b) => b.students.length - a.students.length || a.examCode.localeCompare(b.examCode))[0];
      if (!q) return false;
      const slots = proto[g].slice(filled.get(g)!);
      const block = q.students.splice(0, slots.length);
      block.forEach((s, i) => (room.grid[slots[i].row][slots[i].col] = s));
      filled.set(g, filled.get(g)! + block.length);
      codes.get(g)!.add(q.examCode);
      return true;
    };

    // One subject per group first, so each gap group gets its own subject; then top groups up.
    for (const g of groupOrder) pour(g);
    for (const g of groupOrder) while (filled.get(g)! < proto[g].length && pour(g));

    refreshStudents(room);
    if (room.students.length === 0) break;
    rooms.push(room);
  }
  return { rooms, balance: pending.flatMap((q) => q.students) };
}

/**
 * Same-exam-code neighbours (right or below), ignoring general rooms. With a seating arrangement
 * the same subject may sit one behind another, so only side-by-side seats on one bench count.
 */
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
      for (const [dr, dc] of room.spacing
        ? [[0, 1]]
        : [
            [0, 1],
            [1, 0],
          ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (room.spacing && Math.floor(nc / room.seatsPerColumn) !== Math.floor(c / room.seatsPerColumn)) continue;
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
    (room.spacing
      ? [
          [r, c - 1],
          [r, c + 1],
        ].filter(([, nc]) => Math.floor(nc / room.seatsPerColumn) === Math.floor(c / room.seatsPerColumn))
      : [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ]
    )
      .map(([nr, nc]) => grid[nr]?.[nc])
      .filter((s): s is Student => !!s);

  // Seats in allocation order: group by group, each in its fill order (zigzag for cross).
  const order: Slot[] = room.isGeneral
    ? grid.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c, group: 'A' as SeatGroup })))
    : (() => {
        const slots = buildSlots(grid.length, room.mainColumns, room.seatsPerColumn, room.pattern, room.spacing);
        return GROUPS.flatMap((g) => slots[g]);
      })();
  const groupCodes = new Map<SeatGroup, Set<string>>(GROUPS.map((g) => [g, new Set()]));
  for (const slot of order) {
    const s = grid[slot.row][slot.col];
    if (s) groupCodes.get(slot.group)!.add(s.examCode);
  }

  for (const s of students) {
    // Prefer the group already holding this subject, then an empty group, then a group of other
    // subjects. A subject stays in one group per room (so the middle stays one gap one) and never
    // sits beside itself; if no seat allows that it is left for the next room. General rooms
    // fall back to the first free seat.
    const elsewhere = GROUPS.some((g) => groupCodes.get(g)!.has(s.examCode));
    let best: Slot | null = null;
    let bestRank = Infinity;
    for (const slot of order) {
      if (grid[slot.row][slot.col]) continue;
      const codes = groupCodes.get(slot.group)!;
      const blocked =
        neighbours(slot.row, slot.col).some((n) => n.examCode === s.examCode) || (elsewhere && !codes.has(s.examCode));
      if (blocked && !room.isGeneral) continue;
      const rank = blocked ? 3 : codes.has(s.examCode) ? 0 : codes.size === 0 ? 1 : 2;
      if (rank < bestRank) {
        best = slot;
        bestRank = rank;
        if (rank === 0) break;
      }
    }
    if (best) {
      grid[best.row][best.col] = s;
      groupCodes.get(best.group)!.add(s.examCode);
    } else unplaced.push(s);
  }

  const updated = { ...room, grid };
  refreshStudents(updated);
  return { room: updated, unplaced };
}
