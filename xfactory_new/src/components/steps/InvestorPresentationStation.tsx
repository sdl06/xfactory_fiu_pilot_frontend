import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Clock, Calendar, MessageSquare, ArrowLeft, ArrowRight, CheckCircle, Star, DollarSign, Target, Mail, Briefcase } from "lucide-react";
import { FactorAI } from "../FactorAI";
import { UserMenu } from "../UserMenu";

interface InvestorPresentationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  pitchData?: any;
  mvpData?: any;
  financialData?: any;
}

export const InvestorPresentationStation = ({ 
  onComplete, 
  onBack,
  pitchData,
  mvpData,
  financialData
}: InvestorPresentationProps) => {
  const [presentationNotes, setPresentationNotes] = useState("");
  const [investorFeedback, setInvestorFeedback] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  // Assigned investor (algorithmic matching result)
  const assignedInvestor = {
    name: "David Rodriguez",
    background: "Managing Partner at TechVentures Capital with 12+ years in venture capital. Led investments in 50+ early-stage startups with 8 unicorn exits. Former founder of a fintech startup that was acquired by Goldman Sachs for $180M. Specializes in SaaS, fintech, and marketplace businesses.",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a",
    email: "david.rodriguez@techventures.com",
    firm: "TechVentures Capital",
    expertise: "Series A & B Investments",
    checkSize: "$1M - $5M",
    portfolio: "50+ companies, 8 unicorns"
  };

  const handleComplete = () => {
    const investorData = {
      investor: assignedInvestor,
      presentationNotes,
      investorFeedback,
      nextSteps,
      presentationDate: new Date().toISOString(),
      duration: "45 minutes",
      outcome: "presentation_completed"
    };
    
    onComplete(investorData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-conveyor relative">
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
          <UserMenu />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left: Section name and icon (bounded left) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Investor Presentation</h1>
                <p className="text-sm text-white/80">Present your startup to potential investors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* Your Investor Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Investor is:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Investor Photo */}
                <div className="flex-shrink-0">
                  <img 
                    src={assignedInvestor.photo}
                    alt={assignedInvestor.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                  />
                </div>
                
                {/* Investor Information */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{assignedInvestor.name}</h2>
                    <p className="text-lg text-primary font-medium">{assignedInvestor.firm}</p>
                    <p className="text-muted-foreground">{assignedInvestor.expertise}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Background:</h3>
                    <p className="text-muted-foreground leading-relaxed">{assignedInvestor.background}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Check Size:</span>
                      <span className="text-foreground">{assignedInvestor.checkSize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="font-medium">Portfolio:</span>
                      <span className="text-foreground">{assignedInvestor.portfolio}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Contact:</span>
                    <a 
                      href={`mailto:${assignedInvestor.email}`}
                      className="text-primary hover:underline"
                    >
                      {assignedInvestor.email}
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presentation Focus Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Key Areas to Cover
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "Market Opportunity & Problem",
                  "Business Model & Revenue",
                  "Traction & Growth Metrics",
                  "Competitive Advantage",
                  "Financial Projections",
                  "Funding Requirements & Use of Capital"
                ].map((area, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
                    <Star className="h-4 w-4 text-accent" />
                    <span className="font-medium">{area}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pre-Presentation Prep */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle>Presentation Materials Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Pitch Deck</h4>
                  <p className="text-sm text-muted-foreground">12-slide investor presentation</p>
                  <Badge variant="outline" className="mt-2">Ready</Badge>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">Financial Model</h4>
                  <p className="text-sm text-muted-foreground">3-year projections & metrics</p>
                  <Badge variant="outline" className="mt-2">Ready</Badge>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">MVP Demo</h4>
                  <p className="text-sm text-muted-foreground">Live product demonstration</p>
                  <Badge variant="outline" className="mt-2">Ready</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presentation Notes */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Presentation Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Key points covered, investor questions, and discussion highlights..."
                  value={presentationNotes}
                  onChange={(e) => setPresentationNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investor Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Investor's comments, concerns, and suggestions..."
                  value={investorFeedback}
                  onChange={(e) => setInvestorFeedback(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Follow-up actions, due diligence requirements, timeline for decision..."
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Schedule Presentation */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Ready to present to your investor?</h3>
                <p className="text-muted-foreground">
                  Schedule your 45-minute presentation to showcase your startup and secure funding
                </p>
                <Button 
                  size="lg"
                  className="px-8"
                  onClick={() => {
                    if (!presentationNotes) setPresentationNotes("Completed investor presentation with David Rodriguez");
                    if (!investorFeedback) setInvestorFeedback("Positive feedback on market opportunity and team");
                    if (!nextSteps) setNextSteps("Awaiting term sheet within 2 weeks");
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Presentation with {assignedInvestor.name}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Complete Presentation */}
          {presentationNotes && investorFeedback && nextSteps && (
            <Card className="border-success bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div>
                      <h3 className="font-semibold">Presentation Complete!</h3>
                      <p className="text-sm text-muted-foreground">
                        Congratulations on completing your investor presentation
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleComplete} className="flex items-center gap-2">
                    Complete Final Station
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Ivie Assistant */}
      <FactorAI currentStation={12} userData={{ pitchData, mvpData, financialData }} context="investor-presentation" />
    </div>
  );