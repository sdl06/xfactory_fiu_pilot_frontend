import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Server, 
  Globe, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  Users,
  BarChart3
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface ScalingStationProps {
  iterationData: any;
  onComplete: (scalingData: any) => void;
  onBack: () => void;
}

export const ScalingStation = ({ iterationData, onComplete, onBack }: ScalingStationProps) => {
  const [scalingPlan, setScalingPlan] = useState<string>("");
  const [isScaling, setIsScaling] = useState(false);

  const scalingOptions = [
    {
      id: "infrastructure",
      title: "Infrastructure Scaling",
      description: "Scale servers and hosting capacity",
      icon: Server,
      timeline: "2-4 weeks"
    },
    {
      id: "market",
      title: "Market Expansion",
      description: "Enter new markets and regions",
      icon: Globe,
      timeline: "2-3 months"
    },
    {
      id: "team",
      title: "Team Scaling",
      description: "Hire additional team members",
      icon: Users,
      timeline: "1-2 months"
    },
    {
      id: "monetization",
      title: "Revenue Optimization",
      description: "Implement pricing strategies",
      icon: DollarSign,
      timeline: "3-6 weeks"
    }
  ];

  const executeScaling = async () => {
    setIsScaling(true);
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    const scalingData = {
      plan: scalingPlan,
      capacity: "10x current load",
      projectedGrowth: "300% in 6 months",
      investmentRequired: "$50k - $200k",
      timeline: scalingOptions.find(s => s.id === scalingPlan)?.timeline,
      milestones: ["Infrastructure setup", "Team onboarding", "Market launch", "Growth metrics"]
    };
    
    setIsScaling(false);
    onComplete(scalingData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-machinery relative">
        {/* Logos positioned at absolute left edge */}
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img 
            src="/logos/prov_logo_white.png" 
            alt="xFactory Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
            }}
          />
          <img 
            src="/logos/fiualonetransreverse.png" 
            alt="FIU Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
            }}
          />
        </div>

        {/* User controls positioned at absolute right edge */}
        <div className="absolute right-0 top-0 h-full flex items-center gap-3 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-primary-foreground hover:bg-white/10 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left: Section name and icon (bounded left) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Rocket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Scaling Station</h1>
                <p className="text-sm text-primary-foreground/80">Prepare for Growth & Expansion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Choose Scaling Strategy</CardTitle>
              <CardDescription>
                Select the primary focus for scaling your product to the next level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isScaling ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {scalingOptions.map((option) => (
                      <Card 
                        key={option.id}
                        className={`cursor-pointer transition-all ${
                          scalingPlan === option.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                        }`}
                        onClick={() => setScalingPlan(option.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <option.icon className="h-6 w-6 text-primary" />
                            <div>
                              <h3 className="font-semibold">{option.title}</h3>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Timeline: {option.timeline}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {scalingPlan && (
                    <div className="bg-muted p-4 rounded-lg mb-6">
                      <h4 className="font-semibold mb-2">Scaling Plan Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {scalingOptions.find(s => s.id === scalingPlan)?.description}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={onBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
                    </Button>
                    <Button 
                      onClick={executeScaling}
                      disabled={!scalingPlan}
                      size="lg"
                    >
                      Execute Scaling Plan
                      <Rocket className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Executing Scaling Plan...</h3>
                  <p className="text-muted-foreground">Setting up infrastructure and processes for growth</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={7}
        userData={{ iterationData }}
        context="scaling-strategy"
      />
    </div>
  );
};