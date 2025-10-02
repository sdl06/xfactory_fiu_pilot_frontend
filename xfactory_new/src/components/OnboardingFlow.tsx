import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Lightbulb, Brain, Target, Users, Smartphone, Globe, Building, Settings, Cog, Zap, CheckCircle, RefreshCw, Download, Loader2 } from "lucide-react";
import { StructuredQuestionnaire } from "./steps/StructuredQuestionnaire";
import { FactorAI } from "./FactorAI";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';

export type BusinessType = "App" | "Product" | "Platform" | "SaaS" | "Service";

export interface OnboardingData {
  hasIdea: boolean;
  businessType: BusinessType | null;
  problem?: string;
  solution?: string;
  target?: string;
  ideaSummary?: string;
  questionnaireData?: any;
  marketOpportunities?: string[];
  userProblems?: string[];
  conceptCard?: any;
  businessModel?: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onBack: () => void;
}

export const OnboardingFlow = ({ onComplete, onBack }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({ hasIdea: false, businessType: null });
  const [isGenerating, setIsGenerating] = useState(false);
  const [elevatorLink, setElevatorLink] = useState('');
  const [elevatorSaved, setElevatorSaved] = useState(false);
  const [showElevatorModal, setShowElevatorModal] = useState(false);
  const { toast } = useToast();

  // No auto-trigger - concept card generation is now manual via button click

  // Function to generate concept card from brainstorming data when API fails
  const generateConceptCardFromBrainstorming = (data: OnboardingData) => {
    const marketOpps = data.marketOpportunities?.filter(o => o.trim()) || [];
    const userProbs = data.userProblems?.filter(p => p.trim()) || [];
    
    // Create business summary from the most compelling market opportunity
    const businessSummary = marketOpps.length > 0 
      ? `AI-powered solution addressing ${marketOpps[0].toLowerCase()}`
      : "AI-powered startup concept based on your analysis";
    
    // Create assumptions from user problems
    const assumptions = userProbs.slice(0, 3).map((problem, index) => ({
      text: problem,
      confidence: 70 + (index * 5), // 70%, 75%, 80%
      testing_plan: `Validate through user interviews and pilot testing with target audience`
    }));
    
    return {
      businessSummary,
      problem: data.problem || data.questionnaireData?.problem_description || "Problem to be defined",
      customerSegment: data.target || data.questionnaireData?.target_who_feels_most || "Target audience based on your analysis",
      existingAlternatives: data.questionnaireData?.current_solutions || "Current market solutions that your analysis identified as insufficient",
      solutionConcept: data.solution || data.questionnaireData?.solution_concept || "Solution approach based on your insights",
      assumptions
    };
  };



  const businessTypes: { type: BusinessType; icon: any; description: string; examples: string[] }[] = [
    {
      type: "App",
      icon: Smartphone,
      description: "Mobile or web applications with user interfaces",
      examples: ["Social media app", "Productivity tool", "Gaming app"]
    },
    {
      type: "Product",
      icon: Building,
      description: "Physical or digital products for consumers",
      examples: ["Hardware device", "Consumer electronics", "Physical goods"]
    },
    {
      type: "Platform",
      icon: Globe,
      description: "Multi-sided marketplace or ecosystem",
      examples: ["Marketplace", "Social network", "Community platform"]
    },
    {
      type: "SaaS",
      icon: Settings,
      description: "Software as a Service for businesses",
      examples: ["Business tools", "Analytics platform", "CRM system"]
    },
    {
      type: "Service",
      icon: Settings,
      description: "Service-based business model",
      examples: ["Consulting", "Agency", "Professional services"]
    }
  ];

  const handleIdeaChoice = async (hasIdea: boolean) => {
    setData(prev => ({ ...prev, hasIdea }));
    if (hasIdea) {
      setStep(2); // Go to problem/solution/target description
    } else {
      setStep(2.5); // Go directly to questionnaire for idea generation
    }
  };



  const handleIdeaSummary = (summary: string) => {
    setData(prev => ({ 
      ...prev, 
      ideaSummary: summary
    }));
    setStep(3); // Go directly to brainstorming
  };

  const handleBusinessTypeChoice = async (businessType: BusinessType) => {
    const finalData = { ...data, businessType };
    setData(finalData);
    
    // Go directly to factory after business type selection
    onComplete(finalData);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    // Optional: could hook to brainstorming or different endpoint here if needed
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsGenerating(false);
  };

  const handleAIRegenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsGenerating(false);
  };

  const loadElevatorPitch = async () => {
    try {
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (teamId) {
        const res = await apiClient.getElevatorPitchSubmission(teamId);
        const d: any = res?.data || {};
        if (typeof d.google_drive_link === 'string') setElevatorLink(d.google_drive_link);
        setElevatorSaved(!!d.submitted);
      }
    } catch {
      try {
        const v = localStorage.getItem('xfactoryElevatorPitchLink');
        if (v) {
          setElevatorLink(v);
          setElevatorSaved(true);
        }
      } catch {}
    }
  };

  const submitElevatorPitch = async () => {
    try {
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (teamId && elevatorLink.trim()) {
        const res = await apiClient.submitElevatorPitch(teamId, elevatorLink.trim());
        if (res.status >= 200 && res.status < 300) {
          setElevatorSaved(true);
          try { localStorage.setItem('xfactoryElevatorPitchLink', elevatorLink.trim()); } catch {}
          // Mark ideation as done by completing onboarding and navigate to production flow
          setShowElevatorModal(false);
          onComplete({ ...data, hasIdea: true });
          return;
        }
      }
    } catch {}
    try {
      if (elevatorLink.trim()) {
        localStorage.setItem('xfactoryElevatorPitchLink', elevatorLink.trim());
        setElevatorSaved(true);
        setShowElevatorModal(false);
        onComplete({ ...data, hasIdea: true });
      }
    } catch {}
  };

  // Auto-resume questionnaire if user left mid-way in the help path
  useEffect(() => {
    try {
      if (step === 1) {
        const uid = localStorage.getItem('authUserEmail') || 'anon';
        const localKey = `xfactory_questionnaire_${uid}_no_team`;
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.answers && typeof parsed.answers === 'object') {
            setData(prev => ({ ...prev, hasIdea: false }));
            setStep(2.5);
          }
        }
      }
    } catch {}
  }, [step]);

  // Removed: auto-jump to concept card on mount. Users should only reach the
  // concept card after completing prior steps or when re-entering with saved flow.

  const handleBack = () => {
    if (step === 1) {
      onBack();
      return;
    }
    // From concept card step, go back to manual brainstorming
    if (step === 4) {
      setStep(3);
      return;
    }
    // From manual brainstorming step, go back to previous step
    if (step === 3) {
      if (data.hasIdea) {
        setStep(2); // Back to define concept
      } else {
        setStep(2.5); // Back to questionnaire
      }
      return;
    }
    // From questionnaire step, go back to initial choice
    if (step === 2.5) {
      setStep(1);
      return;
    }
    // From define concept step, go back to initial choice
    if (step === 2) {
      setStep(1);
      return;
    }
    setStep(Math.max(1, step - 1));
  };



  return (
    <div className={`min-h-screen bg-background ${step === 2.5 ? "px-2 sm:px-4 lg:px-6 xl:px-8 py-0" : "p-6"}`}>
      <div className={step === 4 ? "max-w-[1450px] mx-auto" : step === 2.5 ? "w-full" : "max-w-2xl mx-auto"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={step >= 1 ? "default" : "secondary"}>1</Badge>
            <div className="w-8 h-0.5 bg-border"></div>
            <Badge variant={step >= 2 ? "default" : "secondary"}>2</Badge>
                <div className="w-8 h-0.5 bg-border"></div>
                <Badge variant={step >= 3 ? "default" : "secondary"}>3</Badge>
                    <div className="w-8 h-0.5 bg-border"></div>
                    <Badge variant={step >= 4 ? "default" : "secondary"}>4</Badge>
          </div>
          {/* Step Labels */}
          <div className="text-center mt-2">
            {step === 1 && "Choose Path"}
            {step === 2 && data.hasIdea && "Define Concept"}
            {step === 2.5 && !data.hasIdea && "Questionnaire"}
            {step === 3 && "Brainstorm"}
            {step === 4 && "Concept Card"}
          </div>
        </div>

        {/* Loading Screen for No Idea Path */}
        {isGenerating && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Lightbulb className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Generating Your Idea...</CardTitle>
              <CardDescription className="text-lg">
                Our AI is crafting a personalized startup concept for you
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Do you have an idea? */}
        {step === 1 && !isGenerating && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Let's start your journey</CardTitle>
              <CardDescription className="text-lg">
                Do you already have a startup idea, or would you like us to help you generate one?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-16 text-left justify-start"
                onClick={() => handleIdeaChoice(true)}
              >
                <div>
                  <div className="font-semibold">I have an idea</div>
                  <div className="text-sm text-muted-foreground">I know what I want to build</div>
                </div>
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-16 text-left justify-start"
                onClick={() => {
                  setData(prev => ({ ...prev, hasIdea: false }));
                  setStep(2.5);
                }}
              >
                <div>
                  <div className="font-semibold">Help me generate an idea</div>
                  <div className="text-sm text-muted-foreground">I need inspiration and guidance</div>
                </div>
                <ArrowRight className="ml-auto h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Simple Idea Input (if they have an idea) */}
        {step === 2 && data.hasIdea && (
            <Card className="animate-fade-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Define Your Concept</CardTitle>
                <CardDescription>
                  Describe your idea in three key areas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-4 mt-6">
                  <div>
                    <Label>Problem Statement</Label>
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What problem are you solving?"
                      value={data.problem || ""}
                      onChange={(e) => setData(prev => ({ ...prev, problem: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Solution Approach</Label>
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="How do you solve this problem?"
                      value={data.solution || ""}
                      onChange={(e) => setData(prev => ({ ...prev, solution: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Target Audience</Label>
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Who is your target market?"
                      value={data.target || ""}
                      onChange={(e) => setData(prev => ({ ...prev, target: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Business Model</Label>
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="How will you make money?"
                      value={data.businessModel || ""}
                      onChange={(e) => setData(prev => ({ ...prev, businessModel: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="flex-1 mr-4"
                      onClick={async () => {
                        try {
                          // Save the user input to the team's problem-solution endpoint
                          const status = await apiClient.get('/team-formation/status/');
                          const teamId = (status as any)?.data?.current_team?.id;
                          if (teamId) {
                            // Update the team's problem-solution with user input
                            const result = await apiClient.axiosSetTeamIdeaInputs(teamId, {
                              input_problem: data.problem || '',
                              input_solution: data.solution || '',
                              input_target_audience: data.target || ''
                            });
                            
                            if (result.status >= 200 && result.status < 300) {
                            } else {
                            }
                          }
                        } catch (error) {
                        }
                        
                        const summary = `Problem: ${data.problem || ''}\nSolution: ${data.solution || ''}\nTarget: ${data.target || ''}\nBusiness Model: ${data.businessModel || ''}`;
                        handleIdeaSummary(summary);
                      }}
                      disabled={!data.problem?.trim() || !data.solution?.trim() || !data.target?.trim()}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    

                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {/* Step 2.5: Structured Questionnaire (Help me generate an idea) */}
        {step === 2.5 && !data.hasIdea && (
          <StructuredQuestionnaire
            teamId={null} // No teamId needed for this flow
            onComplete={async (questionnaireData) => {
              // Skip brainstorming entirely; save and generate concept card immediately
              setIsGenerating(true);
              try {
                setData(prev => ({ ...prev, questionnaireData }));
                // Resolve team
                const status = await apiClient.get('/team-formation/status/');
                const teamId = (status as any)?.data?.current_team?.id;
                if (teamId) {
                  // Persist questionnaire answers server-side
                  try { await apiClient.post('/ideation/structured-idea-input/', { team_id: teamId, ...questionnaireData }); } catch {}

                  // Build payload from questionnaire
                  const payload: any = {
                    problem: questionnaireData?.problem_description || '',
                    solution: questionnaireData?.solution_concept || '',
                    target: questionnaireData?.target_who_feels_most || '',
                    business_model: questionnaireData?.bm_overview || questionnaireData?.bm_money_flow || '',
                    bm_who_pays: questionnaireData?.bm_who_pays || questionnaireData?.section_7?.bm_who_pays || '',
                    bm_money_flow: questionnaireData?.bm_money_flow || questionnaireData?.section_7?.bm_money_flow || '',
                    bm_costs: questionnaireData?.bm_costs || questionnaireData?.section_7?.bm_costs || '',
                    bm_growth: questionnaireData?.bm_growth || questionnaireData?.section_7?.bm_growth || ''
                  };

                  // Generate concept card
                  const response = await apiClient.post(`/ideation/teams/${teamId}/concept-card/`, payload);
                  if (response.status >= 200 && response.status < 300) {
                    const conceptData: any = response.data || {};
                    setData(prev => ({
                      ...prev,
                      conceptCard: {
                        businessSummary: conceptData.title || 'AI-powered startup concept',
                        problem: conceptData.problem || payload.problem,
                        customerSegment: conceptData.target_audience || conceptData.primary_persona?.brief_description || payload.target,
                        existingAlternatives: conceptData.current_solutions || questionnaireData?.current_solutions || '',
                        solutionConcept: conceptData.solution || payload.solution,
                        businessModel: conceptData.business_model || payload.business_model || '',
                        assumptions: Array.isArray(conceptData.assumptions) ? conceptData.assumptions : []
                      }
                    }));
                  } else {
                    // Fallback minimal concept data if API fails
                    setData(prev => ({
                      ...prev,
                      conceptCard: {
                        businessSummary: 'AI-powered startup concept',
                        problem: payload.problem,
                        customerSegment: payload.target,
                        existingAlternatives: questionnaireData?.current_solutions || '',
                        solutionConcept: payload.solution,
                        businessModel: payload.business_model || '',
                        assumptions: []
                      }
                    }));
                  }
                }
              } catch (e) {
                // Fallback to concept card from local data
                const conceptCard = generateConceptCardFromBrainstorming({ ...data, questionnaireData });
                setData(prev => ({ ...prev, conceptCard }));
              } finally {
                setIsGenerating(false);
                setStep(4);
              }
            }}
            onBack={() => setStep(1)}
          />
        )}

        {/* Step 3: Manual Brainstorming (kept only for "I have an idea" path) */}
        {step === 3 && data.hasIdea && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Brainstorm</CardTitle>
              <CardDescription>
                Now let's think through your idea systematically. This is a critical thinking exercise.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <p className="text-lg text-muted-foreground">
                  Based on your {data.hasIdea ? 'idea' : 'questionnaire answers'}, let's identify market opportunities and user problems.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Market Opportunities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-center">Market Opportunities</h3>
                  <div className="space-y-3">
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What market opportunities do you see based on your problem analysis?"
                      value={data.marketOpportunities?.[0] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        marketOpportunities: [e.target.value, prev.marketOpportunities?.[1] || "", prev.marketOpportunities?.[2] || ""]
                      }))}
                    />
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What other opportunities exist in this space?"
                      value={data.marketOpportunities?.[1] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        marketOpportunities: [prev.marketOpportunities?.[0] || "", e.target.value, prev.marketOpportunities?.[2] || ""]
                      }))}
                    />
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What trends or changes create new opportunities?"
                      value={data.marketOpportunities?.[2] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        marketOpportunities: [prev.marketOpportunities?.[0] || "", prev.marketOpportunities?.[1] || "", e.target.value]
                      }))}
                    />
                  </div>
                </div>
                
                {/* User Problems */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-center">User Problems</h3>
                  <div className="space-y-3">
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What specific problems do users face?"
                      value={data.userProblems?.[0] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        userProblems: [e.target.value, prev.userProblems?.[1] || "", prev.userProblems?.[2] || ""]
                      }))}
                    />
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What pain points are most critical?"
                      value={data.userProblems?.[1] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        userProblems: [prev.userProblems?.[0] || "", e.target.value, prev.userProblems?.[2] || ""]
                      }))}
                    />
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="What problems are currently underserved?"
                      value={data.userProblems?.[2] || ""}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        userProblems: [prev.userProblems?.[0] || "", prev.userProblems?.[1] || "", e.target.value]
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="text-center pt-4">
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      // Generate concept card using the brainstorming data
                      const status = await apiClient.get('/team-formation/status/');
                      const teamId = (status as any)?.data?.current_team?.id;
                      if (teamId) {
                        // First save the brainstorming data if we have questionnaire data
                        if (data.questionnaireData) {
                          try {
                            await apiClient.post('/ideation/structured-idea-input/', {
                              team_id: teamId,
                              ...data.questionnaireData
                            });
                          } catch (error) {
                            console.log('Questionnaire data save failed, continuing with concept card generation');
                          }
                        }
                        
                        // Generate concept card using brainstorming insights
                        const brainstormingData: any = {
                          market_opportunities: data.marketOpportunities?.filter(o => o.trim()) || [],
                          user_problems: data.userProblems?.filter(p => p.trim()) || [],
                          problem: data.problem || "",
                          solution: data.solution || "",
                          target: data.target || "",
                          business_model: data.businessModel || ""
                        };
                        
                        // If we have questionnaire data, use it to enhance the concept card
                        if (data.questionnaireData) {
                          Object.assign(brainstormingData, {
                            problem: data.questionnaireData.problem_description || data.problem || "",
                            solution: data.questionnaireData.solution_concept || data.solution || "",
                            target: data.questionnaireData.target_who_feels_most || data.target || "",
                            // Business model & growth signals from questionnaire (supports section_7 or section_8)
                            bm_who_pays: data.questionnaireData?.bm_who_pays || data.questionnaireData?.section_7?.bm_who_pays || data.questionnaireData?.section_8?.bm_who_pays || "",
                            bm_money_flow: data.questionnaireData?.bm_money_flow || data.questionnaireData?.section_7?.bm_money_flow || data.questionnaireData?.section_8?.bm_money_flow || "",
                            bm_costs: data.questionnaireData?.bm_costs || data.questionnaireData?.section_7?.bm_costs || data.questionnaireData?.section_8?.bm_costs || "",
                            bm_growth: data.questionnaireData?.bm_growth || data.questionnaireData?.section_7?.bm_growth || data.questionnaireData?.section_8?.bm_growth || ""
                          });
                        }
                        
                        try {
                          const response = await apiClient.post('/ideation/teams/' + teamId + '/concept-card/', brainstormingData);
                          
                                                  if (response.status >= 200 && response.status < 300) {
                          // Parse the concept card data and store it
                          const conceptData = response.data;
                          setData(prev => ({
                            ...prev,
                            conceptCard: {
                              businessSummary: conceptData.title || "AI-powered startup concept",
                              problem: conceptData.problem || data.problem || data.questionnaireData?.problem_description || "Problem to be defined",
                              customerSegment: conceptData.target_audience || conceptData.primary_persona?.brief_description || data.target || data.questionnaireData?.target_who_feels_most || "Target audience based on your analysis",
                              existingAlternatives: conceptData.current_solutions || data.questionnaireData?.current_solutions || "Current market solutions that your analysis identified as insufficient",
                              solutionConcept: conceptData.solution || data.solution || data.questionnaireData?.solution_concept || "Solution approach based on your insights",
                              businessModel: conceptData.business_model || data.businessModel || '',
                              assumptions: conceptData.assumptions || []
                            }
                          }));
                        } else {
                          throw new Error(`API returned status ${response.status}`);
                        }
                        } catch (apiError) {
                          console.error('Concept card API failed, using brainstorming data:', apiError);
                          // Generate concept card from brainstorming data directly
                          const conceptCard = generateConceptCardFromBrainstorming(data);
                          setData(prev => ({
                            ...prev,
                            conceptCard
                          }));
                        }
                      }
                    } catch (error) {
                      console.error('Failed to generate concept card:', error);
                      // Generate concept card from brainstorming data as fallback
                      const conceptCard = generateConceptCardFromBrainstorming(data);
                      setData(prev => ({
                        ...prev,
                        conceptCard
                      }));
                    } finally {
                      setIsGenerating(false);
                      setStep(4);
                    }
                  }}
                  disabled={!data.marketOpportunities?.[0]?.trim() || !data.userProblems?.[0]?.trim()}
                >
                  Generate Concept Card
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


                {/* Step 4: Concept Card Generation and Display (for both paths) */}
        {step === 4 && (
          <div className="animate-fade-in">
            <Card className="border rounded-2xl shadow-xl bg-white w-full max-w-[1600px] mx-auto">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Lightbulb className="h-10 w-10 text-white" />
              </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Your Startup Concept
                </CardTitle>
                <CardDescription className="text-lg text-slate-600">
                  Here's your AI-powered startup concept based on your analysis
              </CardDescription>
            </CardHeader>
              
              {isGenerating ? (
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-600 text-lg font-medium">Crafting your concept card...</p>
                  <p className="text-slate-500 text-sm mt-2">Analyzing your insights and market opportunities</p>
                </CardContent>
              ) : (
                <CardContent className="space-y-8 px-8 pb-8" id="onboarding-concept-card-export">
                  {/* Header row (icon + title + Concept Card) */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow">
                      <Lightbulb className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{data.conceptCard?.businessSummary || 'AI-powered startup concept'}</div>
                      <div className="text-sm text-slate-500">Concept Card</div>
                    </div>
                  </div>

                  {/* Landscape content rows */}
                  {/* Row 2: Problem - Current Solutions - Solution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Problem</Label>
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{data.conceptCard?.problem || 'Problem to be defined based on AI analysis'}</p>
                      </div>
                    </div>
                    <div className="group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Current Solutions</Label>
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{data.conceptCard?.existingAlternatives || 'Market solutions as identified by AI analysis'}</p>
                      </div>
                    </div>
                    <div className="group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Solution</Label>
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{data.conceptCard?.solutionConcept || 'Solution approach based on AI insights'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Target Audience - Business Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Target Audience</Label>
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{data.conceptCard?.customerSegment || 'Target audience based on AI analysis'}</p>
                      </div>
                    </div>
                    <div className="group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Business Model</Label>
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{data.conceptCard?.businessModel || 'How this makes money, key costs, and growth path'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Assumptions with progress bars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(
                      data.conceptCard?.assumptions && data.conceptCard.assumptions.length > 0
                        ? data.conceptCard.assumptions.slice(0, 3)
                        : [
                            { text: 'Key assumption 1 based on your analysis', confidence: 75 },
                            { text: 'Key assumption 2 based on your analysis', confidence: 80 },
                            { text: 'Key assumption 3 based on your analysis', confidence: 85 },
                          ]
                    ).map((a: any, i: number) => {
                      const conf = Math.max(0, Math.min(100, typeof a?.confidence === 'number' ? a.confidence : (75 + i * 5)));
                      const text = typeof a === 'string' ? a : (a?.text || 'Assumption');
                      return (
                        <div key={i} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                          <div className="text-slate-700 font-semibold mb-2">{text}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${conf}%` }} />
                            </div>
                            <div className="text-sm text-slate-600 min-w-[3rem] text-right">{conf}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                

                  {/* CTA Section */}
                  <div className="text-center pt-8 flex flex-col gap-3 items-center">
                    <Button 
                      variant="default" 
                      size="lg"
                      onClick={async () => { setShowElevatorModal(true); try { await loadElevatorPitch(); } catch {} }}
                      disabled={isGenerating}
                      className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      Ready to Pitch
                      <ArrowRight className="ml-2 h-5 w-4" />
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      try {
                        const el = document.getElementById('onboarding-concept-card-export');
                        if (!el) return;
                        const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
                        canvas.toBlob((blob) => {
                          if (!blob) return;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `concept-card-${(data.conceptCard?.businessSummary || 'startup').replace(/[^a-z0-9]/gi, '-')}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }, 'image/png');
                      } catch (e) { console.error('Export failed', e); }
                    }}>Save as Image</Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}


        {/* FactorAI Assistant */}
        <FactorAI 
          currentStation={0} 
          userData={{ 
            step, 
            hasIdea: data.hasIdea, 
            ideaSummary: data.ideaSummary,
            businessType: data.businessType,
            isGenerating
          }} 
          context="onboarding"
          onGenerate={handleAIGenerate}
          onRegenerate={handleAIRegenerate}
          canGenerate={step === 1 || (step === 2 && !data.ideaSummary?.trim())}
          canRegenerate={step === 2 && data.ideaSummary?.trim() !== ""}
          isGenerating={isGenerating}
        />

        {/* Elevator Pitch Submission Modal */}
        <Dialog open={showElevatorModal} onOpenChange={(open) => { setShowElevatorModal(open); if (open) { try { loadElevatorPitch(); } catch {} } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between w-full">
                <span>Submit Your Elevator Pitch</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/10 text-sm text-muted-foreground">
                Record a 2-minute elevator pitch of your idea. Upload it to Google Drive and paste the link below. Make sure the link is set to "Anyone with the link can view" so admins can review it.
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={elevatorLink}
                  onChange={(e) => setElevatorLink(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border bg-card text-card-foreground"
                />
                <Button onClick={submitElevatorPitch} disabled={!elevatorLink?.trim()}>
                  Submit Link
                </Button>
                <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
              </div>
              {elevatorSaved && (
                <p className="text-xs text-green-600">Link saved. You can update it anytime.</p>
              )}
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
