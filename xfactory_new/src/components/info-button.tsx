import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface InfoButtonProps {
  title: string;
  content: string | ReactNode;
  /** Optional icon override if the default info icon isn't the vibe */
  icon?: ReactNode;
  /** Optional label to show next to the icon for extra clarity */
  label?: string;
  /** Allows passing a custom trigger button */
  children?: ReactNode;
}

const renderContent = (content: string | ReactNode) => {
  if (typeof content !== "string") {
    return content;
  }

  return content.split("\n").map((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return (
        <div key={`spacer-${index}`} className="h-2" />
      );
    }

    if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
      return (
        <div key={`bold-${index}`} className="mb-2">
          <strong className="font-semibold text-foreground">
            {trimmedLine.slice(2, -2)}
          </strong>
        </div>
      );
    }

    if (trimmedLine.startsWith("- ")) {
      return (
        <div key={`list-${index}`} className="flex items-start gap-2 text-sm">
          <span className="mt-1">•</span>
          <span>{trimmedLine.slice(2)}</span>
        </div>
      );
    }

    return (
      <div key={`text-${index}`} className="text-sm leading-relaxed">
        {trimmedLine}
      </div>
    );
  });
};

const InfoButton = ({ title, content, icon, label, children }: InfoButtonProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ? (
          <div className="inline-flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            {children}
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-6 px-2 gap-1">
            {icon ?? <Info className="h-4 w-4" />}
            {label ? <span>{label}</span> : null}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm space-y-2">
          {renderContent(content)}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default InfoButton;