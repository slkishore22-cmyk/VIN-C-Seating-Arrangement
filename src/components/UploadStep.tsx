import { useCallback, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { extractRollNumbers } from '@/lib/pdf';
import type { PdfResult } from '@/lib/types';

interface Props {
  initialFiles?: File[];
  onComplete: (results: PdfResult[], files: File[]) => void;
}

export default function UploadStep({ initialFiles = [], onComplete }: Props) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const addFiles = useCallback((list: FileList) => {
    const pdfs = Array.from(list).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfs]);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = () => input.files && addFiles(input.files);
    input.click();
  };

  const extract = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setErrors([]);
    const results: PdfResult[] = [];
    const failed: string[] = [];
    for (const file of files) {
      try {
        results.push(
          await extractRollNumbers(file, (page, total, name) => setProgress(`Reading page ${page} of ${total} from ${name}...`)),
        );
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        failed.push(file.name);
      }
    }
    setBusy(false);
    if (results.length === 0) {
      setErrors(failed);
      return;
    }
    onComplete(results, files);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-5xl font-bold tracking-tight mb-2">Vin-C</h1>
      <p className="text-muted-foreground mb-12">Seating Arrangement</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={pick}
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center transition-all cursor-pointer ${
          dragging ? 'border-accent bg-gold-light' : 'border-border hover:border-muted-foreground'
        }`}
      >
        <div className="text-4xl mb-4">📄</div>
        <p className="text-lg font-medium mb-1">Drop your PDF files here</p>
        <p className="text-sm text-muted-foreground">Upload all subject PDFs for this exam date</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 w-full max-w-xl">
          <p className="text-sm text-muted-foreground mb-2">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 px-3 bg-secondary rounded-lg">
                <span className="truncate">{f.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="text-muted-foreground hover:text-foreground ml-2"
                  aria-label={`Remove ${f.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {busy && <p className="mt-6 text-sm text-muted-foreground animate-pulse-gentle">{progress}</p>}
      {errors.length > 0 && (
        <p className="mt-6 text-sm text-destructive text-center">Could not read: {errors.join(', ')}</p>
      )}

      <Button className="mt-8 px-12 h-12 text-base rounded-xl" disabled={files.length === 0 || busy} onClick={extract}>
        {busy ? 'Extracting...' : 'Extract Roll Numbers'}
      </Button>
    </div>
  );
}
