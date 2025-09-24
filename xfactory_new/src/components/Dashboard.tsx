import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Image, 
  Target, 
  FileText, 
  Users, 
  Code, 
  Rocket, 
  Scale, 
  TrendingUp, 
  DollarSign,
  Lock,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { BusinessType } from "./OnboardingFlow";

interface DashboardProps {
  userData: {
    hasIdea: boolean;
    businessType: BusinessType | null;
    ideaSummary: string;
  };
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  icon: any;
  status: "completed" | "active" | "locked";
  estimatedTime: string;
}

export const Dashboard = ({ userData }: DashboardProps) => {
  const [currentStep, setCurrentStep] = useState(1);

  const milestones: Milestone[] = [
    {
      id: 1,
      title: "Idea Generator",
      description: "Refine and validate your startup concept with AI-powered insights",
      icon: Lightbulb,
      status: "active",
      estimatedTime: "30 mins"
    },
    {
      id: 2,
      title: "Auto Visual Mockup",
      description: "Generate visual mockups and wireframes for your idea",
      icon: Image,
      status: "locked",
      estimatedTime: "45 mins"
    },
    {
      id: 3,
      title: "Validation Engine",
      description: "Conduct market research and validate your assumptions",
      icon: Target,
      status: "locked",
      estimatedTime: "2 hours"
    },
    {
      id: 4,
      title: "Pitch Deck Generator",
      description: "Create a compelling pitch deck for investors and stakeholders",
      icon: FileText,
      status: "locked",
      estimatedTime: "1 hour"
    },
    {
      id: 5,
      title: "Mentor Matching",
      description: "Connect with industry mentors and advisors",
      icon: Users,
      status: "locked",
      estimatedTime: "Ongoing"
    },
    {
      id: 6,
      title: "MVP Factory",
      description: "Build your minimum viable product with guided development",
      icon: Code,
      status: "locked",
      estimatedTime: "4-8 weeks"
    },
    {
      id: 7,
      title: "Prototype Launch",
      description: "Deploy and test your prototype with real users",
      icon: Rocket,
      status: "locked",
      estimatedTime: "2 weeks"
    },
    {
      id: 8,
      title: "Legal & Marketing",
      description: "Handle legal requirements and create marketing strategies",
      icon: Scale,
      status: "locked",
      estimatedTime: "3 weeks"
    },
    {
      id: 9,
      title: "Launch Toolkit",
      description: "Execute your go-to-market strategy and launch publicly",
      icon: TrendingUp,
      status: "locked",
      estimatedTime: "2 weeks"
    },
    {
      id: 10,
      title: "Investor Factory",
      description: "Connect with investors and raise funding",
      icon: DollarSign,
      status: "locked",
      estimatedTime: "Ongoing"
    }
  ];

  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const progressPercentage = (completedMilestones / milestones.length) * 100;

  const handleStartMilestone = (milestoneId: number) => {
    if (milestoneId === currentStep) {
      // Navigate to the specific milestone component
      console.log(`Starting milestone ${milestoneId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">X</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">xFactory Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {userData.businessType} • {userData.ideaSummary.slice(0, 50)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{completedMilestones}/10 Milestones</Badge>
              <Button variant="outline" size="sm">Settings</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Overview */}
        <div className="mb-8 animate-fade-in">
          <Card className="bg-gradient-hero text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-2xl">Your Startup Journey</CardTitle>
              <div className="space-y-3">
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-primary-foreground/80">
                  {completedMilestones === 0 ? "Ready to begin!" : `${completedMilestones} of 10 milestones completed`}
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Milestones Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
          {milestones.map((milestone) => {
            const Icon = milestone.icon;
            const isLocked = milestone.status === "locked";
            const isActive = milestone.status === "active";
            const isCompleted = milestone.status === "completed";

            return (
              <Card 
                key={milestone.id}
                className={`relative transition-all duration-300 hover:shadow-medium ${
                  isLocked ? "opacity-60" : "cursor-pointer hover:scale-[1.02]"
                } ${isActive ? "ring-2 ring-primary shadow-glow" : ""}`}
                onClick={() => !isLocked && handleStartMilestone(milestone.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isCompleted ? "bg-success" : isActive ? "bg-gradient-primary" : "bg-muted"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-primary-foreground" />
                      ) : isLocked ? (
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <Badge variant={isCompleted ? "default" : isActive ? "secondary" : "outline"}>
                      Step {milestone.id}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{milestone.title}</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {milestone.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      ⏱ {milestone.estimatedTime}
                    </span>
                    
                    {isActive && (
                      <Button size="sm" variant="default">
                        Start <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    
                    {isCompleted && (
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid gap-4 md:grid-cols-3 animate-slide-up">
          <Card className="p-6 text-center border-dashed border-2 border-border hover:border-primary/50 transition-colors">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get assistance from our AI assistant or community
            </p>
            <Button variant="outline" size="sm">Ask AI Assistant</Button>
          </Card>
          
          <Card className="p-6 text-center border-dashed border-2 border-border hover:border-accent/50 transition-colors">
            <h3 className="font-semibold mb-2">Invite Team</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Collaborate with co-founders and team members
            </p>
            <Button variant="accent" size="sm">Invite Members</Button>
          </Card>
          
          <Card className="p-6 text-center border-dashed border-2 border-border hover:border-primary/50 transition-colors">
            <h3 className="font-semibold mb-2">Save Progress</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Export your journey and share with others
            </p>
            <Button variant="outline" size="sm">Export Data</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};