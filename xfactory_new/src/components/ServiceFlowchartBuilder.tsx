import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, ArrowRight, Plane, Settings, Users, Monitor, 
  Building2, Lightbulb, Sparkles, CheckCircle2, Plus, X, Workflow
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ServiceFlowchart } from "@/components/ServiceFlowchart";
import { RefreshCw } from "lucide-react";
import { UserMenu } from "./UserMenu";

interface ServiceFlowchartBuilderProps {
  ideaCard: any;
  onComplete: (flowchartData: any) => void;
  onClose: () => void;
}

export const ServiceFlowchartBuilder = ({
  ideaCard,
  onComplete,
  onClose
}: ServiceFlowchartBuilderProps) => {
  const [mainSection, setMainSection] = useState(1); // 1-4 for main sections
  const [subStep, setSubStep] = useState(1); // For sub-steps within sections
  const [isGenerating, setIsGenerating] = useState(false);

  // Section 1 data
  const [journeyType, setJourneyType] = useState<"entire" | "specific" | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [specificDescription, setSpecificDescription] = useState("");
  const [generatedProcesses, setGeneratedProcesses] = useState<Array<{ id: string; name: string; checked: boolean; description: string }>>([]);

  // Section 2 data
  const [primaryCustomers, setPrimaryCustomers] = useState({
    mainCustomers: "",
    problem: "",
    customerTypes: [] as string[]
  });
  const [frontstageData, setFrontstageData] = useState({
    interactions: "",
    actions: "",
    tools: ""
  });
  const [backstageData, setBackstageData] = useState({
    teams: "",
    roles: "",
    dependencies: ""
  });
  const [externalPartners, setExternalPartners] = useState({
    systems: "",
    purpose: "",
    critical: ""
  });

  // Section 3 data
  const [phaseMappings, setPhaseMappings] = useState({
    awareness: "",
    onboarding: "",
    engagement: "",
    fulfillment: "",
    feedback: ""
  });
  const [timelineType, setTimelineType] = useState<"relative" | "absolute">("relative");
  const [phaseDurations, setPhaseDurations] = useState({
    awareness: "1",
    onboarding: "2",
    engagement: "3",
    fulfillment: "1",
    feedback: "1"
  });

  const [availablePersonas, setAvailablePersonas] = useState<string[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [flowchartData, setFlowchartData] = useState<any>(null);
  const [flowchartCompleted, setFlowchartCompleted] = useState(false);
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (mainSection / totalSteps) * 100;

  // Get idea ID from ideaCard or localStorage
  const ideaId = ideaCard?.id || null;
  const teamId = ideaCard?.team_id || Number(localStorage.getItem('xfactoryTeamId')) || null;

  // Load personas on mount
  useEffect(() => {
    const loadPersonas = async () => {
      if (!teamId) return;
      setIsLoadingPersonas(true);
      try {
        const response = await apiClient.getFlowchartPersonasTeam(teamId);
        if (response.data?.success && response.data?.personas) {
          setAvailablePersonas(response.data.personas);
        }
      } catch (error) {
        console.error('Error loading personas:', error);
      } finally {
        setIsLoadingPersonas(false);
      }
    };
    loadPersonas();
  }, [teamId]);

  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing flowchart data on mount
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  useEffect(() => {
    const loadExisting = async () => {
      if (!teamId) return;
      setIsLoadingExisting(true);
      try {
        const response = await apiClient.getServiceFlowchartTeam(teamId);
        if (response.data?.success && response.data?.flowchart) {
          const f = response.data.flowchart;
          
          // Check if flowchart is completed
          const isCompleted = f.status === 'completed' && f.flowchart_data && 
                              f.flowchart_data.nodes && 
                              Array.isArray(f.flowchart_data.nodes) && 
                              f.flowchart_data.nodes.length > 0;
          
          if (isCompleted) {
            // Flowchart is completed - show it immediately
            setFlowchartData(f.flowchart_data);
            setFlowchartCompleted(true);
            setMainSection(4); // Go directly to section 4 to show flowchart
          } else {
            // Load partial data if available
            if (f.journey_type) setJourneyType(f.journey_type);
            if (f.selected_personas) setSelectedPersonas(f.selected_personas);
            if (f.specific_description) setSpecificDescription(f.specific_description);
            if (f.generated_processes) setGeneratedProcesses(f.generated_processes);
            if (f.primary_customers) setPrimaryCustomers(f.primary_customers);
            if (f.frontstage_data) setFrontstageData(f.frontstage_data);
            if (f.backstage_data) setBackstageData(f.backstage_data);
            if (f.external_partners) setExternalPartners(f.external_partners);
            if (f.phase_mappings) setPhaseMappings(f.phase_mappings);
            if (f.timeline_type) setTimelineType(f.timeline_type);
            if (f.phase_durations) setPhaseDurations(f.phase_durations);
            if (f.current_section) setMainSection(f.current_section);
            if (f.current_sub_step) setSubStep(f.current_sub_step);
            if (f.flowchart_data) setFlowchartData(f.flowchart_data);
          }
        }
      } catch (error) {
        console.error('Error loading existing flowchart:', error);
      } finally {
        setIsLoadingExisting(false);
      }
    };
    loadExisting();
  }, [teamId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  const autoSave = async () => {
    if (!teamId) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounce auto-save by 1 second
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiClient.saveServiceFlowchartTeam(teamId, {
          journey_type: journeyType,
          selected_personas: selectedPersonas,
          specific_description: specificDescription,
          generated_processes: generatedProcesses,
          primary_customers: primaryCustomers,
          frontstage_data: frontstageData,
          backstage_data: backstageData,
          external_partners: externalPartners,
          phase_mappings: phaseMappings,
          timeline_type: timelineType,
          phase_durations: phaseDurations,
          current_section: mainSection,
          current_sub_step: subStep,
          status: mainSection === 4 ? 'completed' : `section${mainSection}`
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000);
  };

  // AI generation for Section 1
  const generateProcesses = async () => {
    if (!ideaId && !teamId) {
      toast({ title: "Error", description: "Idea ID or Team ID required", variant: "destructive" });
      return;
    }
    
    // For team-scoped requests, we need to get the idea_id first
    let actualIdeaId = ideaId;
    if (!actualIdeaId && teamId) {
      try {
        const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
        if (ideaResponse.data?.id) {
          actualIdeaId = ideaResponse.data.id;
        }
      } catch (e) {
        console.error('Could not fetch idea ID:', e);
      }
    }
    
    if (!actualIdeaId) {
      toast({ title: "Error", description: "Could not find idea. Please ensure idea generation is complete.", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await apiClient.generateProcesses({
        idea_id: actualIdeaId,
        journey_type: journeyType!,
        selected_personas: journeyType === 'entire' ? selectedPersonas : undefined,
        specific_description: journeyType === 'specific' ? specificDescription : undefined
      });
      
      if (response.data?.success && response.data?.processes) {
        setGeneratedProcesses(response.data.processes);
    setSubStep(2);
        await autoSave();
      } else {
        throw new Error(response.data?.error || 'Failed to generate processes');
      }
    } catch (error: any) {
      console.error('Error generating processes:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate processes. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleProcess = (id: string) => {
    setGeneratedProcesses(prev => 
      prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p)
    );
  };

  // Generate field content with AI
  const generateFieldContent = async (fieldType: string, context?: any) => {
    if (!teamId) {
      toast({
        title: "Error",
        description: "Team ID not found",
        variant: "destructive"
      });
      return;
    }

    setGeneratingField(fieldType);
    try {
      // Get actual idea ID
      let actualIdeaId = ideaId;
      if (!actualIdeaId) {
        try {
          const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
          actualIdeaId = ideaResponse.data?.id || ideaResponse.data?.idea_id;
        } catch (e) {
          console.error('Failed to get idea ID:', e);
        }
      }

      if (!actualIdeaId) {
        throw new Error('Idea ID not available');
      }

      const response = await apiClient.generateFlowchartField({
        idea_id: actualIdeaId,
        field_type: fieldType,
        context: context || {}
      });

      if (response.data?.success && response.data?.content) {
        // Update the appropriate field based on fieldType
        const content = response.data.content;
        
        if (fieldType === 'primary_customers') {
          setPrimaryCustomers(prev => ({ ...prev, mainCustomers: content }));
        } else if (fieldType === 'primary_customers_problem') {
          setPrimaryCustomers(prev => ({ ...prev, problem: content }));
        } else if (fieldType === 'frontstage_interactions') {
          setFrontstageData(prev => ({ ...prev, interactions: content }));
        } else if (fieldType === 'frontstage_actions') {
          setFrontstageData(prev => ({ ...prev, actions: content }));
        } else if (fieldType === 'frontstage_tools') {
          setFrontstageData(prev => ({ ...prev, tools: content }));
        } else if (fieldType === 'backstage_teams') {
          setBackstageData(prev => ({ ...prev, teams: content }));
        } else if (fieldType === 'backstage_roles') {
          setBackstageData(prev => ({ ...prev, roles: content }));
        } else if (fieldType === 'backstage_dependencies') {
          setBackstageData(prev => ({ ...prev, dependencies: content }));
        } else if (fieldType === 'external_systems') {
          setExternalPartners(prev => ({ ...prev, systems: content }));
        } else if (fieldType === 'external_purpose') {
          setExternalPartners(prev => ({ ...prev, purpose: content }));
        } else if (fieldType === 'external_critical') {
          setExternalPartners(prev => ({ ...prev, critical: content }));
        } else if (fieldType === 'phase_awareness') {
          setPhaseMappings(prev => ({ ...prev, awareness: content }));
        } else if (fieldType === 'phase_onboarding') {
          setPhaseMappings(prev => ({ ...prev, onboarding: content }));
        } else if (fieldType === 'phase_engagement') {
          setPhaseMappings(prev => ({ ...prev, engagement: content }));
        } else if (fieldType === 'phase_fulfillment') {
          setPhaseMappings(prev => ({ ...prev, fulfillment: content }));
        } else if (fieldType === 'phase_feedback') {
          setPhaseMappings(prev => ({ ...prev, feedback: content }));
        } else if (fieldType === 'specific_description') {
          setSpecificDescription(content);
        }

        toast({
          title: "Content Generated",
          description: "AI-generated content has been filled in",
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingField(null);
    }
  };

  const handleSection1Complete = async () => {
    await autoSave();
    setMainSection(2);
    setSubStep(1);
  };

  const handleSection2Complete = async () => {
    await autoSave();
    setMainSection(3);
    setSubStep(1);
  };

  const handleSection3Complete = async () => {
    await autoSave();
    setMainSection(4);
    // Generate flowchart when moving to section 4
    await generateFinalFlowchart();
  };

  const generateFinalFlowchart = async () => {
    if (!ideaId && !teamId) return;
    
    // Get actual idea_id if using team_id
    let actualIdeaId = ideaId;
    if (!actualIdeaId && teamId) {
      try {
        const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
        if (ideaResponse.data?.id) {
          actualIdeaId = ideaResponse.data.id;
        }
      } catch (e) {
        console.error('Could not fetch idea ID:', e);
      }
    }
    
    if (!actualIdeaId) {
      toast({ title: "Error", description: "Could not find idea. Please ensure idea generation is complete.", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await apiClient.generateFlowchart({
        idea_id: actualIdeaId,
        section1_data: {
          journey_type: journeyType,
          selected_personas: selectedPersonas,
          specific_description: specificDescription,
          processes: generatedProcesses.filter(p => p.checked)
        },
        section2_data: {
          primary_customers: primaryCustomers,
          frontstage_data: frontstageData,
          backstage_data: backstageData,
          external_partners: externalPartners
        },
        section3_data: {
          phase_mappings: phaseMappings,
          timeline_type: timelineType,
          phase_durations: phaseDurations
        }
      });
      
      if (response.data?.success) {
        // Store the generated flowchart data
        const generatedFlowchart = response.data?.flowchart || response.data?.flowchart_data;
        console.log('Generated flowchart response:', response.data);
        console.log('Generated flowchart data:', generatedFlowchart);
        
        // First, set the flowchart from the immediate response if available
        if (generatedFlowchart && generatedFlowchart.nodes && Array.isArray(generatedFlowchart.nodes) && generatedFlowchart.nodes.length > 0) {
          setFlowchartData(generatedFlowchart);
          setFlowchartCompleted(true);
          setIsGenerating(false);
        } else {
          // If immediate response doesn't have nodes, reload from backend
          // Poll for the flowchart data (wait up to 10 seconds)
          let attempts = 0;
          const maxAttempts = 10;
          const pollInterval = 1000; // 1 second
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
            
            try {
              const fullResponse = await apiClient.getServiceFlowchartTeam(teamId);
              console.log('Polling attempt', attempts, '- Full flowchart response:', fullResponse.data);
              
              if (fullResponse.data?.success && fullResponse.data?.flowchart?.flowchart_data) {
                const loadedData = fullResponse.data.flowchart.flowchart_data;
                console.log('Loaded flowchart data:', loadedData);
                
                if (loadedData && loadedData.nodes && Array.isArray(loadedData.nodes) && loadedData.nodes.length > 0) {
                  setFlowchartData(loadedData);
                  setFlowchartCompleted(true);
                  setIsGenerating(false);
                  toast({ title: "Success", description: "Flowchart generated successfully!" });
                  return; // Exit early when we have valid data
                }
              }
            } catch (e) {
              console.error('Error polling flowchart:', e);
            }
          }
          
          // If we got here, polling didn't find valid data
          setIsGenerating(false);
          toast({ 
            title: "Warning", 
            description: "Flowchart generation may still be processing. Please refresh or check back later.",
            variant: "default"
          });
        }
        
        if (!isGenerating) {
          toast({ title: "Success", description: "Flowchart generated successfully!" });
        }
      } else {
        throw new Error(response.data?.error || 'Failed to generate flowchart');
      }
    } catch (error: any) {
      console.error('Error generating flowchart:', error);
      setIsGenerating(false);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate flowchart. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleFinalComplete = async () => {
    await autoSave();
    // Close the builder and return to main menu
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Station Header - Matching MockupStation */}
      <div className="border-b border-border bg-gradient-warning relative">
        {/* Logos positioned at absolute left edge */}
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img 
            src="/logos/prov_logo_white.png" 
            alt="xFactory Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackIcon = document.createElement('div');
                fallbackIcon.innerHTML = '<svg class="h-8 w-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>';
                parent.appendChild(fallbackIcon);
              }
            }}
          />
          <img 
            src="/logos/fiualonetransreverse.png" 
            alt="FIU Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackText = document.createElement('span');
                fallbackText.textContent = 'FIU';
                fallbackText.className = 'text-white font-bold text-lg';
                parent.appendChild(fallbackText);
              }
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
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left: Section name and icon (bounded left) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Workflow className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-accent-foreground">Service Flowchart Builder</h1>
                <p className="text-sm text-accent-foreground/80">Map your service journey step by step</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="max-w-6xl mx-auto px-6 pb-2">
          <Progress value={progress} className="h-1 bg-white/20" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* SECTION 1: What Are You Mapping? */}
        {mainSection === 1 && (
          <div className="space-y-6">
            {subStep === 1 && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">What customer journey do you want to map?</h2>
                  <p className="text-muted-foreground">
                    Select the scope of your mapping. AI will help you identify the specific processes.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-lg ${journeyType === "entire" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setJourneyType("entire")}
                  >
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>Entire Customer Journey</CardTitle>
                      <CardDescription>
                        Map the complete experience from awareness to feedback
                      </CardDescription>
                    </CardHeader>
                    {journeyType === "entire" && (
                      <CardContent>
                        <Label className="mb-2 block">Select persona(s)</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="all-personas"
                              checked={selectedPersonas.includes("all")}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPersonas(["all"]);
                                } else {
                                  setSelectedPersonas([]);
                                }
                              }}
                            />
                            <label htmlFor="all-personas" className="text-sm font-medium">
                              All Personas
                            </label>
                          </div>
                          {isLoadingPersonas ? (
                            <div className="text-sm text-muted-foreground">Loading personas...</div>
                          ) : availablePersonas.length > 0 ? (
                            availablePersonas.map((persona: string) => (
                            <div key={persona} className="flex items-center space-x-2">
                              <Checkbox 
                                id={persona}
                                checked={selectedPersonas.includes(persona) || selectedPersonas.includes("all")}
                                disabled={selectedPersonas.includes("all")}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPersonas(prev => [...prev.filter(p => p !== "all"), persona]);
                                  } else {
                                    setSelectedPersonas(prev => prev.filter(p => p !== persona));
                                  }
                                }}
                              />
                              <label htmlFor={persona} className="text-sm">
                                {persona}
                              </label>
                            </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No personas found. Complete the idea generation questionnaire to define personas.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-lg ${journeyType === "specific" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setJourneyType("specific")}
                  >
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>Specific Moment or Interaction</CardTitle>
                      <CardDescription>
                        Focus on a particular touchpoint or process
                      </CardDescription>
                    </CardHeader>
                    {journeyType === "specific" && (
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="block">Describe the specific moment</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => generateFieldContent('specific_description')}
                            disabled={generatingField === 'specific_description'}
                            className="h-6 px-2"
                          >
                            <Sparkles className={`h-3 w-3 ${generatingField === 'specific_description' ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <Textarea 
                          placeholder="Example: onboarding for mentors, user checkout flow, feedback request"
                          value={specificDescription}
                          onChange={(e) => setSpecificDescription(e.target.value)}
                          rows={4}
                        />
                      </CardContent>
                    )}
                  </Card>
                </div>

                <div className="flex justify-center mt-8">
                  <Button 
                    variant="default" 
                    size="lg"
                    onClick={generateProcesses}
                    disabled={!journeyType || isGenerating || (journeyType === "entire" && selectedPersonas.length === 0) || (journeyType === "specific" && !specificDescription)}
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                        Generating Processes...
                      </>
                    ) : (
                      <>
                        Generate Processes with AI
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {subStep === 2 && (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">Confirm Your Processes</h2>
                  <p className="text-muted-foreground">
                    Based on your input, here are the key processes we detected. Check/uncheck or edit as needed.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Detected Processes</CardTitle>
                    <CardDescription>Select the processes you want to include in your flowchart</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedProcesses.map((process) => (
                      <div 
                        key={process.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          process.checked ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        onClick={() => toggleProcess(process.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={process.checked}
                            onCheckedChange={() => toggleProcess(process.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-medium mb-1">{process.name}</div>
                            <div className="text-sm text-muted-foreground">{process.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setSubStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleSection1Complete}
                    disabled={!generatedProcesses.some(p => p.checked)}
                  >
                    Continue → Who & What's Involved
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION 2: Who & What's Involved */}
        {mainSection === 2 && (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Who & What's Involved</h2>
              <p className="text-muted-foreground">
                Step {subStep} of 4 - Let's identify all stakeholders and systems
              </p>
            </div>

            {/* Sub-step 1: Primary Customers */}
            {subStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Primary Customers</CardTitle>
                  <CardDescription>Who is your service for? Describe your key users or customers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="main-customers">Who are your main customers or users?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('primary_customers')}
                        disabled={generatingField === 'primary_customers'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'primary_customers' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="main-customers"
                      placeholder="Students, Parents, Delivery drivers, SMB owners"
                      value={primaryCustomers.mainCustomers}
                      onChange={(e) => setPrimaryCustomers(prev => ({ ...prev, mainCustomers: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="problem">What problem or need do they have?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('primary_customers_problem')}
                        disabled={generatingField === 'primary_customers_problem'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'primary_customers_problem' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Textarea 
                      id="problem"
                      placeholder="Describe the problem your solution addresses"
                      value={primaryCustomers.problem}
                      onChange={(e) => setPrimaryCustomers(prev => ({ ...prev, problem: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">Think about who interacts most with your service.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-step 2: Frontstage Systems */}
            {subStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Frontstage Systems</CardTitle>
                  <CardDescription>Everything the user can see or interact with</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="interactions">Where does the customer interact with your service?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('frontstage_interactions')}
                        disabled={generatingField === 'frontstage_interactions'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'frontstage_interactions' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="interactions"
                      placeholder="Website, mobile app, physical location"
                      value={frontstageData.interactions}
                      onChange={(e) => setFrontstageData(prev => ({ ...prev, interactions: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="actions">What actions do they take?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('frontstage_actions')}
                        disabled={generatingField === 'frontstage_actions'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'frontstage_actions' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Textarea 
                      id="actions"
                      placeholder="Sign up, browse products, make purchases, submit feedback"
                      value={frontstageData.actions}
                      onChange={(e) => setFrontstageData(prev => ({ ...prev, actions: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="tools">What tools support these actions?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('frontstage_tools')}
                        disabled={generatingField === 'frontstage_tools'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'frontstage_tools' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="tools"
                      placeholder="Website, chatbot, social media, email"
                      value={frontstageData.tools}
                      onChange={(e) => setFrontstageData(prev => ({ ...prev, tools: e.target.value }))}
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">Everything the user can see or interact with.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-step 3: Backstage Teams */}
            {subStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Backstage Teams</CardTitle>
                  <CardDescription>The invisible roles that keep things running</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="teams">Who works behind the scenes?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('backstage_teams')}
                        disabled={generatingField === 'backstage_teams'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'backstage_teams' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="teams"
                      placeholder="Customer support, operations, product team"
                      value={backstageData.teams}
                      onChange={(e) => setBackstageData(prev => ({ ...prev, teams: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="roles">What roles do they play?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('backstage_roles')}
                        disabled={generatingField === 'backstage_roles'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'backstage_roles' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Textarea 
                      id="roles"
                      placeholder="Processing orders, managing inventory, providing support"
                      value={backstageData.roles}
                      onChange={(e) => setBackstageData(prev => ({ ...prev, roles: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="dependencies">Any dependencies or coordination needed?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('backstage_dependencies')}
                        disabled={generatingField === 'backstage_dependencies'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'backstage_dependencies' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Textarea 
                      id="dependencies"
                      placeholder="Cross-team communication, approval workflows"
                      value={backstageData.dependencies}
                      onChange={(e) => setBackstageData(prev => ({ ...prev, dependencies: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">These are the invisible roles that keep things running.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-step 4: External Partners */}
            {subStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>External Partners & Tools</CardTitle>
                  <CardDescription>Software or organizations that help you deliver your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="systems">What external systems or tools do you rely on?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('external_systems')}
                        disabled={generatingField === 'external_systems'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'external_systems' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="systems"
                      placeholder="Payment processors, cloud services, APIs"
                      value={externalPartners.systems}
                      onChange={(e) => setExternalPartners(prev => ({ ...prev, systems: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="purpose">What do they do?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('external_purpose')}
                        disabled={generatingField === 'external_purpose'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'external_purpose' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Textarea 
                      id="purpose"
                      placeholder="e.g., Stripe for payments, Zapier for automation, AWS for hosting"
                      value={externalPartners.purpose}
                      onChange={(e) => setExternalPartners(prev => ({ ...prev, purpose: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="critical">Which ones are mission-critical?</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateFieldContent('external_critical')}
                        disabled={generatingField === 'external_critical'}
                        className="h-6 px-2"
                      >
                        <Sparkles className={`h-3 w-3 ${generatingField === 'external_critical' ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Input 
                      id="critical"
                      placeholder="Services you can't operate without"
                      value={externalPartners.critical}
                      onChange={(e) => setExternalPartners(prev => ({ ...prev, critical: e.target.value }))}
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">Think of software or organizations that help you deliver your service.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between mt-8">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (subStep > 1) {
                    setSubStep(subStep - 1);
                  } else {
                    setMainSection(1);
                    setSubStep(2);
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  if (subStep < 4) {
                    setSubStep(subStep + 1);
                  } else {
                    handleSection2Complete();
                  }
                }}
              >
                {subStep < 4 ? "Continue" : "Continue → Phases & Timeline"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 3: Phases & Timeline */}
        {mainSection === 3 && (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Phases & Timeline</h2>
              <p className="text-muted-foreground">
                Step {subStep} of 3 - Define your service journey stages
              </p>
            </div>

            {/* Sub-step 1: Understanding Phases */}
            {subStep === 1 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Understanding the Phases of Your Journey</CardTitle>
                    <CardDescription>
                      Learn what each phase means before mapping your own
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-6 text-muted-foreground">
                      Before building your flowchart, let's explore what each phase means. Each stage represents 
                      a key milestone in how your customer interacts with your service—from discovery to feedback.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        {
                          name: "Awareness",
                          description: "The stage when people first learn about your product or problem.",
                          example: "A student sees your social post or finds your startup."
                        },
                        {
                          name: "Onboarding",
                          description: "When they first engage or sign up for your product.",
                          example: "They register on your website or attend your session."
                        },
                        {
                          name: "Engagement",
                          description: "When they start actively using your product or participating in your service.",
                          example: "They submit their first form or complete a task."
                        },
                        {
                          name: "Fulfillment",
                          description: "When you deliver your promise or service.",
                          example: "They receive mentorship, shipment, or completed service."
                        },
                        {
                          name: "Support / Feedback",
                          description: "When you collect feedback or continue your relationship post-service.",
                          example: "They answer a survey or recommend your product."
                        }
                      ].map((phase) => (
                        <Card key={phase.name} className="bg-muted/30">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{phase.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm">{phase.description}</p>
                            <p className="text-sm text-muted-foreground italic">{phase.example}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg mt-6">
                      <div className="flex gap-2 items-start">
                        <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm">
                          These phases exist in every journey, even if they look different in your startup. 
                          You'll describe how these apply to you.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setMainSection(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="default" onClick={() => setSubStep(2)}>
                    Continue → Map Your Phases
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Sub-step 2: Map Your Phases */}
            {subStep === 2 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Map out the key stages</CardTitle>
                    <CardDescription>
                      Describe how each phase looks in your specific service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { key: "awareness" as const, label: "Awareness", question: "How do people find out about your product or service?" },
                      { key: "onboarding" as const, label: "Onboarding / Signup", question: "What does the first interaction or registration look like for users?" },
                      { key: "engagement" as const, label: "Engagement/Use", question: "What happens when they start using your service?" },
                      { key: "fulfillment" as const, label: "Fulfillment", question: "How will your service be delivered?" },
                      { key: "feedback" as const, label: "Feedback", question: "How do you collect feedback and maintain relationships?" }
                    ].map((phase) => (
                      <div key={phase.key}>
                        <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor={phase.key} className="text-base font-semibold">{phase.label}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => generateFieldContent(`phase_${phase.key}`)}
                            disabled={generatingField === `phase_${phase.key}`}
                            className="h-6 px-2"
                          >
                            <Sparkles className={`h-3 w-3 ${generatingField === `phase_${phase.key}` ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{phase.question}</p>
                        <Textarea 
                          id={phase.key}
                          placeholder="Example: Through my school events or Instagram page"
                          value={phaseMappings[phase.key]}
                          onChange={(e) => setPhaseMappings(prev => ({ ...prev, [phase.key]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    ))}

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex gap-2 items-start">
                        <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm">Be specific. Write actions or touchpoints.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setSubStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="default" onClick={() => setSubStep(3)}>
                    Continue → Plan Your Timeline
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Sub-step 3: Plan Timeline */}
            {subStep === 3 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Plan Your Timeline</CardTitle>
                    <CardDescription>
                      Decide how long each phase lasts and when things happen
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Now, let's estimate the duration of each phase. Remember, your total program duration 
                      is variable - you currently have 2 months (8 weeks) left to complete your program. 
                      The total time you assign phases should fit within this period.
                    </p>

                    <RadioGroup value={timelineType} onValueChange={(value: any) => setTimelineType(value)}>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="relative" id="relative" />
                          <Label htmlFor="relative">Relative (days/weeks)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="absolute" id="absolute" />
                          <Label htmlFor="absolute">Absolute (dates)</Label>
                        </div>
                      </div>
                    </RadioGroup>

                    <div className="space-y-4">
                      {[
                        { key: "awareness" as const, label: "Awareness" },
                        { key: "onboarding" as const, label: "Onboarding" },
                        { key: "engagement" as const, label: "Engagement" },
                        { key: "fulfillment" as const, label: "Fulfillment" },
                        { key: "feedback" as const, label: "Feedback" }
                      ].map((phase) => (
                        <div key={phase.key} className="flex items-center gap-4">
                          <Label className="w-32">{phase.label}</Label>
                          {timelineType === "relative" ? (
                            <Select 
                              value={phaseDurations[phase.key]}
                              onValueChange={(value) => setPhaseDurations(prev => ({ ...prev, [phase.key]: value }))}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num} week{num > 1 ? 's' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex gap-2">
                              <Input type="date" className="w-40" />
                              <span className="text-muted-foreground">to</span>
                              <Input type="date" className="w-40" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex gap-2 items-start">
                        <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                        <p className="text-sm">
                          Make sure your timeline fits within your remaining program duration (8 weeks). 
                          The AI will help optimize pacing and transitions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setSubStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="default" onClick={handleSection3Complete}>
                    Confirm & Generate Flowchart
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION 4: Plot the Flowchart */}
        {mainSection === 4 && (
          <div className="space-y-6">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Service Flowchart</h2>
              <p className="text-muted-foreground">
                AI-generated layered diagram of your service flow
              </p>
              </div>
              {flowchartCompleted && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset to start the flowchart process over
                    setFlowchartData(null);
                    setFlowchartCompleted(false);
                    setMainSection(1);
                    setSubStep(1);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Redo Flowchart
                </Button>
              )}
            </div>

            {(() => {
              console.log('Rendering Section 4 - flowchartData:', flowchartData);
              console.log('isGenerating:', isGenerating);
              console.log('flowchartCompleted:', flowchartCompleted);
              
              // Check if we have valid flowchart data
              const hasValidFlowchart = flowchartData && 
                flowchartData.nodes && 
                Array.isArray(flowchartData.nodes) && 
                flowchartData.nodes.length > 0;
              
              console.log('hasValidFlowchart:', hasValidFlowchart);
              
              if (hasValidFlowchart && !isGenerating) {
                // Show the flowchart
                return (
            <Card>
              <CardHeader>
                  <CardTitle>Service Experience Flowchart</CardTitle>
                <CardDescription>
                    Complete visualization of your service journey with stakeholders, phases, and interactions
                </CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-background overflow-auto">
                    <ServiceFlowchart 
                      flow={{
                        nodes: flowchartData.nodes || [],
                        edges: flowchartData.edges || [],
                        lanes: flowchartData.lanes || flowchartData.layers?.map((l: any) => l.name || l) || []
                      }} 
                      height={600} 
                      zoom={1} 
                    />
                  </div>
                  
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{generatedProcesses.filter(p => p.checked).length}</div>
                      <div className="text-sm text-muted-foreground">Processes</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">5</div>
                      <div className="text-sm text-muted-foreground">Phases</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Object.values(phaseDurations).reduce((sum, val) => sum + parseInt(val || '0'), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Weeks Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                );
              } else if (isGenerating) {
                // Show generating state
                return (
                  <Card>
                <CardHeader>
                  <CardTitle>Generating Your Flowchart</CardTitle>
                  <CardDescription>
                    Creating your service experience flowchart with all stakeholders and phases
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed">
                    <Sparkles className="h-16 w-16 text-primary mb-4 animate-spin" />
                    <h3 className="text-2xl font-bold mb-2">Generating Flowchart...</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      AI is creating your service flowchart. This may take a moment.
                    </p>
                </div>
                </CardContent>
              </Card>
                );
              } else {
                // Show empty/not generated state
                return (
                  <Card>
                <CardHeader>
                  <CardTitle>Flowchart Not Generated</CardTitle>
                  <CardDescription>
                    Please complete the previous sections to generate your flowchart
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground text-center">
                      Complete sections 1-3 and click "Confirm & Generate Flowchart" to create your flowchart.
                    </p>
                </div>
              </CardContent>
            </Card>
                );
              }
            })()}

            <div className="flex justify-between mt-8">
              {!flowchartCompleted && (
              <Button variant="outline" onClick={() => { setMainSection(3); setSubStep(3); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              )}
              {flowchartCompleted && (
              <Button variant="default" size="lg" onClick={handleFinalComplete}>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Complete Flowchart Builder
              </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );