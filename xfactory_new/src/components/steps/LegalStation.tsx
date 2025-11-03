import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, ArrowLeft, CheckCircle, Search, Loader2, Brain, BookOpen, Sparkles } from "lucide-react";
import { StationFlowManager } from "@/lib/stationFlow";
import { FactorAI } from "../FactorAI";
import { UserMenu } from "../UserMenu";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import InfoButton from "@/components/info-button";
import ReactMarkdown from "react-markdown";

interface LegalStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  businessType?: string;
  mvpData?: any;
}

export const LegalStation = ({ 
  onComplete, 
  onBack, 
  businessType,
  mvpData 
}: LegalStationProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("trademark");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Trademark Checker State
  const [trademarkData, setTrademarkData] = useState({
    businessName: '',
    searchResults: null as any,
    isSearching: false,
    searchCompleted: false
  });

  // Implementation Guide State
  const [implementationData, setImplementationData] = useState({
    businessEntity: '',
    headquartersCity: '',
    employeeCount: '',
    industryType: '',
    timeline: '',
    checklist: null as any,
    isGenerating: false,
    guidance: null as any
  });

  // Feasibility Report State
  const [feasibilityData, setFeasibilityData] = useState({
    report: null as any,
    isGenerating: false,
    confidence: 0,
    status: 'not_started' as 'not_started' | 'generating' | 'completed' | 'error'
  });

  // Load team ID and existing data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Get team ID
        const status = await apiClient.get('/team-formation/status/');
        const currentTeamId = (status as any)?.data?.current_team?.id;
        if (!currentTeamId) {
          toast({ title: "Error", description: "No team found. Please ensure you are part of a team.", variant: "destructive" });
          return;
        }
        setTeamId(currentTeamId);
        
        // Load existing legal strategy data
        try {
          const strategyRes = await apiClient.legalGetStrategyTeam(currentTeamId);
          const strategy = (strategyRes as any)?.data;
          
          // Auto-fetch business name from idea if not in trademark data
          if (strategy?.idea?.output_name || strategy?.idea?.name) {
            const ideaName = strategy.idea.output_name || strategy.idea.name;
            setTrademarkData(prev => ({
              ...prev,
              businessName: prev.businessName || ideaName || ''
            }));
          }
          
          if (strategy?.implementation_guide) {
            const guide = strategy.implementation_guide;
            setImplementationData(prev => ({
              ...prev,
              businessEntity: guide.business_entity || '',
              headquartersCity: guide.headquarters_city || '',
              employeeCount: guide.employee_count || '',
              industryType: guide.industry_type || '',
              timeline: guide.timeline || '',
              guidance: guide.guidance || null,
              checklist: guide.guidance ? {
                entity: guide.business_entity || '',
                headquarters: guide.headquarters_city || '',
                employees: guide.employee_count || '',
                industry: guide.industry_type || '',
                timeline: guide.timeline || '',
                entityRequirements: Array.isArray(guide.guidance?.entity_requirements) ? guide.guidance.entity_requirements : [],
                employmentRequirements: Array.isArray(guide.guidance?.employment_actions) ? guide.guidance.employment_actions : [],
                industryCompliance: Array.isArray(guide.guidance?.industry_compliance) ? guide.guidance.industry_compliance : [],
                locationRequirements: Array.isArray(guide.guidance?.location_requirements) ? guide.guidance.location_requirements : [],
                milestones: Array.isArray(guide.guidance?.milestones) ? guide.guidance.milestones : []
              } : null
            }));
          }
          
          if (strategy?.trademark) {
            setTrademarkData(prev => ({
              ...prev,
              businessName: strategy.trademark.business_name || prev.businessName || '',
              searchResults: strategy.trademark.analysis || null,
              searchCompleted: !!strategy.trademark.business_name
            }));
          }
          
          if (strategy?.feasibility_report) {
            setFeasibilityData(prev => ({
              ...prev,
              report: strategy.feasibility_report,
              confidence: strategy.feasibility_report.confidence || 0,
              status: 'completed'
            }));
          }
        } catch (error) {
          console.error('Error loading legal strategy:', error);
        }
      } catch (error) {
        console.error('Error loading team data:', error);
        toast({ title: "Error", description: "Failed to load team data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Trademark Search Logic
  const searchTrademarks = async () => {
    if (!trademarkData.businessName.trim() || !teamId) return;
    
    setTrademarkData(prev => ({ ...prev, isSearching: true }));
    
    try {
      const response = await apiClient.legalTrademarkCheckTeam(teamId, trademarkData.businessName.trim());
      if (response.status >= 200 && response.status < 300) {
        const data = (response as any).data;
    setTrademarkData(prev => ({
      ...prev,
          searchResults: data.trademark?.analysis || null,
      isSearching: false,
      searchCompleted: true
    }));
        toast({ title: "Success", description: "Trademark check completed" });
      } else {
        throw new Error('Trademark check failed');
      }
    } catch (error: any) {
      console.error('Trademark check error:', error);
      toast({ 
        title: "Error", 
        description: error?.error || "Failed to check trademark. Please try again.", 
        variant: "destructive" 
      });
      setTrademarkData(prev => ({ ...prev, isSearching: false }));
    }
  };

  // Implementation Guide Generator with AI
  const generateImplementationGuideWithAI = async () => {
    if (!teamId) {
      toast({ title: "Error", description: "No team found", variant: "destructive" });
      return;
    }
    
    setImplementationData(prev => ({ ...prev, isGenerating: true }));
    
    try {
      // Send only headquarters_city if provided (optional), AI will fill in all other fields
      const payload: any = {};
      if (implementationData.headquartersCity && implementationData.headquartersCity.trim()) {
        payload.headquarters_city = implementationData.headquartersCity.trim();
      }
      // All other fields (business_entity, employee_count, industry_type, timeline) 
      // will be AI-generated based on the idea context
      
      const response = await apiClient.legalGenerateInsightsTeam(teamId, payload);
      if (response.status >= 200 && response.status < 300) {
        const data = (response as any).data;
        const guide = data.implementation_guide;
        
        setImplementationData(prev => ({
          ...prev,
          businessEntity: guide.business_entity || prev.businessEntity || '',
          headquartersCity: guide.headquarters_city || prev.headquartersCity || '',
          employeeCount: guide.employee_count || prev.employeeCount || '',
          industryType: guide.industry_type || prev.industryType || '',
          timeline: guide.timeline || prev.timeline || '',
          guidance: guide.guidance || null,
          checklist: guide.guidance ? {
            entity: guide.business_entity || '',
            headquarters: guide.headquarters_city || '',
            employees: guide.employee_count || '',
            industry: guide.industry_type || '',
            timeline: guide.timeline || '',
            entityRequirements: Array.isArray(guide.guidance?.entity_requirements) ? guide.guidance.entity_requirements : [],
            employmentRequirements: Array.isArray(guide.guidance?.employment_actions) ? guide.guidance.employment_actions : [],
            industryCompliance: Array.isArray(guide.guidance?.industry_compliance) ? guide.guidance.industry_compliance : [],
            locationRequirements: Array.isArray(guide.guidance?.location_requirements) ? guide.guidance.location_requirements : [],
            milestones: Array.isArray(guide.guidance?.milestones) ? guide.guidance.milestones : []
          } : null,
          isGenerating: false
        }));
        toast({ title: "Success", description: "Implementation guide generated with AI" });
      } else {
        throw new Error('Generation failed');
      }
    } catch (error: any) {
      console.error('Implementation guide generation error:', error);
      toast({ 
        title: "Error", 
        description: error?.error || "Failed to generate implementation guide. Please try again.", 
        variant: "destructive" 
      });
      setImplementationData(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Save implementation guide
  const saveImplementationGuide = async () => {
    if (!teamId) return;
    
    try {
      const payload = {
        business_entity: implementationData.businessEntity,
        headquarters_city: implementationData.headquartersCity,
        employee_count: implementationData.employeeCount,
        industry_type: implementationData.industryType,
        timeline: implementationData.timeline,
        guidance: implementationData.guidance || {}
      };
      
      await apiClient.legalSaveImplementationGuideTeam(teamId, payload);
      toast({ title: "Success", description: "Implementation guide saved" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error?.error || "Failed to save implementation guide", 
        variant: "destructive" 
      });
    }
  };

  // Feasibility Report Generator (no manual input needed - uses DB)
  const generateFeasibilityReport = async () => {
    if (!teamId) {
      toast({ title: "Error", description: "No team found", variant: "destructive" });
      return;
    }
    
    // GET before POST: Check if report already exists
    try {
      const existingReportRes = await apiClient.legalGetFeasibilityReportTeam(teamId);
      if (existingReportRes.status >= 200 && existingReportRes.status < 300) {
        const reportData = (existingReportRes as any).data;
        const existingReport = reportData.report || reportData.feasibility_report;
        if (existingReport && existingReport.report_text) {
          // Report already exists, use it
          setFeasibilityData(prev => ({
            ...prev,
            report: existingReport,
            confidence: reportData.confidence || existingReport.confidence || 0,
            isGenerating: false,
            status: 'completed'
          }));
          toast({ title: "Report Loaded", description: "Using existing feasibility report" });
          return;
        }
      }
    } catch (error) {
      // No existing report, continue with generation
      console.log('[Legal Feasibility] No existing report found, proceeding with generation');
    }
    
    setFeasibilityData(prev => ({ ...prev, isGenerating: true, status: 'generating' }));
    
    try {
      const response = await apiClient.legalGenerateFeasibilityTeam(teamId);
      if (response.status >= 200 && response.status < 300) {
        // The endpoint returns 202 with status='processing', start polling
        toast({ 
          title: "Generation Started", 
          description: "Legal feasibility report is being generated. This may take several minutes for deep research..." 
        });
        
        // Poll for completion (no timeout limit since it's deep research)
        const pollForReport = async () => {
          let pollAborted = false;
        
          const pollInterval = setInterval(async () => {
            if (pollAborted) {
              clearInterval(pollInterval);
              return;
            }
            
            try {
              const statusRes = await apiClient.legalGetFeasibilityStatusTeam(teamId);
              const statusData = (statusRes as any)?.data;
              const currentStatus = statusData?.status;
              
              console.log(`[Legal Feasibility] Polling status: ${currentStatus}`);
              
              if (currentStatus === 'completed') {
                clearInterval(pollInterval);
                
                // Get the report
                try {
                  const reportRes = await apiClient.legalGetFeasibilityReportTeam(teamId);
                  if (reportRes.status >= 200 && reportRes.status < 300) {
                    const reportData = (reportRes as any).data;
                    setFeasibilityData(prev => ({
                      ...prev,
                      report: reportData.report || reportData.feasibility_report,
                      confidence: reportData.confidence || reportData.report?.confidence || 0,
                      isGenerating: false,
                      status: 'completed'
                    }));
                    toast({ title: "Success", description: "Feasibility report generated successfully" });
                  }
                } catch (error) {
                  setFeasibilityData(prev => ({ ...prev, isGenerating: false, status: 'error' }));
                  toast({ title: "Error", description: "Failed to load feasibility report", variant: "destructive" });
                }
              } else if (currentStatus === 'failed') {
                clearInterval(pollInterval);
    setFeasibilityData(prev => ({ 
      ...prev, 
      isGenerating: false,
                  status: 'error' 
                }));
                toast({ 
                  title: "Generation Failed", 
                  description: statusData?.error_message || "Report generation failed. Please try again.", 
                  variant: "destructive" 
                });
              } else if (currentStatus === 'processing' || currentStatus === 'pending') {
                // Continue polling, status will show in UI
                setFeasibilityData(prev => ({ 
                  ...prev, 
                  status: currentStatus === 'processing' ? 'generating' : 'generating' 
                }));
              }
            } catch (error) {
              console.error('[Legal Feasibility] Status polling error:', error);
              // Continue polling on error (might be transient)
            }
          }, 3000); // Poll every 3 seconds
          
          // Cleanup on unmount
          return () => {
            pollAborted = true;
            clearInterval(pollInterval);
          };
        };
        
        pollForReport();
      } else {
        throw new Error('Feasibility report generation failed');
      }
    } catch (error: any) {
      console.error('Feasibility report generation error:', error);
      setFeasibilityData(prev => ({ ...prev, isGenerating: false, status: 'error' }));
      toast({ 
        title: "Error", 
        description: error?.error || error?.message || "Failed to start feasibility report generation. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleComplete = async () => {
    // Save implementation guide before completing
    if (implementationData.checklist && teamId) {
      await saveImplementationGuide();
    }
    
    const legalData = {
      trademarkData,
      implementationData,
      feasibilityData,
      completedAt: new Date().toISOString()
    };

    StationFlowManager.saveStationOutput('legal', legalData, 90);
    onComplete(legalData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading legal data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-to-r from-slate-700 to-slate-900 relative">
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
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Scale className="h-6 w-6 text-white" />
                </div>
            <div>
                  <h1 className="text-xl font-bold text-white">Legal Workshop</h1>
                  <p className="text-sm text-white/80">
                Build your legal foundation with guided tools and templates
              </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trademark" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Trademark Check
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Implementation Guide
            </TabsTrigger>
            <TabsTrigger value="feasibility" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Feasibility Report
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Trademark Checker */}
          <TabsContent value="trademark" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Business Name Trademark Check
                </CardTitle>
                <CardDescription>
                  Check if your business name is available for trademark registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="businessName">Business/Brand Name</Label>
                      <InfoButton 
                        title="Business Name"
                        content="Enter the exact business or brand name you want to trademark. The system will analyze it for availability and suggest the appropriate Nice classification (trademark category)."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="businessName"
                        placeholder="Enter your business name"
                        value={trademarkData.businessName}
                        onChange={(e) => setTrademarkData(prev => ({ ...prev, businessName: e.target.value }))}
                        className="flex-1"
                      />
                      <Button 
                        onClick={searchTrademarks}
                        disabled={trademarkData.isSearching || !trademarkData.businessName.trim()}
                      >
                        {trademarkData.isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Check Availability
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {trademarkData.searchCompleted && trademarkData.searchResults && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Trademark Analysis</h3>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {trademarkData.searchResults.business_name && (
                          <div className="mb-3">
                            <div className="text-sm text-blue-900 font-medium mb-1">Recommended Name:</div>
                            <div className="text-blue-800">{trademarkData.searchResults.business_name}</div>
                          </div>
                        )}
                        {trademarkData.searchResults.nice_classification && (
                          <div className="mb-3">
                            <div className="text-sm text-blue-900 font-medium mb-1">Nice Classification:</div>
                            <div className="text-blue-800">Class {trademarkData.searchResults.nice_classification}</div>
                            </div>
                        )}
                        {trademarkData.searchResults.rationale && (
                          <div className="mb-3">
                            <div className="text-sm text-blue-900 font-medium mb-1">Rationale:</div>
                            <div className="text-blue-800 text-sm">{trademarkData.searchResults.rationale}</div>
                                </div>
                              )}
                        {trademarkData.searchResults.analysis?.backup_classes && Array.isArray(trademarkData.searchResults.analysis.backup_classes) && (
                          <div>
                            <div className="text-sm text-blue-900 font-medium mb-1">Backup Classes:</div>
                            <div className="text-blue-800 text-sm">
                              {trademarkData.searchResults.analysis.backup_classes.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-amber-900 mb-2">Next Steps</h4>
                        <ul className="text-sm text-amber-800 space-y-1">
                          <li>• Consider consulting with a trademark attorney for full search</li>
                          <li>• File a trademark application if name is available</li>
                          <li>• Check domain availability for your chosen name</li>
                          <li>• Consider alternative names if conflicts exist</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Legal Implementation Checklist Generator
                </CardTitle>
                <CardDescription>
                  Get a customized legal compliance checklist based on your business structure. Use AI to generate recommendations or fill manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                      <Label>Business Entity Type</Label>
                        <InfoButton 
                          title="Business Entity Type"
                          content="The legal structure of your business. LLC offers flexibility, C-Corp is good for raising capital, S-Corp offers tax benefits. Choose based on your goals."
                        />
                      </div>
                      <Select 
                        value={implementationData.businessEntity}
                        onValueChange={(value) => setImplementationData(prev => ({ ...prev, businessEntity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delaware-c-corp">Delaware C-Corporation</SelectItem>
                          <SelectItem value="llc">Limited Liability Company (LLC)</SelectItem>
                          <SelectItem value="s-corp">S-Corporation</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                      <Label>Headquarters City/State</Label>
                        <InfoButton 
                          title="Headquarters Location"
                          content="The city and state where your business will be primarily located. This affects local licensing, tax requirements, and state-specific regulations."
                        />
                      </div>
                      <Input
                        placeholder="e.g., San Francisco, CA"
                        value={implementationData.headquartersCity}
                        onChange={(e) => setImplementationData(prev => ({ ...prev, headquartersCity: e.target.value }))}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                      <Label>Expected Employee Count</Label>
                        <InfoButton 
                          title="Employee Count"
                          content="The number of people you plan to hire. Different employment laws apply based on size (1, 2-9, 10-49, 50+ employees)."
                        />
                      </div>
                      <Select 
                        value={implementationData.employeeCount}
                        onValueChange={(value) => setImplementationData(prev => ({ ...prev, employeeCount: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Just me (Solo founder)</SelectItem>
                          <SelectItem value="2-9">2-9 employees</SelectItem>
                          <SelectItem value="10-49">10-49 employees</SelectItem>
                          <SelectItem value="50+">50+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                      <Label>Industry Type</Label>
                        <InfoButton 
                          title="Industry"
                          content="Your business industry determines specific regulations and licenses you'll need. For example, fintech needs financial licenses, healthcare needs HIPAA compliance."
                        />
                      </div>
                      <Select 
                        value={implementationData.industryType}
                        onValueChange={(value) => setImplementationData(prev => ({ ...prev, industryType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saas">SaaS/Software</SelectItem>
                          <SelectItem value="fintech">Fintech</SelectItem>
                          <SelectItem value="healthcare">Healthcare/Biotech</SelectItem>
                          <SelectItem value="ecommerce">E-commerce</SelectItem>
                          <SelectItem value="consulting">Consulting/Services</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                      <Label>Implementation Timeline</Label>
                        <InfoButton 
                          title="Timeline"
                          content="How long you want to take to complete legal setup. 3 months is fast-track, 6 months is standard, 12 months is comprehensive with extra planning."
                        />
                      </div>
                      <Select 
                        value={implementationData.timeline}
                        onValueChange={(value) => setImplementationData(prev => ({ ...prev, timeline: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3-months">3 months (Fast track)</SelectItem>
                          <SelectItem value="6-months">6 months (Standard)</SelectItem>
                          <SelectItem value="12-months">12 months (Comprehensive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={generateImplementationGuideWithAI}
                      disabled={implementationData.isGenerating || !teamId}
                      className="w-full"
                    >
                      {implementationData.isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>

                  {implementationData.checklist && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                        <h3 className="font-semibold text-blue-900 mb-2">Legal Compliance Checklist</h3>
                        <div className="text-blue-800 text-sm space-y-1">
                          {implementationData.checklist.entity && <div><strong>Entity:</strong> {implementationData.checklist.entity}</div>}
                          {implementationData.checklist.headquarters && <div><strong>Location:</strong> {implementationData.checklist.headquarters}</div>}
                          {implementationData.checklist.employees && <div><strong>Team Size:</strong> {implementationData.checklist.employees}</div>}
                          {implementationData.checklist.industry && <div><strong>Industry:</strong> {implementationData.checklist.industry}</div>}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {Array.isArray(implementationData.checklist.entityRequirements) && implementationData.checklist.entityRequirements.length > 0 && (
                        <div className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 text-blue-700">Entity Formation Requirements</h4>
                          <ul className="text-sm space-y-1">
                            {implementationData.checklist.entityRequirements.map((req: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}

                        {Array.isArray(implementationData.checklist.employmentRequirements) && implementationData.checklist.employmentRequirements.length > 0 && (
                        <div className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 text-green-700">Employment Law Requirements</h4>
                          <ul className="text-sm space-y-1">
                            {implementationData.checklist.employmentRequirements.map((req: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}

                        {Array.isArray(implementationData.checklist.industryCompliance) && implementationData.checklist.industryCompliance.length > 0 && (
                        <div className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 text-purple-700">Industry-Specific Compliance</h4>
                          <ul className="text-sm space-y-1">
                            {implementationData.checklist.industryCompliance.map((req: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}

                        {Array.isArray(implementationData.checklist.locationRequirements) && implementationData.checklist.locationRequirements.length > 0 && (
                        <div className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 text-orange-700">Location-Specific Requirements</h4>
                          <ul className="text-sm space-y-1">
                            {implementationData.checklist.locationRequirements.map((req: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}
                      </div>

                      {Array.isArray(implementationData.checklist.milestones) && implementationData.checklist.milestones.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-amber-900 mb-2">Implementation Timeline</h4>
                        <div className="space-y-2">
                          {implementationData.checklist.milestones.map((milestone: any, index: number) => (
                            <div key={index} className="text-sm">
                                <div className="font-medium text-amber-800">{milestone.phase} {milestone.timeframe && `(${milestone.timeframe})`}</div>
                                {Array.isArray(milestone.tasks) && milestone.tasks.length > 0 && (
                              <div className="text-amber-700 ml-2">
                                {milestone.tasks.join(' • ')}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: AI Feasibility Report */}
          <TabsContent value="feasibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Legal Feasibility Deep Research
                </CardTitle>
                <CardDescription>
                  AI-powered legal feasibility analysis based on your idea. The system automatically uses your idea data from the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feasibilityData.isGenerating && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-blue-900">Generating Legal Feasibility Report</div>
                        <div className="text-xs text-blue-700 mt-1">
                          {feasibilityData.status === 'generating' ? 
                            'Deep research in progress... This may take several minutes.' :
                            'Initializing report generation...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!feasibilityData.isGenerating && feasibilityData.report ? (
                  <div className="space-y-4">
                    {feasibilityData.confidence > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-900 font-medium mb-1">Confidence Score</div>
                        <div className="text-2xl font-bold text-blue-700">{(feasibilityData.confidence * 100).toFixed(0)}%</div>
                      </div>
                    )}
                    
                    {feasibilityData.report.report_text && (
                      <div className="p-4 rounded-md border bg-card">
                        <div className="prose prose-sm max-w-none text-sm">
                          <ReactMarkdown>{feasibilityData.report.report_text}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    {feasibilityData.report.report && typeof feasibilityData.report.report === 'object' && (
                      <div className="space-y-4">
                        {feasibilityData.report.report.quick_summary && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-2">Quick Summary</h4>
                            <div className="text-sm text-green-800 whitespace-pre-wrap">{feasibilityData.report.report.quick_summary}</div>
                          </div>
                        )}
                        
                        {feasibilityData.report.report.entity_fit && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">Entity Fit Analysis</h4>
                            <div className="text-sm text-blue-800">{feasibilityData.report.report.entity_fit}</div>
                          </div>
                        )}
                        
                        {Array.isArray(feasibilityData.report.report.licensing) && feasibilityData.report.report.licensing.length > 0 && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-2">Required Licenses & Permits</h4>
                            <ul className="text-sm text-purple-800 space-y-1">
                              {feasibilityData.report.report.licensing.map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {Array.isArray(feasibilityData.report.report.compliance_risks) && feasibilityData.report.report.compliance_risks.length > 0 && (
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <h4 className="font-medium text-red-900 mb-2">Compliance Risks</h4>
                            <ul className="text-sm text-red-800 space-y-1">
                              {feasibilityData.report.report.compliance_risks.map((risk: string, idx: number) => (
                                <li key={idx}>• {risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {Array.isArray(feasibilityData.report.report.action_items) && feasibilityData.report.report.action_items.length > 0 && (
                          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <h4 className="font-medium text-amber-900 mb-2">Next Steps</h4>
                            <ul className="text-sm text-amber-800 space-y-1">
                              {feasibilityData.report.report.action_items.map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {feasibilityData.report.report.vibe_check && (
                          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <h4 className="font-medium text-indigo-900 mb-2">Overall Feasibility Assessment</h4>
                            <div className="text-sm text-indigo-800">{feasibilityData.report.report.vibe_check}</div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                ) : (
                <div className="p-4 rounded-md border bg-muted/30">
                    <div className="text-sm text-muted-foreground mb-4">
                      No feasibility report generated yet. Click the button below to generate an AI-powered legal feasibility analysis based on your idea.
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button 
                    onClick={generateFeasibilityReport}
                    disabled={feasibilityData.isGenerating || !teamId}
                  >
                    {feasibilityData.isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Feasibility Report
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={!trademarkData.searchCompleted && !implementationData.checklist && !feasibilityData.report}
            >
              Complete Legal Research
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Tabs>
      </div>
      
      {/* Ivie Assistant */}
      <FactorAI currentStation={14} userData={{ mvpData }} context="legal" />
    </div>
  );