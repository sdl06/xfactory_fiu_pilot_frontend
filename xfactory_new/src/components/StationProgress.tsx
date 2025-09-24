import { StationFlowManager } from "@/lib/stationFlow";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";

const stationList = [
  { id: "idea", name: "Idea Creation", description: "Generate XFactor Idea Card" },
  { id: "mockup", name: "Mockup Station", description: "Design Blueprint Card" },
  { id: "prototype", name: "Prototyping", description: "Build Architecture Card" },
  { id: "validation", name: "Validation", description: "Market Validation Card" },
  { id: "testing", name: "Testing", description: "Quality Assurance Card" },
  { id: "iteration", name: "Iteration", description: "Evolution Strategy Card" },
  { id: "launch", name: "Launch", description: "Launch Execution Card" },
  { id: "monitoring", name: "Monitoring", description: "Performance Analytics Card" },
  { id: "scaling", name: "Scaling", description: "Growth Strategy Card" }
];

export function StationProgress() {
  const progress = StationFlowManager.getStationProgress();
  const currentStation = StationFlowManager.getCurrentStation();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Factory Progress</h3>
        <Badge variant="secondary">
          {progress.completed}/{progress.total} Complete
        </Badge>
      </div>
      
      <Progress value={progress.percentage} className="h-2 mb-6" />
      
      <div className="space-y-3">
        {stationList.map((station) => {
          const isCompleted = StationFlowManager.isStationCompleted(station.id);
          const isCurrent = currentStation === station.id;
          
          return (
            <div
              key={station.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isCurrent 
                  ? 'border-primary bg-primary/5' 
                  : isCompleted 
                    ? 'border-success bg-success/5' 
                    : 'border-border'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <Circle className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                    {station.name}
                  </span>
                  {isCurrent && (
                    <Badge variant="default">Current</Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="secondary">✓ Complete</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{station.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {progress.completed > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💡 Your station outputs are automatically saved and flow to the next station
          </p>
        </div>
      )}
    </div>
  );
}