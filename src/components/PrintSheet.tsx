import { Fragment, useMemo } from 'react';
import type { Room } from '@/lib/types';

interface SeatInfo {
  seatNumber: number;
  rollNumber: string;
  examCode: string;
  department: string;
}

/** One printable A4 seating matrix for a room. Seat numbers run row by row across the room. */
export default function PrintSheet({ room, roomLabel }: { room: Room; roomLabel: string }) {
  const rows = room.grid.length;
  const spc = room.seatsPerColumn ?? 3;
  const mainCols = room.mainColumns ?? 3;

  const { cellMap, seats } = useMemo(() => {
    const cellMap: Record<string, SeatInfo | null> = {};
    const seats: SeatInfo[] = [];
    let n = 0;
    for (let r = 0; r < rows; r++)
      for (let mc = 0; mc < mainCols; mc++)
        for (let s = 0; s < spc; s++) {
          const student = room.grid[r]?.[mc * spc + s] ?? null;
          const key = `${mc}-${s}-${r}`;
          if (student) {
            const info = { seatNumber: ++n, ...student };
            cellMap[key] = info;
            seats.push(info);
          } else cellMap[key] = null;
        }
    return { cellMap, seats };
  }, [room, rows, mainCols, spc]);

  const summary = useMemo(() => {
    const map = new Map<string, { department: string; examCode: string; count: number }>();
    for (const s of seats) {
      const key = `${s.department}|${s.examCode}`;
      const hit = map.get(key);
      if (hit) hit.count++;
      else map.set(key, { department: s.department, examCode: s.examCode, count: 1 });
    }
    return Array.from(map.values()).sort(
      (a, b) => a.department.localeCompare(b.department) || a.examCode.localeCompare(b.examCode),
    );
  }, [seats]);

  return (
    <div className="print-seating-sheet">
      <div className="ps-header">
        <div className="ps-h1">UNIVERSITY EXAMINATION – APRIL / MAY 2026</div>
        <div className="ps-h2">SEATING MATRIX</div>
        <div className="ps-h3">MAIN BUILDING</div>
      </div>
      <div className="ps-meta">
        <div>DATE: ____________</div>
        <div>SESSION: ________</div>
        <div>ROOM NO: {roomLabel}</div>
      </div>

      <div className="ps-panels">
        {Array.from({ length: mainCols }).map((_, mc) => (
          <table key={mc} className="ps-seat-table">
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: spc }).map((_, s) => {
                    const seat = cellMap[`${mc}-${s}-${r}`];
                    return (
                      <Fragment key={s}>
                        <td className="ps-roll">{seat?.rollNumber ?? ''}</td>
                        <td className="ps-seat">{seat?.seatNumber ?? ''}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <div className="ps-bottom">
        <div className="ps-bottom-left">
          <table className="ps-summary-table">
            <thead>
              <tr>
                <th>DEGREE</th>
                <th>SUB. CODE</th>
                <th>COUNT</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={i}>
                  <td>{row.department}</td>
                  <td>{row.examCode}</td>
                  <td className="ps-num">{row.count}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <strong>TOTAL</strong>
                </td>
                <td className="ps-num">
                  <strong>{seats.length}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="ps-bottom-right">
          <table className="ps-count-table">
            <tbody>
              <tr>
                <td>NO. OF PRESENT</td>
                <td className="ps-blank" />
              </tr>
              <tr>
                <td>NO. OF ABSENT</td>
                <td className="ps-blank" />
              </tr>
              <tr>
                <td>
                  <strong>TOTAL</strong>
                </td>
                <td className="ps-num">
                  <strong>{seats.length}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <table className="ps-malpractice-table">
            <thead>
              <tr>
                <th colSpan={2}>MALPRACTICES DETAILS</th>
              </tr>
              <tr>
                <th>S.NO.</th>
                <th>REGISTER NUMBER</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((n) => (
                <tr key={n}>
                  <td className="ps-num">{n}</td>
                  <td className="ps-blank" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ps-footer">NAME AND SIGN OF INVIGILATOR: ______________________________________</div>
    </div>
  );
}
