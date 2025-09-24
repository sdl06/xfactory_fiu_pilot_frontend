import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Megaphone, 
  Target, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Star
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface LaunchStationProps {
  scalingData: any;
  onComplete: (launchData: any) => void;
  onBack: () => void;
}

export const LaunchStation = ({ scalingData, onComplete, onBack }: LaunchStationProps) => {
  const [step, setStep] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchType, setLaunchType] = useState<string>("");

  const launchStrategies = [
    {
      id: "soft",
      title: "Soft Launch",
      description: "Limited release to beta users",
      icon: Target,
      audience: "100-500 users"
    },
    {
      id: "public",
      title: "Public Launch",
      description: "Full marketing campaign",
      icon: Megaphone,
      audience: "General public"
    },
    {
      id: "stealth",
      title: "Stealth Launch",
      description: "Gradual rollout without promotion",
      icon: Calendar,
      audience: "Organic growth"
    }
  ];

  const executeLaunch = async () => {
    setIsLaunching(true);
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const launchData = {
      strategy: launchType,
      launchDate: new Date().toISOString().split('T')[0],
      initialUsers: Math.floor(Math.random() * 1000) + 500,
      marketingChannels: ["Social media", "Product Hunt", "Tech blogs", "Email campaign"],
      metrics: {
        signups: Math.floor(Math.random() * 2000) + 1000,
        conversion: Math.floor(Math.random() * 20) + 15,
        retention: Math.floor(Math.random() * 15) + 70
      }
    };
    
    setIsLaunching(false);
    onComplete(launchData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-info">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Rocket className="h-8 w-8 text-info-foreground" />
              <div>
                <h1 className="text-xl font-bold text-info-foreground">Launch Station</h1>
                <p className="text-sm text-info-foreground/80">Go Live & Market Your Product</p>
              </div>
            </div>
            <Badge variant="accent">Station 8</Badge>
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
                <CardTitle>Select Launch Strategy</CardTitle>
                <CardDescription>Choose how you want to introduce your product to the market</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {launchStrategies.map((strategy) => (
                    <Card 
                      key={strategy.id}
                      className={`cursor-pointer transition-all ${
                        launchType === strategy.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                      }`}
                      onClick={() => setLaunchType(strategy.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <strategy.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">{strategy.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {strategy.audience}
                        </Badge>
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
                    disabled={!launchType}
                  >
                    Prepare Launch
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Execute Launch</CardTitle>
                <CardDescription>
                  {launchStrategies.find(s => s.id === launchType)?.title} - Ready to go live!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isLaunching ? (
                  <div className="text-center py-8">
                    <Rocket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready for Launch!</h3>
                    <p className="text-muted-foreground mb-6">
                      Everything is prepared for your {launchStrategies.find(s => s.id === launchType)?.title.toLowerCase()}.
                    </p>
                    <Button onClick={executeLaunch} size="lg" className="bg-gradient-to-r from-primary to-primary/80">
                      🚀 Launch Product
                      <Star className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-bounce">
                      <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Launching...</h3>
                    <p className="text-muted-foreground">Going live and executing marketing campaign</p>
                  </div>
                )}

                {step === 2 && !isLaunching && (
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
        currentStation={8}
        userData={{ scalingData }}
        context="product-launch"
      />
    </div>
  );
};