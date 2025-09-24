import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TestTube, 
  Users, 
  Bug, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Activity,
  Target
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface TestingStationProps {
  prototypeData: any;
  onComplete: (testingData: any) => void;
  onBack: () => void;
}

export const TestingStation = ({ prototypeData, onComplete, onBack }: TestingStationProps) => {
  const [currentTest, setCurrentTest] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testTypes = [
    {
      id: "usability",
      title: "Usability Testing",
      description: "Test user experience and interface",
      icon: Users,
      duration: "2-3 days"
    },
    {
      id: "functional",
      title: "Functional Testing",
      description: "Verify core features work correctly",
      icon: CheckCircle,
      duration: "1-2 days"
    },
    {
      id: "performance",
      title: "Performance Testing",
      description: "Check speed and responsiveness",
      icon: Activity,
      duration: "1 day"
    },
    {
      id: "bug",
      title: "Bug Detection",
      description: "Identify and catalog issues",
      icon: Bug,
      duration: "2-3 days"
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < testTypes.length; i++) {
      setCurrentTest(i);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        testType: testTypes[i].id,
        status: Math.random() > 0.3 ? "passed" : "warning",
        score: Math.floor(Math.random() * 30) + 70,
        issues: Math.floor(Math.random() * 5),
        feedback: `${testTypes[i].title} completed successfully`
      };
      
      setTestResults(prev => [...prev, result]);
    }
    
    setIsRunning(false);
    
    const testingData = {
      testsRun: testTypes.length,
      overallScore: Math.floor(testResults.reduce((acc, r) => acc + r.score, 0) / testTypes.length),
      issues: testResults.reduce((acc, r) => acc + r.issues, 0),
      recommendations: [
        "Improve loading performance",
        "Enhance mobile responsiveness", 
        "Add error handling",
        "Optimize user flow"
      ]
    };
    
    setTimeout(() => onComplete(testingData), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-warning">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TestTube className="h-8 w-8 text-warning-foreground" />
              <div>
                <h1 className="text-xl font-bold text-warning-foreground">Testing Station</h1>
                <p className="text-sm text-warning-foreground/80">Quality Assurance & Bug Detection</p>
              </div>
            </div>
            <Badge variant="warning">Station 5</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Testing Suite</CardTitle>
              <CardDescription>
                Running automated tests on your prototype to identify issues and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isRunning && testResults.length === 0 ? (
                <div className="text-center py-8">
                  <TestTube className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Test</h3>
                  <p className="text-muted-foreground mb-6">
                    We'll run a comprehensive testing suite on your prototype
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {testTypes.map((test) => (
                      <Card key={test.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <test.icon className="h-6 w-6 text-primary" />
                          <div>
                            <h4 className="font-semibold">{test.title}</h4>
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{test.duration}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <Button onClick={runTests} size="lg">
                    Start Testing Suite
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : isRunning ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Running Tests...</h3>
                    <Progress value={(currentTest / testTypes.length) * 100} className="w-full mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Currently running: {testTypes[currentTest]?.title}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">
                            {testTypes.find(t => t.id === result.testType)?.title}
                          </span>
                        </div>
                        <Badge variant={result.status === "passed" ? "success" : "warning"}>
                          {result.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Testing Complete!</h3>
                  <p className="text-muted-foreground mb-6">
                    All tests have been completed. Moving to next station...
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={5}
        userData={{ prototypeData }}
        context="testing"
      />
    </div>
  );
};