// Station Flow Management System

interface StationOutput {
  id: string;
  stationType: string;
  data: any;
  createdAt: string;
  confidence?: number;
}

interface StationFlow {
  currentStation: string;
  outputs: StationOutput[];
  completedStations: string[];
}

const STORAGE_KEY = "xfactory_station_flow";

const stationOrder = [
  "idea",
  "mockup", 
  "prototype",
  "validation",
  "mentorship-pre",
  "mvp",
  "mentorship-post",
  "launch-prep",
  "launch-execution",
  "post-launch-performance",
  "pitch-practice",
  "marketing",
  "legal",
  "financial",
  "investor-presentation"
];

export class StationFlowManager {
  
  static saveStationOutput(stationType: string, data: any, confidence?: number): void {
    const flow = this.getFlow();
    
    const output: StationOutput = {
      id: `${stationType}_${Date.now()}`,
      stationType,
      data,
      createdAt: new Date().toISOString(),
      confidence
    };

    // Update or add the output for this station
    const existingIndex = flow.outputs.findIndex(o => o.stationType === stationType);
    if (existingIndex >= 0) {
      flow.outputs[existingIndex] = output;
    } else {
      flow.outputs.push(output);
    }

    // Mark station as completed
    if (!flow.completedStations.includes(stationType)) {
      flow.completedStations.push(stationType);
    }

    // Update current station to next one
    const currentIndex = stationOrder.indexOf(stationType);
    if (currentIndex >= 0 && currentIndex < stationOrder.length - 1) {
      flow.currentStation = stationOrder[currentIndex + 1];
    }

    this.saveFlow(flow);
  }

  static getStationOutput(stationType: string): StationOutput | null {
    const flow = this.getFlow();
    return flow.outputs.find(o => o.stationType === stationType) || null;
  }

  static getAllOutputs(): StationOutput[] {
    const flow = this.getFlow();
    return flow.outputs;
  }

  static getPreviousStationOutput(currentStation: string): StationOutput | null {
    const currentIndex = stationOrder.indexOf(currentStation);
    if (currentIndex <= 0) return null;
    
    const previousStation = stationOrder[currentIndex - 1];
    return this.getStationOutput(previousStation);
  }

  static getFlow(): StationFlow {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading station flow:", error);
    }

    return {
      currentStation: "idea",
      outputs: [],
      completedStations: []
    };
  }

  static saveFlow(flow: StationFlow): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
    } catch (error) {
      console.error("Error saving station flow:", error);
    }
  }

  static isStationCompleted(stationType: string): boolean {
    const flow = this.getFlow();
    return flow.completedStations.includes(stationType);
  }

  static getCurrentStation(): string {
    const flow = this.getFlow();
    return flow.currentStation;
  }

  static resetFlow(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static downloadStationCard(stationType: string): void {
    const output = this.getStationOutput(stationType);
    if (!output) return;

    const cardData = {
      type: stationType,
      ...output,
      generatedBy: "xFactory Station System"
    };

    const fileBlob = new Blob([JSON.stringify(cardData, null, 2)], { 
      type: "application/json" 
    });
    
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stationType}-card-${output.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static getStationProgress(): { completed: number; total: number; percentage: number } {
    const flow = this.getFlow();
    const completed = flow.completedStations.length;
    const total = stationOrder.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  }
}