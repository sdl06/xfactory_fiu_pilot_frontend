import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  GraduationCap, 
  Users, 
  Settings, 
  Clock, 
  UserCheck, 
  BookOpen,
  Target,
  ArrowRight,
  Factory
} from "lucide-react";

interface B2BConfig {
  clientType: string;
  frameworks: string[];
  skipSteps: string[];
  timeline: string;
  mentorPreferences: string[];
  customization: number;
}

interface B2BConfigFlowProps {
  onComplete: (config: B2BConfig) => void;
}

export const B2BConfigFlow = ({ onComplete }: B2BConfigFlowProps) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<B2BConfig>({
    clientType: "",
    frameworks: [],
    skipSteps: [],
    timeline: "",
    mentorPreferences: [],
    customization: 0
  });

  const clientTypes = [
    {
      type: "University",
      icon: GraduationCap,
      description: "Academic institution with student programs",
      features: ["Student tracking", "Academic frameworks", "Professor mentors", "Course integration"]
    },
    {
      type: "Accelerator",
      icon: Target,
      description: "Startup accelerator or incubator program",
      features: ["Cohort management", "Demo day prep", "Investor network", "Fast-track timelines"]
    },
    {
      type: "Corporate",
      icon: Building2,
      description: "Enterprise innovation program",
      features: ["Intrapreneurship", "Corporate mentors", "Industry-specific", "Custom branding"]
    }
  ];

  const frameworks = [
    "SWOT Analysis", "TAM SAM SOM", "Business Model Canvas", "Lean Startup", 
    "Design Thinking", "OKRs", "Value Proposition Canvas", "Customer Journey Mapping"
  ];

  const skipableSteps = [
    "Team Formation", "Legal Setup", "Basic Validation", "Pitch Deck",
    "Marketing Strategy", "Financial Planning", "Mentor Matching"
  ];

  const timelines = [
    "4 weeks (Intensive)", "8 weeks (Standard)", "12 weeks (Extended)", "16 weeks (Comprehensive)"
  ];

  const mentorTypes = [
    "Industry Experts", "Technical Leaders", "Marketing Specialists", "Legal Advisors",
    "Financial Experts", "Product Managers", "Design Professionals", "Academic Professors"
  ];

  const handleClientTypeSelect = (clientType: string) => {
    setConfig(prev => ({ ...prev, clientType }));
    setStep(2);
  };

  const handleFrameworkToggle = (framework: string) => {
    setConfig(prev => ({
      ...prev,
      frameworks: prev.frameworks.includes(framework)
        ? prev.frameworks.filter(f => f !== framework)
        : [...prev.frameworks, framework]
    }));
  };

  const handleComplete = () => {
    const customizationLevel = Math.min(
      (config.frameworks.length * 2 + config.skipSteps.length * 3 + config.mentorPreferences.length) / 50 * 15,
      15
    );
    onComplete({ ...config, customization: customizationLevel });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Header */}
      <div className="border-b border-border bg-gradient-conveyor">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Ivy Factory Configuration</h1>
              <p className="text-sm text-muted-foreground">Customize your startup factory for B2B clients</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= num ? "bg-gradient-machinery text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {num}
              </div>
              {num < 5 && <div className="w-12 h-0.5 bg-conveyor"></div>}
            </div>
          ))}
        </div>

        {/* Step 1: Client Type */}
        {step === 1 && (
          <Card className="animate-fade-in shadow-industrial">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Select Your Client Type</CardTitle>
              <CardDescription>
                Choose the type of organization that will use your Ivy Factory instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientTypes.map(({ type, icon: Icon, description, features }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="lg"
                  className="w-full h-auto p-6 text-left justify-start hover:shadow-machinery"
                  onClick={() => handleClientTypeSelect(type)}
                >
                  <div className="flex items-start gap-4 w-full">
                    <div className="w-12 h-12 bg-gradient-machinery rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">{type}</div>
                      <div className="text-sm text-muted-foreground mb-3">{description}</div>
                      <div className="flex flex-wrap gap-1">
                        {features.map(feature => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 mt-1" />
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Frameworks */}
        {step === 2 && (
          <Card className="animate-fade-in shadow-industrial">
            <CardHeader>
              <CardTitle>Select Business Frameworks</CardTitle>
              <CardDescription>
                Choose the frameworks and methodologies your {config.clientType.toLowerCase()} prefers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {frameworks.map(framework => (
                  <Button
                    key={framework}
                    variant={config.frameworks.includes(framework) ? "machinery" : "outline"}
                    size="sm"
                    onClick={() => handleFrameworkToggle(framework)}
                    className="h-auto p-3 text-xs"
                  >
                    {framework}
                  </Button>
                ))}
              </div>
              <Button onClick={() => setStep(3)} disabled={config.frameworks.length === 0}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Skip Steps */}
        {step === 3 && (
          <Card className="animate-fade-in shadow-industrial">
            <CardHeader>
              <CardTitle>Customize Journey Steps</CardTitle>
              <CardDescription>
                Select steps to skip or modify for your specific program needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {skipableSteps.map(stepName => (
                  <Button
                    key={stepName}
                    variant={config.skipSteps.includes(stepName) ? "warning" : "outline"}
                    size="sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      skipSteps: prev.skipSteps.includes(stepName)
                        ? prev.skipSteps.filter(s => s !== stepName)
                        : [...prev.skipSteps, stepName]
                    }))}
                    className="h-auto p-3 text-left justify-start"
                  >
                    {stepName}
                  </Button>
                ))}
              </div>
              <Button onClick={() => setStep(4)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Timeline */}
        {step === 4 && (
          <Card className="animate-fade-in shadow-industrial">
            <CardHeader>
              <CardTitle>Program Timeline</CardTitle>
              <CardDescription>
                Set the duration for your startup development program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timelines.map(timeline => (
                <Button
                  key={timeline}
                  variant={config.timeline === timeline ? "machinery" : "outline"}
                  size="lg"
                  className="w-full justify-start"
                  onClick={() => setConfig(prev => ({ ...prev, timeline }))}
                >
                  <Clock className="mr-3 h-5 w-5" />
                  {timeline}
                </Button>
              ))}
              <Button 
                onClick={() => setStep(5)} 
                disabled={!config.timeline}
                className="w-full"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Mentor Preferences */}
        {step === 5 && (
          <Card className="animate-fade-in shadow-industrial">
            <CardHeader>
              <CardTitle>Mentor Preferences</CardTitle>
              <CardDescription>
                Select the types of mentors you want in your program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {mentorTypes.map(mentorType => (
                  <Button
                    key={mentorType}
                    variant={config.mentorPreferences.includes(mentorType) ? "success" : "outline"}
                    size="sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      mentorPreferences: prev.mentorPreferences.includes(mentorType)
                        ? prev.mentorPreferences.filter(m => m !== mentorType)
                        : [...prev.mentorPreferences, mentorType]
                    }))}
                    className="h-auto p-3 text-xs"
                  >
                    {mentorType}
                  </Button>
                ))}
              </div>
              
              {/* Configuration Summary */}
              <div className="bg-muted p-4 rounded-lg mb-6">
                <h4 className="font-semibold mb-2">Configuration Summary</h4>
                <div className="text-sm space-y-1">
                  <p>Client: {config.clientType}</p>
                  <p>Frameworks: {config.frameworks.length} selected</p>
                  <p>Steps to skip: {config.skipSteps.length}</p>
                  <p>Timeline: {config.timeline}</p>
                  <p>Mentor types: {config.mentorPreferences.length}</p>
                </div>
              </div>
              
              <Button 
                onClick={handleComplete}
                variant="machinery"
                size="lg"
                className="w-full"
              >
                Launch Factory Configuration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};