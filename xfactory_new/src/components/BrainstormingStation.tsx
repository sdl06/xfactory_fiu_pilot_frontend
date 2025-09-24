import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Lightbulb, Target, Users, TrendingUp, Brain, Zap } from "lucide-react";
import { FactorAI } from "./FactorAI";

interface BrainstormingStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  ideaData?: any;
}

export const BrainstormingStation = ({ onComplete, onBack, ideaData }: BrainstormingStationProps) => {
  const [activeTab, setActiveTab] = useState("opportunities");
  const [opportunityStatements, setOpportunityStatements] = useState<string[]>([]);
  const [userProblems, setUserProblems] = useState<string[]>([]);
  const [customOpportunity, setCustomOpportunity] = useState("");
  const [customProblem, setCustomProblem] = useState("");

  // Remove AI generation functions - users will input everything manually

  const addCustomOpportunity = () => {
    if (customOpportunity.trim()) {
      setOpportunityStatements(prev => [...prev, customOpportunity.trim()]);
      setCustomOpportunity("");
    }
  };

  const addCustomProblem = () => {
    if (customProblem.trim()) {
      setUserProblems(prev => [...prev, customProblem.trim()]);
      setCustomProblem("");
    }
  };

  const removeOpportunity = (index: number) => {
    setOpportunityStatements(prev => prev.filter((_, i) => i !== index));
  };

  const removeProblem = (index: number) => {
    setUserProblems(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    const brainstormData = {
      opportunityStatements,
      userProblems,
      originalIdea: ideaData,
      completedAt: new Date().toISOString()
    };
    
    onComplete(brainstormData);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                Brainstorming Station
              </h1>
              <p className="text-muted-foreground mt-1">
                Exercise your critical thinking to identify market opportunities and user problems
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">Concept Assembly</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Opportunities
            </TabsTrigger>
            <TabsTrigger value="problems" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              User Problems
            </TabsTrigger>
          </TabsList>

          {/* Market Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Market Opportunity Statements
                </CardTitle>
                <CardDescription>
                  Identify emerging market trends and opportunities in your space
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                  <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Critical Thinking Exercise:</strong> Use your market research and insights to identify opportunities
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Consider trends, gaps in the market, and emerging needs in your industry
                  </p>
                </div>

                {opportunityStatements.length > 0 && (
                  <div className="space-y-2">
                    {opportunityStatements.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="flex-1 text-sm">{opportunity}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeOpportunity(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="Add your own opportunity statement..."
                    value={customOpportunity}
                    onChange={(e) => setCustomOpportunity(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={addCustomOpportunity}
                    disabled={!customOpportunity.trim()}
                    variant="outline"
                    size="sm"
                  >
                    Add Opportunity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Problems Tab */}
          <TabsContent value="problems" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  User Problem Statements
                </CardTitle>
                <CardDescription>
                  Identify specific pain points and challenges your target users face
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Critical Thinking Exercise:</strong> Identify specific pain points your target users face
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Think about frustrations, inefficiencies, and unmet needs in their daily lives
                  </p>
                </div>

                {userProblems.length > 0 && (
                  <div className="space-y-2">
                    {userProblems.map((problem, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <Users className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="flex-1 text-sm">{problem}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeProblem(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="Add your own user problem statement..."
                    value={customProblem}
                    onChange={(e) => setCustomProblem(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={addCustomProblem}
                    disabled={!customProblem.trim()}
                    variant="outline"
                    size="sm"
                  >
                    Add Problem
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Complete Section */}
        {opportunityStatements.length > 0 && userProblems.length > 0 && (
          <Card className="border-success bg-success/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Brainstorming Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      {opportunityStatements.length} opportunities and {userProblems.length} problems identified
                    </p>
                  </div>
                </div>
                <Button onClick={handleComplete} className="flex items-center gap-2">
                  Complete Brainstorming
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FactorAI Assistant */}
        <FactorAI 
          currentStation={-1}
          userData={{ ideaData, opportunityStatements, userProblems }}
          context="brainstorming"
          isGenerating={false}
        />
      </div>
    </div>
  );
};