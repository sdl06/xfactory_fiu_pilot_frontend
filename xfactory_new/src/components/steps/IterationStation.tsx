import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  TrendingUp, 
  Zap, 
  Target, 
  ArrowRight, 
  ArrowLeft,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface IterationStationProps {
  testingData: any;
  onComplete: (iterationData: any) => void;
  onBack: () => void;
}

export const IterationStation = ({ testingData, onComplete, onBack }: IterationStationProps) => {
  const [step, setStep] = useState(1);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);

  const improvements = [
    { id: "performance", title: "Performance Optimization", impact: "High", effort: "Medium" },
    { id: "ui", title: "UI/UX Improvements", impact: "High", effort: "Low" },
    { id: "features", title: "Feature Enhancements", impact: "Medium", effort: "High" },
    { id: "accessibility", title: "Accessibility Updates", impact: "Medium", effort: "Low" },
    { id: "mobile", title: "Mobile Optimization", impact: "High", effort: "Medium" },
    { id: "security", title: "Security Hardening", impact: "Medium", effort: "Medium" }
  ];

  const applyIterations = async () => {
    setIsOptimizing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iterationData = {
      improvementsMade: selectedImprovements.length,
      performanceGain: Math.floor(Math.random() * 40) + 20,
      userExperienceScore: Math.floor(Math.random() * 20) + 80,
      iterationCycle: 1,
      nextSteps: ["Deploy to staging", "User acceptance testing", "Production release"]
    };
    
    setIsOptimizing(false);
    onComplete(iterationData);
  };

  const toggleImprovement = (id: string) => {
    setSelectedImprovements(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-success">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-8 w-8 text-success-foreground" />
              <div>
                <h1 className="text-xl font-bold text-success-foreground">Iteration Station</h1>
                <p className="text-sm text-success-foreground/80">Optimize & Improve Based on Feedback</p>
              </div>
            </div>
            <Badge variant="success">Station 6</Badge>
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
                <CardTitle>Select Improvements</CardTitle>
                <CardDescription>
                  Based on testing results, choose which areas to optimize in this iteration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {improvements.map((improvement) => (
                    <Card 
                      key={improvement.id}
                      className={`cursor-pointer transition-all ${
                        selectedImprovements.includes(improvement.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleImprovement(improvement.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{improvement.title}</h3>
                            <div className="flex gap-4 mt-2">
                              <span className="text-xs">
                                Impact: <Badge variant="outline">{improvement.impact}</Badge>
                              </span>
                              <span className="text-xs">
                                Effort: <Badge variant="outline">{improvement.effort}</Badge>
                              </span>
                            </div>
                          </div>
                          {selectedImprovements.includes(improvement.id) && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                  <Button 
                    onClick={() => setStep(2)}
                    disabled={selectedImprovements.length === 0}
                  >
                    Apply Improvements ({selectedImprovements.length})
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Apply Iterations</CardTitle>
                <CardDescription>Implementing selected improvements to your product</CardDescription>
              </CardHeader>
              <CardContent>
                {!isOptimizing ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Optimize</h3>
                    <p className="text-muted-foreground mb-6">
                      We'll apply {selectedImprovements.length} improvements to enhance your product.
                    </p>
                    <Button onClick={applyIterations} size="lg">
                      Start Optimization
                      <Zap className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin h-16 w-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Optimizing Product...</h3>
                    <p className="text-muted-foreground">Applying improvements and running tests</p>
                  </div>
                )}

                {step === 2 && !isOptimizing && (
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
        currentStation={6}
        userData={{ testingData }}
        context="iteration-optimization"
      />
    </div>
  );
};