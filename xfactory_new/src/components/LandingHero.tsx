import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Target, Rocket } from "lucide-react";

interface LandingHeroProps {
  onStartJourney: () => void;
}

export const LandingHero = ({ onStartJourney }: LandingHeroProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">X</span>
          </div>
          <span className="text-xl font-bold text-foreground">xFactory</span>
        </div>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              From <span className="bg-gradient-hero bg-clip-text text-transparent">Idea</span> to{" "}
              <span className="bg-gradient-accent bg-clip-text text-transparent">MVP</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered startup factory that guides you through every milestone from concept to launch. 
              Built for entrepreneurs, students, and innovators ready to build the future.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
            <Button 
              variant="hero" 
              size="xl" 
              onClick={onStartJourney}
              className="group"
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 animate-slide-up">
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Lightbulb className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-card-foreground mb-2">Idea Generation</h3>
              <p className="text-muted-foreground">AI-powered ideation and validation tools to transform concepts into viable business opportunities.</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Target className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-card-foreground mb-2">Milestone Tracking</h3>
              <p className="text-muted-foreground">Sequential journey with locked milestones ensuring structured progress from idea to launch.</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Rocket className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-card-foreground mb-2">MVP Factory</h3>
              <p className="text-muted-foreground">Custom development tools and resources tailored to your specific business type and requirements.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};