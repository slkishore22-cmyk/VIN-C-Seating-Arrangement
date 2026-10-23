import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ExtractedRoll, PdfResult, Student } from '@/lib/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Items whose baselines are within this many points belong to the same text line. */
const LINE_TOLERANCE = 3;

/**
 * Groups a page's text items into lines, top to bottom, left to right. Items are clustered by
 * baseline with a small tolerance, so cells of one table row in different fonts stay together.
 */
function toLines(items: { x: number; y: number; text: string }[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: { y: number; cells: { x: number; text: string }[] }[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= LINE_TOLERANCE) last.cells.push(item);
    else lines.push({ y: item.y, cells: [item] });
  }
  return lines.map((l) =>
    l.cells
      .sort((a, b) => a.x - b.x)
      .map((c) => c.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Plain table rows: "<subject code> <roll number> <department>", e.g.
 * "120E1B 26H001 BCA - 1 year" or "PG - A 26CS001 MSC CS - 1 year".
 * Roll numbers look like 26H001, 26AI001, 26DS001, 24G049.
 */
const TABLE_ROW = /^(.+?)\s+(\d{2}[A-Z]{1,4}\d{2,4})\s+(.+)$/i;

/**
 * Reads a roll-list PDF in either of two layouts:
 *  - University nominal roll: page headers like "Degree : B.COM. Subject : 21UCO05-..." and
 *    rows "<S.No> <RollNumber> <Name>".
 *  - Simple table: "subject code | roll number | department" on every row (pages without a
 *    "Degree :" header are read this way).
 */
export async function extractRollNumbers(
  file: File,
  onProgress: (page: number, total: number, fileName: string) => void,
): Promise<PdfResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const rolls: ExtractedRoll[] = [];
  let declared: number | null = null;
  let dept = 'UNKNOWN';
  let examCode = 'UNKNOWN';

  for (let p = 1; p <= doc.numPages; p++) {
    onProgress(p, doc.numPages, file.name);
    const content = await (await doc.getPage(p)).getTextContent();

    const items: { x: number; y: number; text: string }[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const t = item as TextItem;
      if (!t.str.trim()) continue;
      items.push({ x: t.transform[4], y: t.transform[5], text: t.str.trim() });
    }
    const lines = toLines(items);
    const page = lines.join(' ');

    if (!/Degree\s*[:-]/i.test(page)) {
      for (const line of lines) {
        const m = line.match(TABLE_ROW);
        if (!m || /roll\s*n(o|umber)/i.test(line)) continue;
        rolls.push({
          roll: m[2].toUpperCase(),
          examCode: m[1].replace(/\s+/g, '').toUpperCase(),
          dept: m[3].replace(/\s+/g, ' ').trim().toUpperCase(),
        });
      }
      continue;
    }

    const degree = page.match(/Degree\s*[:-]\s*([A-Z][A-Z0-9.()[\]/\s]{1,20}?)\s+Subject/i);
    if (degree) dept = degree[1].trim().replace(/\s+/g, ' ').toUpperCase();
    const subject = page.match(/Subject\s*[:-]\s*([A-Z0-9]{3,8})-/i);
    if (subject) examCode = subject[1].trim().toUpperCase();

    if (/Page\s*No\s*[:-]?\s*1\b/.test(page)) {
      const count = page.match(/No\s+of\s+Candidates\s*[:-]?\s*(\d+)/i);
      if (count) declared = (declared ?? 0) + parseInt(count[1], 10);
    }

    for (const line of lines) {
      const m = line.match(/^(\d{1,3})\s+([A-Z]{0,3}\d{5,9})\s+[A-Z]/);
      if (m) rolls.push({ roll: m[2], dept, examCode });
    }
  }

  const seen = new Set<string>();
  const unique = rolls.filter((r) => !seen.has(r.roll) && seen.add(r.roll));
  return { fileName: file.name, declaredCount: declared, extractedCount: unique.length, rollNumbers: unique };
}

export interface DuplicateRoll {
  roll: string;
  /** Every PDF entry for this roll; the first one is the entry that was kept. */
  entries: { fileName: string; examCode: string; dept: string }[];
}

/** Roll numbers found in more than one PDF. mergeStudents keeps only the first entry of each. */
export function findDuplicates(results: PdfResult[]): DuplicateRoll[] {
  const map = new Map<string, DuplicateRoll['entries']>();
  for (const r of results)
    for (const s of r.rollNumbers) {
      if (!map.has(s.roll)) map.set(s.roll, []);
      map.get(s.roll)!.push({ fileName: r.fileName, examCode: s.examCode, dept: s.dept });
    }
  return Array.from(map.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([roll, entries]) => ({ roll, entries }));
}

export function mergeStudents(results: PdfResult[]): Student[] {
  const seen = new Set<string>();
  const students: Student[] = [];
  for (const r of results)
    for (const s of r.rollNumbers) {
      if (seen.has(s.roll)) continue;
      seen.add(s.roll);
      students.push({ rollNumber: s.roll, department: s.dept, examCode: s.examCode, sourcePdf: r.fileName });
    }
  return students;
}
