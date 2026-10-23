import { Fragment } from 'react';

const STEPS = ['Upload', 'Verify', 'Configure', 'Allocate'];

interface Props {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function StepIndicator({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <Fragment key={label}>
            <div
              className={`flex items-center gap-2 ${done ? 'cursor-pointer' : ''}`}
              onClick={() => done && onStepClick(step)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  active ? 'gold-bg' : done ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {step}
              </div>
              <span
                className={`hidden sm:inline text-sm font-medium ${
                  active ? 'gold-text' : done ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-12 h-px ${done ? 'bg-foreground' : 'bg-border'}`} />}
          </Fragment>
        );
      })}
    </div>
  );
}
