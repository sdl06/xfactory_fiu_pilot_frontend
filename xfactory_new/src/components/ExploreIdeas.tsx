import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Lightbulb, TrendingUp, Users, Zap, Globe, Smartphone, ShoppingCart, Heart, GraduationCap, Leaf, Car, Home, Briefcase } from "lucide-react";

interface ExploreIdeasProps {
  onSelectIdea: (idea: any) => void;
  onBack: () => void;
}

export const ExploreIdeas = ({ onSelectIdea, onBack }: ExploreIdeasProps) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const industries = [
    {
      id: "fintech",
      name: "FinTech",
      icon: Briefcase,
      color: "bg-blue-500",
      description: "Financial technology solutions",
      trends: ["Digital banking", "Crypto wallets", "AI trading", "Micro-investing"]
    },
    {
      id: "healthtech",
      name: "HealthTech",
      icon: Heart,
      color: "bg-red-500",
      description: "Healthcare and wellness innovation",
      trends: ["Telemedicine", "Mental health apps", "Fitness tracking", "AI diagnostics"]
    },
    {
      id: "edtech",
      name: "EdTech",
      icon: GraduationCap,
      color: "bg-purple-500",
      description: "Educational technology",
      trends: ["Online learning", "Skill development", "VR education", "AI tutoring"]
    },
    {
      id: "sustainability",
      name: "Sustainability",
      icon: Leaf,
      color: "bg-green-500",
      description: "Environmental and social impact",
      trends: ["Carbon tracking", "Renewable energy", "Waste reduction", "Sustainable shopping"]
    },
    {
      id: "ecommerce",
      name: "E-commerce",
      icon: ShoppingCart,
      color: "bg-orange-500",
      description: "Online retail and marketplaces",
      trends: ["Social commerce", "Subscription boxes", "Local marketplaces", "AR shopping"]
    },
    {
      id: "mobility",
      name: "Mobility",
      icon: Car,
      color: "bg-indigo-500",
      description: "Transportation and logistics",
      trends: ["Electric vehicles", "Ride sharing", "Delivery drones", "Smart parking"]
    },
    {
      id: "proptech",
      name: "PropTech",
      icon: Home,
      color: "bg-pink-500",
      description: "Real estate technology",
      trends: ["Virtual tours", "Smart homes", "Rental platforms", "Property management"]
    },
    {
      id: "saas",
      name: "SaaS Tools",
      icon: Globe,
      color: "bg-cyan-500",
      description: "Software as a Service",
      trends: ["Remote work tools", "No-code platforms", "AI automation", "Team collaboration"]
    }
  ];

  const hotIdeas = [
    {
      title: "AI-Powered Personal Finance Coach",
      industry: "FinTech",
      problem: "People struggle to manage finances and lack personalized guidance",
      solution: "AI analyzes spending patterns and provides real-time financial coaching",
      market: "$1.2B+ personal finance app market",
      icon: "💰"
    },
    {
      title: "Virtual Mental Health Companion",
      industry: "HealthTech", 
      problem: "Mental health support is expensive and not always accessible",
      solution: "AI companion provides 24/7 emotional support and coping strategies",
      market: "$5.6B+ mental health app market",
      icon: "🧠"
    },
    {
      title: "Skill-Swap Learning Platform",
      industry: "EdTech",
      problem: "Traditional education is expensive and one-way",
      solution: "Peer-to-peer platform where people teach and learn from each other",
      market: "$350B+ online education market", 
      icon: "🎓"
    },
    {
      title: "Carbon Footprint Gamification",
      industry: "Sustainability",
      problem: "People want to be eco-friendly but lack motivation and tracking",
      solution: "Gamified app that rewards sustainable daily choices",
      market: "$13.8B+ carbon management market",
      icon: "🌱"
    },
    {
      title: "Local Artisan Marketplace",
      industry: "E-commerce",
      problem: "Local creators struggle to reach customers online",
      solution: "Hyperlocal marketplace connecting artisans with nearby customers",
      market: "$24.3B+ handmade goods market",
      icon: "🎨"
    },
    {
      title: "Smart Commute Optimizer",
      industry: "Mobility",
      problem: "Daily commuting is inefficient and stressful",
      solution: "AI-powered app optimizes routes using real-time data and preferences",
      market: "$7.8B+ smart transportation market",
      icon: "🚗"
    }
  ];

  const handleSelectIdea = (idea: any) => {
    const formattedIdea = {
      title: idea.title,
      description: `${idea.problem} ${idea.solution}`,
      industry: idea.industry,
      problemStatement: idea.problem,
      solution: idea.solution,
      targetMarket: idea.market
    };
    onSelectIdea(formattedIdea);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Explore Startup Ideas</h1>
            <p className="text-muted-foreground">Discover trending opportunities and get inspired</p>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Hot Ideas Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">🔥 Hot Startup Ideas Right Now</h2>
              <p className="text-muted-foreground">Trending opportunities based on market demand</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotIdeas.map((idea, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" 
                    onClick={() => handleSelectIdea(idea)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl">{idea.icon}</div>
                    <Badge variant="secondary">{idea.industry}</Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">{idea.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Problem:</p>
                      <p className="text-sm text-muted-foreground">{idea.problem}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Solution:</p>
                      <p className="text-sm text-muted-foreground">{idea.solution}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-primary">{idea.market}</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-4">
                    Start with this idea <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Industries Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Explore by Industry</h2>
              <p className="text-muted-foreground">Browse trending themes in different sectors</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <Card key={industry.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 ${industry.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{industry.name}</CardTitle>
                    <CardDescription className="text-sm">{industry.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Trending:</p>
                      <div className="flex flex-wrap gap-1">
                        {industry.trends.slice(0, 3).map((trend, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{trend}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardContent className="pt-6">
              <Lightbulb className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Have Your Own Idea?</h3>
              <p className="mb-4 opacity-90">If none of these sparked inspiration, you can always start with your own concept</p>
              <Button variant="secondary" onClick={onBack}>
                I have my own idea <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};