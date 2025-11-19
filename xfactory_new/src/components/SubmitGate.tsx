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
        className={`w-full sm:w-auto px-8 py-6 text-base font-semibold ${enabled ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl' : ''}`}
      >
        {label || 'Submit Mockups (Ready)'}
      </Button>
    </div>
  );
};


