import { Button } from "@/components/ui/button";

interface SubmitGateProps {
  enabled: boolean;
  onSubmit: () => void | Promise<void>;
  className?: string;
  label?: string;
}

export const SubmitGate = ({ enabled, onSubmit, className, label }: SubmitGateProps) => {
  return (
    <div className={`w-full flex items-center justify-center ${className || ''}`}>
      <Button
        variant="default"
        size="lg"
        disabled={!enabled}
        onClick={() => { if (enabled) onSubmit(); }}
        className={`w-full sm:w-auto px-8 py-6 text-base font-semibold ${enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
      >
        {label || 'Submit Mockups (Ready)'}
      </Button>
    </div>
  );
};


