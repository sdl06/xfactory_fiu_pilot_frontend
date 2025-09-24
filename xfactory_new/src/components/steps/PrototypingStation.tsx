import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Code, 
  Cpu, 
  Database, 
  Layers, 
  ArrowRight, 
  ArrowLeft,
  Wrench,
  CheckCircle
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface PrototypingStationProps {
  ideaCard: any;
  mockups: any;
  validationData: any;
  onComplete: (prototypeData: any) => void;
  onBack: () => void;
}

export const PrototypingStation = ({ ideaCard, mockups, validationData, onComplete, onBack }: PrototypingStationProps) => {
  const [step, setStep] = useState(1);
  const [isBuilding, setIsBuilding] = useState(false);
  const [prototypeType, setPrototypeType] = useState<string>("");

  const prototypeOptions = [
    { id: "mvp", title: "MVP Prototype", description: "Core functionality only", icon: Code },
    { id: "interactive", title: "Interactive Prototype", description: "Clickable mockups", icon: Layers },
    { id: "technical", title: "Technical Demo", description: "Backend integration", icon: Database },
    { id: "poc", title: "Proof of Concept", description: "Validate key assumptions", icon: Cpu }
  ];

  const buildPrototype = async () => {
    setIsBuilding(true);
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const prototypeData = {
      type: prototypeType,
      features: ["Core functionality", "User interface", "Basic navigation"],
      techStack: ["React", "TypeScript", "Tailwind"],
      buildTime: "4 weeks",
      nextSteps: ["User testing", "Feature expansion", "Performance optimization"]
    };
    
    setIsBuilding(false);
    onComplete(prototypeData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-info">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Wrench className="h-8 w-8 text-info-foreground" />
              <div>
                <h1 className="text-xl font-bold text-info-foreground">Prototyping Station</h1>
                <p className="text-sm text-info-foreground/80">Build & Test Your Concept</p>
              </div>
            </div>
            <Badge variant="accent">Station 4</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Progress value={(step - 1) * 50} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">Step {step} of 2</p>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Prototype Type</CardTitle>
                <CardDescription>Select the type of prototype that best fits your validation needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prototypeOptions.map((option) => (
                    <Card 
                      key={option.id}
                      className={`cursor-pointer transition-all ${
                        prototypeType === option.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                      }`}
                      onClick={() => setPrototypeType(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <option.icon className="h-6 w-6 text-primary" />
                          <div>
                            <h3 className="font-semibold">{option.title}</h3>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                  <Button 
                    onClick={() => setStep(2)}
                    disabled={!prototypeType}
                  >
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Build Prototype</CardTitle>
                <CardDescription>Generate your {prototypeOptions.find(p => p.id === prototypeType)?.title}</CardDescription>
              </CardHeader>
              <CardContent>
                {!isBuilding ? (
                  <div className="text-center py-8">
                    <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Build</h3>
                    <p className="text-muted-foreground mb-6">
                      We'll create a {prototypeOptions.find(p => p.id === prototypeType)?.title.toLowerCase()} based on your mockups and validation data.
                    </p>
                    <Button onClick={buildPrototype} size="lg">
                      Start Building
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin h-16 w-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Building Prototype...</h3>
                    <p className="text-muted-foreground">This may take a few minutes</p>
                  </div>
                )}

                {step === 2 && !isBuilding && (
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={4}
        userData={{ ideaCard, mockups, validationData }}
        context="prototyping"
      />
    </div>
  );
};