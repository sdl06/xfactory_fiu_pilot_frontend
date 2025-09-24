import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Clock, 
  Star, 
  MessageSquare, 
  Video,
  ArrowLeft,
  CheckCircle,
  Target,
  FileText,
  Settings,
  Eye,
  Heart,
  PieChart
} from "lucide-react";

interface InvestorDashboardProps {
  onBack: () => void;
  investorData: any;
}

export const InvestorDashboard = ({ onBack, investorData }: InvestorDashboardProps) => {
  const [selectedStartup, setSelectedStartup] = useState<number | null>(null);

  // Placeholder data for portfolio
  const portfolioStartups = [
    {
      id: 1,
      name: "EcoDelivery",
      founder: "Sarah Johnson",
      founderAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789",
      stage: "Series A",
      investmentAmount: "$500K",
      currentValuation: "$8M",
      progress: 75,
      lastUpdate: "3 days ago",
      nextMeeting: "Next Tuesday",
      description: "Sustainable last-mile delivery using electric bikes and AI route optimization",
      industry: "Logistics",
      teamSize: 8,
      monthlyGrowth: "+12%",
      status: "performing",
      metrics: {
        revenue: "$45K MRR",
        users: "2,500",
        growth: "+25%"
      }
    },
    {
      id: 2,
      name: "MindfulAI",
      founder: "Alex Chen",
      founderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      stage: "Seed",
      investmentAmount: "$250K",
      currentValuation: "$3M",
      progress: 60,
      lastUpdate: "1 week ago",
      nextMeeting: "Friday",
      description: "AI-powered mental health coaching platform with personalized therapy recommendations",
      industry: "HealthTech",
      teamSize: 4,
      monthlyGrowth: "+8%",
      status: "stable",
      metrics: {
        revenue: "$18K MRR",
        users: "800",
        growth: "+15%"
      }
    }
  ];

  // Placeholder available investment opportunities
  const investmentOpportunities = [
    {
      id: 3,
      name: "VirtualFit",
      founder: "James Wilson",
      founderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
      stage: "Seed",
      seekingAmount: "$1M",
      valuation: "$5M",
      description: "VR fitness platform combining gaming with personalized workout routines",
      industry: "Fitness Tech",
      teamSize: 6,
      traction: "500 beta users",
      matchScore: 92,
      fundingProgress: 65,
      leadInvestor: "TechVentures",
      dueDate: "2 weeks",
      metrics: {
        revenue: "$8K MRR",
        users: "500",
        growth: "+35%"
      }
    },
    {
      id: 4,
      name: "GreenHome",
      founder: "Lisa Thompson",
      founderAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
      stage: "Series A",
      seekingAmount: "$3M",
      valuation: "$15M",
      description: "Smart home IoT platform for energy efficiency and sustainability tracking",
      industry: "IoT",
      teamSize: 12,
      traction: "2K paying customers",
      matchScore: 87,
      fundingProgress: 40,
      leadInvestor: "GreenTech Capital",
      dueDate: "1 month",
      metrics: {
        revenue: "$85K MRR",
        users: "2,000",
        growth: "+20%"
      }
    }
  ];

  const handleInvest = (startupId: number) => {
    console.log("Expressing interest in startup:", startupId);
    // Placeholder - would integrate with backend
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Pre-Seed": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "Seed": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "Series A": return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "Series B": return "bg-green-500/10 text-green-600 border-green-200";
      case "Growth": return "bg-purple-500/10 text-purple-600 border-purple-200";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "performing": return "text-green-600";
      case "stable": return "text-yellow-600";
      case "concerning": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Landing
              </Button>
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-50">Investor Dashboard</h1>
                <p className="text-sm text-slate-50">Welcome back, {investorData?.name || 'Alex Morgan'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Badge variant="accent" className="px-4 py-2">
                <DollarSign className="h-4 w-4 mr-2" />
                $2.8M Invested
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Companies</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-2xl font-bold">$750K</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold">$1.2M</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opportunities</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
            <TabsTrigger value="opportunities">Investment Opportunities</TabsTrigger>
            <TabsTrigger value="calendar">Calendar & Meetings</TabsTrigger>
          </TabsList>

          {/* Portfolio */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid gap-6">
              {portfolioStartups.map((startup) => (
                <Card key={startup.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={startup.founderAvatar} />
                          <AvatarFallback>{startup.founder.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{startup.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Founded by {startup.founder}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">{startup.industry}</Badge>
                            <Badge className={getStageColor(startup.stage)}>{startup.stage}</Badge>
                            <Badge variant="success">{startup.investmentAmount}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Valuation</p>
                        <p className="text-xl font-bold">{startup.currentValuation}</p>
                        <p className={`text-sm font-medium ${getStatusColor(startup.status)}`}>
                          {startup.monthlyGrowth} this month
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{startup.description}</p>
                    
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="font-medium">{startup.metrics.revenue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Users</p>
                        <p className="font-medium">{startup.metrics.users}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Growth</p>
                        <p className="font-medium text-green-600">{startup.metrics.growth}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Team Size</p>
                        <p className="font-medium">{startup.teamSize} people</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Development Progress</span>
                        <span className="font-medium">{startup.progress}%</span>
                      </div>
                      <Progress value={startup.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message Founder
                      </Button>
                      <Button size="sm" variant="outline">
                        <Video className="h-4 w-4 mr-2" />
                        Schedule Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Investment Opportunities */}
          <TabsContent value="opportunities" className="space-y-6">
            <div className="grid gap-6">
              {investmentOpportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={opportunity.founderAvatar} />
                          <AvatarFallback>{opportunity.founder.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{opportunity.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Founded by {opportunity.founder}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">{opportunity.industry}</Badge>
                            <Badge className={getStageColor(opportunity.stage)}>{opportunity.stage}</Badge>
                            <Badge variant="outline">Lead: {opportunity.leadInvestor}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="success" className="mb-2">
                          <Star className="h-3 w-3 mr-1" />
                          {opportunity.matchScore}% Match
                        </Badge>
                        <p className="text-sm text-muted-foreground">Due: {opportunity.dueDate}</p>
                        <p className="text-lg font-bold">{opportunity.seekingAmount}</p>
                        <p className="text-sm text-muted-foreground">@ {opportunity.valuation} valuation</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{opportunity.description}</p>
                    
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="font-medium">{opportunity.metrics.revenue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Users</p>
                        <p className="font-medium">{opportunity.metrics.users}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Growth</p>
                        <p className="font-medium text-green-600">{opportunity.metrics.growth}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Team</p>
                        <p className="font-medium">{opportunity.teamSize} people</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-medium">{opportunity.fundingProgress}% raised</span>
                      </div>
                      <Progress value={opportunity.fundingProgress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button onClick={() => handleInvest(opportunity.id)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Express Interest
                      </Button>
                      <Button variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Pitch Deck
                      </Button>
                      <Button variant="outline">
                        <Heart className="h-4 w-4 mr-2" />
                        Save for Later
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Calendar & Meetings */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Calendly Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Calendly Connected</p>
                        <p className="text-sm text-muted-foreground">alex.morgan.investments</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">This Week</p>
                        <p className="font-medium">6 meetings scheduled</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">8 slots remaining</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Availability
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Calendly Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Meetings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">EcoDelivery - Quarterly Review</p>
                        <p className="text-sm text-muted-foreground">Tuesday at 3:00 PM (45 min)</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">VirtualFit - Due Diligence</p>
                        <p className="text-sm text-muted-foreground">Friday at 2:00 PM (60 min)</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-center py-4">
                      <Button variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Full Calendar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};