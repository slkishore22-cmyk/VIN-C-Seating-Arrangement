import { useState } from 'react';
import StepIndicator from '@/components/StepIndicator';
import UploadStep from '@/components/UploadStep';
import VerifyStep from '@/components/VerifyStep';
import ConfigureStep from '@/components/ConfigureStep';
import AllocateStep from '@/components/AllocateStep';
import StudentLookup from '@/pages/StudentLookup';
import { mergeStudents } from '@/lib/pdf';
import { allocateSeating } from '@/lib/seating';
import type { PdfResult, Room, RoomConfig, Student } from '@/lib/types';

function Planner() {
  const [step, setStep] = useState(1);
  const [pdfResults, setPdfResults] = useState<PdfResult[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [balance, setBalance] = useState<Student[]>([]);
  const [config, setConfig] = useState<RoomConfig>({ studentsPerRoom: 45, mainColumns: 3, seatsPerColumn: 3 });

  const onExtracted = (results: PdfResult[], uploaded: File[]) => {
    setPdfResults(results);
    setFiles(uploaded);
    setStudents(mergeStudents(results));
    setStep(2);
  };

  const onGenerate = (cfg: RoomConfig) => {
    setConfig(cfg);
    const result = allocateSeating([...students], cfg);
    setRooms(result.rooms);
    setBalance(result.balance);
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print">
        <StepIndicator currentStep={step} onStepClick={(s) => s < step && setStep(s)} />
      </div>
      <div className="pb-16">
        {step === 1 && <UploadStep initialFiles={files} onComplete={onExtracted} />}
        {step === 2 && (
          <VerifyStep
            students={students}
            pdfResults={pdfResults}
            totalPdfs={files.length}
            onConfirm={(list) => {
              setStudents(list);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ConfigureStep
            totalStudents={students.length}
            initial={config}
            onGenerate={onGenerate}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <AllocateStep
            rooms={rooms}
            balance={balance}
            config={config}
            onChange={(r, b) => {
              setRooms(r);
              setBalance(b);
            }}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === '/student' ? <StudentLookup /> : <Planner />;
}
