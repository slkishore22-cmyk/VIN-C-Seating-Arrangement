export interface ExtractedRoll {
  roll: string;
  dept: string;
  examCode: string;
}

export interface PdfResult {
  fileName: string;
  /** "No of Candidates" printed on page 1 of each subject section, or null if not found. */
  declaredCount: number | null;
  extractedCount: number;
  rollNumbers: ExtractedRoll[];
}

export interface Student {
  rollNumber: string;
  department: string;
  examCode: string;
  sourcePdf: string;
  isGeneral?: boolean;
}

export type Seat = Student | null;

/**
 * How seat groups are laid out in a room:
 *  - 'criss-cross': four groups A/C/B · B/D/A (15 / 15 / 9 / 6 in a 5 × 9 room)
 *  - 'rotate': three equal groups, shifting one seat right every row (14 / 14 / 14 in 7 × 6)
 */
export type SeatPattern = 'criss-cross' | 'rotate';

export interface Room {
  roomNumber: number;
  pattern?: SeatPattern;
  students: Student[];
  grid: Seat[][];
  totalRows: number;
  seatsPerRow: number;
  mainColumns: number;
  seatsPerColumn: number;
  isGeneral?: boolean;
}

export interface RoomConfig {
  studentsPerRoom: number;
  mainColumns: number;
  seatsPerColumn: number;
  pattern?: SeatPattern;
}
