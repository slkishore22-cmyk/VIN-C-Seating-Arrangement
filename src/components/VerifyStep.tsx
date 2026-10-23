import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { deptColor, examCodeColor } from '@/lib/colors';
import { findDuplicates } from '@/lib/pdf';
import type { PdfResult, Student } from '@/lib/types';

/** An exam code this large is probably a common paper written by every department. */
const GENERAL_EXAM_THRESHOLD = 500;
const GENERAL_ROOM_SIZE = 30;
/** Main block size of the default 45-seat (5 × 9) layout; used for the strength preview only. */
const BLOCK = 15;

interface Props {
  students: Student[];
  pdfResults: PdfResult[];
  totalPdfs: number;
  onConfirm: (students: Student[]) => void;
  onBack: () => void;
}

export default function VerifyStep({ students: initial, pdfResults, totalPdfs, onConfirm, onBack }: Props) {
  const [students, setStudents] = useState(initial);
  const [manualRoll, setManualRoll] = useState('');
  const [generalCode, setGeneralCode] = useState<string | null>(
    () => initial.find((s) => s.isGeneral)?.examCode ?? null,
  );
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  const totalRolls = useMemo(() => pdfResults.reduce((n, r) => n + r.extractedCount, 0), [pdfResults]);

  const codeSummary = useMemo(() => {
    const map: Record<string, { examCode: string; depts: Record<string, number>; total: number }> = {};
    for (const s of students) {
      map[s.examCode] ||= { examCode: s.examCode, depts: {}, total: 0 };
      map[s.examCode].depts[s.department] = (map[s.examCode].depts[s.department] || 0) + 1;
      map[s.examCode].total++;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [students]);

  const totals = useMemo(() => {
    let blocks = 0;
    let extra = 0;
    for (const code of codeSummary)
      for (const n of Object.values(code.depts)) {
        blocks += Math.floor(n / BLOCK);
        extra += n % BLOCK;
      }
    return { blocks, extra };
  }, [codeSummary]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return students;
    return students.filter(
      (s) => s.rollNumber.includes(q) || s.examCode.includes(q) || s.department.toUpperCase().includes(q),
    );
  }, [students, query]);

  const removeStudent = (roll: string) => setStudents((prev) => prev.filter((x) => x.rollNumber !== roll));

  const candidate = codeSummary[0] && codeSummary[0].total >= GENERAL_EXAM_THRESHOLD ? codeSummary[0] : null;
  const askGeneral = candidate && candidate.examCode !== generalCode && candidate.examCode !== dismissedCode;
  const generalCount = students.filter((s) => s.isGeneral).length;

  const duplicates = useMemo(() => findDuplicates(pdfResults), [pdfResults]);
  /** Same roll listed under different subjects: only the first subject gets seated. */
  const subjectClashes = duplicates.filter((d) => new Set(d.entries.map((e) => e.examCode)).size > 1);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const mismatches = useMemo(
    () => pdfResults.filter((r) => r.declaredCount !== null && r.declaredCount !== r.extractedCount),
    [pdfResults],
  );

  const markGeneral = (code: string) => {
    setGeneralCode(code);
    setStudents((prev) => prev.map((s) => ({ ...s, isGeneral: s.examCode === code })));
  };
  const undoGeneral = () => {
    setGeneralCode(null);
    setStudents((prev) => prev.map((s) => ({ ...s, isGeneral: false })));
  };

  const addManual = () => {
    const roll = manualRoll.trim().toUpperCase();
    if (!roll || students.some((s) => s.rollNumber === roll)) return;
    setStudents((prev) => [...prev, { rollNumber: roll, department: 'UNKNOWN', examCode: 'UNKNOWN', sourcePdf: 'Manual' }]);
    setManualRoll('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <Button
        variant="outline"
        onClick={onBack}
        className="rounded-xl px-6 h-10 text-sm mb-6 border-foreground text-foreground bg-background hover:bg-secondary"
      >
        ← Back
      </Button>

      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
        {[
          { label: 'Total PDFs', value: totalPdfs },
          { label: 'Total Roll Numbers', value: totalRolls },
          { label: 'Unique Students', value: students.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-secondary rounded-2xl p-4 sm:p-6 text-center">
            <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {mismatches.length > 0 && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{ backgroundColor: 'hsl(38, 92%, 95%)', borderColor: 'hsl(38, 92%, 70%)' }}
        >
          <p className="font-semibold text-sm mb-2">⚠ Count Mismatch Detected</p>
          {mismatches.map((r) => (
            <p key={r.fileName} className="text-sm">
              <strong>{r.fileName}</strong>: Declared {r.declaredCount}, Extracted {r.extractedCount} (difference:{' '}
              {Math.abs((r.declaredCount ?? 0) - r.extractedCount)})
            </p>
          ))}
        </div>
      )}

      {duplicates.length > 0 && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={
            subjectClashes.length > 0
              ? { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }
              : { backgroundColor: 'hsl(210, 60%, 97%)', borderColor: 'hsl(210, 60%, 80%)' }
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm mb-1">
                {subjectClashes.length > 0 ? '⚠ ' : 'ℹ '}
                {duplicates.length} roll number{duplicates.length !== 1 ? 's' : ''} appear in more than one PDF
              </p>
              <p className="text-sm text-muted-foreground">
                That's why Total Roll Numbers ({totalRolls}) is higher than Unique Students ({students.length}). Only the
                first entry of each is kept.
                {subjectClashes.length > 0 ? (
                  <>
                    {' '}
                    <strong className="text-destructive">
                      {subjectClashes.length} of them are listed under different subjects
                    </strong>{' '}
                    — only the first subject will be seated.
                  </>
                ) : (
                  ' All of them are the same subject (likely the same PDF uploaded twice), so nothing is lost.'
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowDuplicates((v) => !v)} className="rounded-lg text-xs">
              {showDuplicates ? 'Hide list' : 'Show list'}
            </Button>
          </div>

          {showDuplicates && (
            <div className="mt-3 max-h-72 overflow-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Roll Number</th>
                    <th className="text-left p-2 font-medium">Kept</th>
                    <th className="text-left p-2 font-medium">Also in (dropped)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...subjectClashes, ...duplicates.filter((d) => !subjectClashes.includes(d))].map((d) => {
                    const [kept, ...rest] = d.entries;
                    return (
                      <tr key={d.roll} className="border-t align-top">
                        <td className="p-2 font-mono">{d.roll}</td>
                        <td className="p-2">
                          <span className="font-mono font-semibold">{kept.examCode}</span> · {kept.dept}
                          <div className="text-muted-foreground truncate max-w-[220px]">{kept.fileName}</div>
                        </td>
                        <td className="p-2">
                          {rest.map((e, i) => (
                            <div key={i} className={i > 0 ? 'mt-1' : ''}>
                              <span
                                className={`font-mono font-semibold ${e.examCode !== kept.examCode ? 'text-destructive' : ''}`}
                              >
                                {e.examCode}
                              </span>{' '}
                              · {e.dept}
                              <div className="text-muted-foreground truncate max-w-[220px]">{e.fileName}</div>
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {askGeneral && candidate && (
        <div
          className="mb-6 p-5 rounded-2xl border-2"
          style={{ backgroundColor: 'hsl(45, 100%, 96%)', borderColor: 'hsl(45, 90%, 55%)' }}
        >
          <p className="font-semibold text-sm mb-1">
            Is <span className="font-mono">{candidate.examCode}</span> a general exam?
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-mono font-semibold">{candidate.examCode}</span> has <strong>{candidate.total}</strong>{' '}
            students — unusually high. If this is a general exam, those students will be seated in dedicated{' '}
            {GENERAL_ROOM_SIZE}-seat rooms (<strong>{Math.ceil(candidate.total / GENERAL_ROOM_SIZE)} rooms</strong>{' '}
            required), and the rest will follow normal seating.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => markGeneral(candidate.examCode)} className="rounded-xl px-6 h-9 text-sm">
              Yes, it's a general exam
            </Button>
            <Button variant="outline" onClick={() => setDismissedCode(candidate.examCode)} className="rounded-xl px-6 h-9 text-sm">
              No, treat normally
            </Button>
          </div>
        </div>
      )}

      {generalCode && (
        <div
          className="mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3"
          style={{ backgroundColor: 'hsl(142, 50%, 95%)', borderColor: 'hsl(142, 50%, 60%)' }}
        >
          <p className="text-sm">
            ✓ <span className="font-mono font-semibold">{generalCode}</span> marked as general exam —{' '}
            <strong>{generalCount}</strong> students will be allocated to{' '}
            <strong>{Math.ceil(generalCount / GENERAL_ROOM_SIZE)}</strong> dedicated {GENERAL_ROOM_SIZE}-seat rooms first.
          </p>
          <Button variant="ghost" size="sm" onClick={undoGeneral} className="text-xs">
            Undo
          </Button>
        </div>
      )}

      <div className="mb-6 p-4 bg-secondary rounded-2xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="text-sm font-semibold">
            Subject Strength <span className="font-normal text-muted-foreground">· {codeSummary.length} subjects</span>
          </p>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground tabular-nums">{students.length}</strong> students ·{' '}
            <strong className="text-foreground tabular-nums">{totals.blocks}</strong> blocks of {BLOCK} ·{' '}
            <strong className="text-amber-700 tabular-nums">{totals.extra}</strong> extra
          </p>
        </div>

        {codeSummary.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No roll numbers found. Add them manually below.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {codeSummary.map((code) => {
              const c = examCodeColor(code.examCode);
              const depts = Object.entries(code.depts).sort((a, b) => b[1] - a[1]);
              const blocks = depts.reduce((n, [, k]) => n + Math.floor(k / BLOCK), 0);
              const extra = depts.reduce((n, [, k]) => n + (k % BLOCK), 0);
              const open = openCode === code.examCode;
              return (
                <button
                  key={code.examCode}
                  onClick={() => setOpenCode(open ? null : code.examCode)}
                  aria-expanded={open}
                  className={`text-left bg-background rounded-xl px-3 py-2 border-2 transition-colors ${
                    open ? 'border-foreground' : 'border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2 py-0.5 rounded font-mono font-semibold text-xs"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {code.examCode}
                    </span>
                    <span className="text-lg font-bold tabular-nums leading-none">{code.total}</span>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <span className="text-xs truncate" title={depts.map(([d, n]) => `${d} (${n})`).join(', ')}>
                      {depts.map(([d, n], i) => (
                        <span key={d}>
                          {i > 0 && ', '}
                          {d}
                          {depts.length > 1 && <span className="text-muted-foreground"> {n}</span>}
                        </span>
                      ))}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                      {blocks}×{BLOCK}
                      {extra > 0 && <span className="ml-1.5 font-semibold text-amber-700">+{extra}</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {openCode && (
          <div className="mt-3 p-3 bg-background rounded-xl border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-semibold">
                <span className="font-mono">{openCode}</span>{' '}
                <span className="font-normal text-muted-foreground">
                  · {students.filter((s) => s.examCode === openCode).length} roll numbers
                </span>
              </p>
              <button onClick={() => setOpenCode(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Close ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {students
                .filter((s) => s.examCode === openCode)
                .map((s) => (
                  <span
                    key={s.rollNumber}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs border bg-background"
                    title={`${s.department} · ${s.sourcePdf}`}
                  >
                    <span className="font-mono">{s.rollNumber}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: deptColor(s.department).bg }} />
                    <button
                      onClick={() => removeStudent(s.rollNumber)}
                      aria-label={`Remove ${s.rollNumber}`}
                      className="w-4 h-4 rounded text-muted-foreground hover:text-destructive leading-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button onClick={() => setShowAll((v) => !v)} className="text-sm font-medium underline-offset-4 hover:underline">
          {showAll ? '▾ Hide all students' : `▸ Show all ${students.length} students`}
        </button>
        {showAll && (
          <div className="mt-3 border rounded-2xl overflow-hidden">
            <div className="p-3 border-b">
              <input
                type="search"
                placeholder="Search roll number, degree or exam code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">S.No</th>
                    <th className="text-left px-3 py-2 font-medium">Roll Number</th>
                    <th className="text-left px-3 py-2 font-medium">Degree</th>
                    <th className="text-left px-3 py-2 font-medium">Exam Code</th>
                    <th className="text-left px-3 py-2 font-medium">Source PDF</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const c = deptColor(s.department);
                    return (
                      <tr key={s.rollNumber} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono">{s.rollNumber}</td>
                        <td className="px-3 py-1.5">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                            style={{ backgroundColor: c.bg, color: c.text }}
                          >
                            {s.department}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono font-semibold">{s.examCode}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]">{s.sourcePdf}</td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeStudent(s.rollNumber)}
                            className="text-muted-foreground hover:text-destructive text-xs"
                            aria-label={`Remove ${s.rollNumber}`}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Add a roll number manually"
          value={manualRoll}
          onChange={(e) => setManualRoll(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addManual()}
          className="flex-1 min-w-0 px-4 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button variant="outline" onClick={addManual} className="rounded-xl">
          Add
        </Button>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => onConfirm(students)} disabled={students.length === 0} className="rounded-xl px-8 h-11">
          Confirm and Continue
        </Button>
      </div>
    </div>
  );
}
