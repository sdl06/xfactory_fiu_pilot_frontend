import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  Users, 
  Lightbulb, 
  MessageSquare, 
  ChevronUp, 
  ChevronDown,
  Save
} from "lucide-react";
import { apiClient } from "@/lib/api";

// Import the same mapping function used by interview kit
const mapInterviewKit = (raw: any) => {
  console.log('DEBUG: mapInterviewKit called with raw data:', raw);
  if (!raw) return null;
  const data = raw.data || raw;
  console.log('DEBUG: mapInterviewKit data:', data);
  const user_personas = data.user_personas || data.interview_profiles || [];
  console.log('DEBUG: mapInterviewKit user_personas:', user_personas);
  const demographic_questions = data.demographic_questions || data.warm_up_questions || [];
  const market_validation_questions = data.market_validation_questions || [];
  const solution_questions = data.solution_questions || data.solution_feedback_questions || [];
  const result = {
    user_personas,
    demographic_questions,
    behavioral_questions: data.behavioral_questions || market_validation_questions,
    pain_point_questions: data.pain_point_questions || market_validation_questions,
    solution_questions,
    market_questions: data.market_questions || market_validation_questions,
    persona_validation_questions: data.persona_validation_questions || [],
    interview_strategy: data.interview_strategy || '',
    target_interview_count: data.target_interview_count || 15,
    interview_duration: data.interview_duration || '30-45 minutes',
  };
  console.log('DEBUG: mapInterviewKit result:', result);
  return result;
};

interface FocusGroupKitProps {
  ideaCard?: {
    painPoint?: string;
    problem?: string;
    solution?: string;
    targetAudience?: string;
  };
  teamId?: number;
  ideaId?: number;
  deepResearch?: any;
  onSaveFocusGroup: () => void;
  isValidating?: boolean;
  personaKit?: any; // Use the same personas as interview kit
}

interface Persona {
  name: string;
  age_range: string;
  occupation: string;
  tech_level?: string;
  pain_points?: string[];
  goals?: string[];
  characteristics?: string[];
  brief_description?: string;
  description?: string;
  age?: string;
}

interface FocusGroupData {
  introduction_prompts: string[];
  warmup_prompts: string[];
  opening_prompts: string[];
  key_discussion_prompts: string[];
  market_prompts: string[];
  persona_validation_prompts: string[];
  moderator_strategy: string;
  target_participant_count: number;
  session_duration: string;
  followup_prompts: string[];
  closing_prompts: string[];
}

export const FocusGroupKit: React.FC<FocusGroupKitProps> = ({
  ideaCard,
  teamId,
  ideaId,
  deepResearch,
  onSaveFocusGroup,
  isValidating = false,
  personaKit
}) => {
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [focusGroupData, setFocusGroupData] = useState<FocusGroupData | null>(null);
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load existing focus group data on component mount
  useEffect(() => {
    const loadFocusGroupData = async () => {
      if (!teamId) return;
      
      setIsLoading(true);
      try {
        // 1) Use personas from personaKit prop (same as interview kit)
        if (personaKit?.user_personas) {
          setPersonas(personaKit.user_personas);
        }

        // 2) Load focus group guide (team-scoped); if missing, auto-generate then re-fetch
        let hasData = false;
        try {
          const fgRes = await apiClient.get(`/validation/teams/${teamId}/focus-group/`);
          if (fgRes?.data?.success && fgRes.data.data) {
            setFocusGroupData(fgRes.data.data);
            hasData = true;
          }
        } catch {}
        if (!hasData) {
          try {
            const contextData = {
              idea_info: {
                problem: ideaCard?.problem || '',
                solution: ideaCard?.solution || '',
                target_audience: ideaCard?.targetAudience || '',
                pain_point: ideaCard?.painPoint || ''
              },
              secondary_research: deepResearch ? {
                market_insights: deepResearch.market_insights || '',
                competitor_analysis: deepResearch.competitor_analysis || '',
                trends: deepResearch.trends || ''
              } : null
            };
            const genRes = await apiClient.post(`/validation/teams/${teamId}/focus-group/generate/`, contextData);
            const payload = (genRes as any)?.data?.data || {};
            if (payload?.focus_group) setFocusGroupData(payload.focus_group);
            else {
              try {
                const fgRes2 = await apiClient.get(`/validation/teams/${teamId}/focus-group/`);
                if (fgRes2?.data?.success) setFocusGroupData(fgRes2.data.data || null);
              } catch {}
            }
            if (payload?.persona) {
              const mappedPersona = mapInterviewKit({ data: payload.persona });
              if (mappedPersona?.user_personas) setPersonas(mappedPersona.user_personas);
            }
          } catch (e) {
            console.error('Auto-generate focus group failed:', e);
          }
        }

        // 3) Load saved focus group insights
        try {
          const fgi = await apiClient.getFocusGroupInsightsTeam(teamId);
          const fgiData: any = (fgi as any)?.data || {};
          const fgiInsightsArr = Array.isArray(fgiData?.data) ? fgiData.data : [];
          if (fgiInsightsArr.length > 0) {
            const newInsights: Record<string, string> = {};
            fgiInsightsArr.forEach((insight: any) => {
              // The question field contains the key (e.g., "problem_0", "solution_1")
              newInsights[insight.question] = insight.insight;
            });
            setInsights(newInsights);
            console.log('Loaded focus group insights:', newInsights);
          }
        } catch (e) {
          console.log('No saved focus group insights found:', e);
        }
      } catch (error) {
        console.error('Failed to load focus group data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we have the required data
    if (teamId) {
      loadFocusGroupData();
    }
  }, [teamId, personaKit]);

  // Generate focus group data if not available (called automatically)
  const generateFocusGroupData = async () => {
    if (!teamId) return;
    
    try {
      // Generate focus group data with idea info and secondary research context
      const contextData = {
        idea_info: {
          problem: ideaCard?.problem || '',
          solution: ideaCard?.solution || '',
          target_audience: ideaCard?.targetAudience || '',
          pain_point: ideaCard?.painPoint || ''
        },
        secondary_research: deepResearch ? {
          market_insights: deepResearch.market_insights || '',
          competitor_analysis: deepResearch.competitor_analysis || '',
          trends: deepResearch.trends || ''
        } : null
      };

      const genRes = await apiClient.post(`/validation/teams/${teamId}/focus-group/generate/`, contextData);
      const payload = (genRes as any)?.data?.data || {};
      
      // Use the same mapping function as interview kit for personas
      if (payload?.persona) {
        const mappedPersona = mapInterviewKit({ data: payload.persona });
        if (mappedPersona?.user_personas) {
          setPersonas(mappedPersona.user_personas);
        }
      }
      
      if (payload?.focus_group) {
        setFocusGroupData(payload.focus_group);
      } else {
        // Fallback: fetch the generated guide
        try {
          const fgRes = await apiClient.get(`/validation/teams/${teamId}/focus-group/`);
          if (fgRes?.data?.success) setFocusGroupData(fgRes.data.data || null);
        } catch {}
      }
    } catch (error) {
      console.error('Failed to generate focus group data:', error);
    }
  };

  const handleInsightChange = (questionKey: string, value: string) => {
    setInsights(prev => ({
      ...prev,
      [questionKey]: value
    }));
    
    // Auto-save insights as user types (debounced)
    clearTimeout((window as any).focusGroupSaveTimeout);
    (window as any).focusGroupSaveTimeout = setTimeout(() => {
      saveFocusGroupInsights();
    }, 1000);
  };

  const saveFocusGroupInsights = async () => {
    if (!teamId) return;
    
    try {
      const insightsData = Object.entries(insights).map(([questionKey, insight]) => {
        // Map question keys to proper sections
        let section = 'focus_group_insights';
        if (questionKey.startsWith('problem_')) {
          section = 'problem';
        } else if (questionKey.startsWith('solution_')) {
          section = 'solution';
        } else if (questionKey.startsWith('pricing_')) {
          section = 'pricing';
        }
        
        return {
          section,
          question: questionKey,
          insight
        };
      });

      await apiClient.saveFocusGroupInsightsOnlyTeam(teamId, insightsData);
      
      // Don't call onSaveFocusGroup here - that's handled by the complete button
    } catch (error) {
      console.error('Failed to save focus group insights:', error);
    }
  };

  // Default personas if none loaded (matching interview kit structure)
  const defaultPersonas: Persona[] = [
    {
      name: "Tech-Savvy Professional",
      age_range: "28-35",
      occupation: "Remote worker",
      brief_description: ideaCard?.painPoint || "Efficiency challenges - Streamline workflows"
    },
    {
      name: "Team Lead", 
      age_range: "35-45",
      occupation: "Hybrid worker",
      brief_description: "Team coordination - Better team visibility"
    },
    {
      name: "Small Business Owner",
      age_range: "30-50", 
      occupation: "In-office/hybrid",
      brief_description: "Resource optimization - Cost-effective solutions"
    }
  ];

  const displayPersonas = personas.length > 0 ? personas : defaultPersonas;

  if (isLoading || isValidating) {
    return (
      <Card className="shadow-machinery">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isValidating ? 'Generating focus group data...' : 'Loading focus group data...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-machinery">
      {/* PDF Download Section - Wide Window */}
      {focusGroupData && (
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-center">
            <Button
              variant="machinery"
              size="lg"
              onClick={() => {
                // Open generated PDF guide (placeholder for now)
                window.open('#', '_blank');
              }}
              className="w-full max-w-2xl"
            >
              <FileText className="mr-2 h-5 w-5" />
              Download Complete Focus Group PDF Guide
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-6">
        {/* Two Tall Headers: Personas and Questions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* Left: Personas */}
          <Card className="border-2 border-dashed border-success/20 bg-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Users className="h-5 w-5" />
                Target Personas
              </CardTitle>
              <CardDescription>Focus group participants matching your target market</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayPersonas.map((persona, index) => (
                <div key={index} className="p-4 rounded-lg bg-gradient-machinery/10 border border-success/10">
                  <h4 className="font-semibold mb-3 text-primary">Profile {index + 1}: {persona.name}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Age:</span>
                      <p>{persona.age_range || persona.age || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Occupation:</span>
                      <p>{persona.occupation || '-'}</p>
                    </div>
                    {persona.tech_level && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">Tech Level:</span>
                        <p>{persona.tech_level}</p>
                      </div>
                    )}
                    {persona.pain_points && persona.pain_points.length > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">Pain Points:</span>
                        <p>{persona.pain_points.join(', ')}</p>
                      </div>
                    )}
                    {persona.goals && persona.goals.length > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">Goals:</span>
                        <p>{persona.goals.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Right: Questions with Individual Insight Fields */}
          <div className="space-y-4 overflow-y-auto">
            <Card className="border-2 border-dashed border-info/20 bg-info/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-info">
                  <Lightbulb className="h-5 w-5" />
                  Key Questions & Insights
                </CardTitle>
                <CardDescription>Questions to ask and capture responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Problem Validation</h4>
                    <div className="space-y-4">
                      {focusGroupData?.opening_prompts?.slice(0, 3).map((question, index) => (
                        <div key={index}>
                          <p className="text-sm text-muted-foreground mb-2">• "{question}"</p>
                          <Textarea
                            value={insights[`problem_${index}`] || ''}
                            onChange={(e) => handleInsightChange(`problem_${index}`, e.target.value)}
                            placeholder="Record insights from this question..."
                            className="h-16 resize-none text-xs"
                          />
                        </div>
                      )) || (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "How often do you encounter {ideaCard?.problem || 'this problem'}?"</p>
                            <Textarea
                              value={insights['problem_0'] || ''}
                              onChange={(e) => handleInsightChange('problem_0', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "What have you tried to solve this?"</p>
                            <Textarea
                              value={insights['problem_1'] || ''}
                              onChange={(e) => handleInsightChange('problem_1', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "On a scale of 1-10, how frustrating is this?"</p>
                            <Textarea
                              value={insights['problem_2'] || ''}
                              onChange={(e) => handleInsightChange('problem_2', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveFocusGroupInsights}
                        className="text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Problem Insights
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Solution Feedback</h4>
                    <div className="space-y-4">
                      {focusGroupData?.key_discussion_prompts?.slice(0, 3).map((question, index) => (
                        <div key={index}>
                          <p className="text-sm text-muted-foreground mb-2">• "{question}"</p>
                          <Textarea
                            value={insights[`solution_${index}`] || ''}
                            onChange={(e) => handleInsightChange(`solution_${index}`, e.target.value)}
                            placeholder="Record insights from this question..."
                            className="h-16 resize-none text-xs"
                          />
                        </div>
                      )) || (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "What's your first impression of {ideaCard?.solution || 'this solution'}?"</p>
                            <Textarea
                              value={insights['solution_0'] || ''}
                              onChange={(e) => handleInsightChange('solution_0', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "Would this solve your {ideaCard?.problem || 'problem'}?"</p>
                            <Textarea
                              value={insights['solution_1'] || ''}
                              onChange={(e) => handleInsightChange('solution_1', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "How likely are you to use this? (1-10)"</p>
                            <Textarea
                              value={insights['solution_2'] || ''}
                              onChange={(e) => handleInsightChange('solution_2', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveFocusGroupInsights}
                        className="text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Solution Insights
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Pricing & Adoption</h4>
                    <div className="space-y-4">
                      {focusGroupData?.market_prompts?.slice(0, 2).map((question, index) => (
                        <div key={index}>
                          <p className="text-sm text-muted-foreground mb-2">• "{question}"</p>
                          <Textarea
                            value={insights[`pricing_${index}`] || ''}
                            onChange={(e) => handleInsightChange(`pricing_${index}`, e.target.value)}
                            placeholder="Record insights from this question..."
                            className="h-16 resize-none text-xs"
                          />
                        </div>
                      )) || (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "What would you expect to pay?"</p>
                            <Textarea
                              value={insights['pricing_0'] || ''}
                              onChange={(e) => handleInsightChange('pricing_0', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">• "Who makes the purchase decision?"</p>
                            <Textarea
                              value={insights['pricing_1'] || ''}
                              onChange={(e) => handleInsightChange('pricing_1', e.target.value)}
                              placeholder="Record insights from this question..."
                              className="h-16 resize-none text-xs"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveFocusGroupInsights}
                        className="text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Pricing Insights
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Collapsible Example Focus Group Script */}
        <Collapsible open={isScriptExpanded} onOpenChange={setIsScriptExpanded} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Example Focus Group Script
              </div>
              {isScriptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="border-2 border-dashed border-info/20 bg-info/5">
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="font-semibold text-primary mb-2">Opening (5 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Welcome everyone! Thank you for taking the time to join us today."</p>
                    <p>"We're here to discuss {ideaCard?.solution || 'our solution'} and get your honest feedback."</p>
                    <p>"There are no right or wrong answers - we want to hear your true thoughts."</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Ice Breaker (10 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Let's start by going around the room. Please share your name and what you do for work."</p>
                    <p>"What's one tool or app you use daily that makes your work easier?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Problem Discussion (15 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Now I'd like to talk about {ideaCard?.problem || 'the problem area'}..."</p>
                    <p>"How do you currently handle {ideaCard?.problem || 'this specific problem'}?"</p>
                    <p>"What frustrates you most about existing solutions?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Solution Presentation (20 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"I'd like to show you a concept we're working on..."</p>
                    <p>"What's your first impression?"</p>
                    <p>"How would this fit into your current workflow?"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Focus Group insights are saved automatically as user types */}
      </CardContent>
    </Card>
  );
};
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Let's start by going around the room. Please share your name and what you do for work."</p>
                    <p>"What's one tool or app you use daily that makes your work easier?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Problem Discussion (15 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Now I'd like to talk about {ideaCard?.problem || 'the problem area'}..."</p>
                    <p>"How do you currently handle {ideaCard?.problem || 'this specific problem'}?"</p>
                    <p>"What frustrates you most about existing solutions?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Solution Presentation (20 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"I'd like to show you a concept we're working on..."</p>
                    <p>"What's your first impression?"</p>
                    <p>"How would this fit into your current workflow?"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Focus Group insights are saved automatically as user types */}
      </CardContent>
    </Card>
  );
};


                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Let's start by going around the room. Please share your name and what you do for work."</p>
                    <p>"What's one tool or app you use daily that makes your work easier?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Problem Discussion (15 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Now I'd like to talk about {ideaCard?.problem || 'the problem area'}..."</p>
                    <p>"How do you currently handle {ideaCard?.problem || 'this specific problem'}?"</p>
                    <p>"What frustrates you most about existing solutions?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Solution Presentation (20 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"I'd like to show you a concept we're working on..."</p>
                    <p>"What's your first impression?"</p>
                    <p>"How would this fit into your current workflow?"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Focus Group insights are saved automatically as user types */}
      </CardContent>
    </Card>
  );
};
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Let's start by going around the room. Please share your name and what you do for work."</p>
                    <p>"What's one tool or app you use daily that makes your work easier?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Problem Discussion (15 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"Now I'd like to talk about {ideaCard?.problem || 'the problem area'}..."</p>
                    <p>"How do you currently handle {ideaCard?.problem || 'this specific problem'}?"</p>
                    <p>"What frustrates you most about existing solutions?"</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">Solution Presentation (20 minutes)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>"I'd like to show you a concept we're working on..."</p>
                    <p>"What's your first impression?"</p>
                    <p>"How would this fit into your current workflow?"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Focus Group insights are saved automatically as user types */}
      </CardContent>
    </Card>
  );
};

