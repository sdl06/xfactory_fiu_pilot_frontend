import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, ArrowLeft, CheckCircle, Search, HelpCircle, Loader2, Brain, BookOpen } from "lucide-react";
import { StationFlowManager } from "@/lib/stationFlow";
import { FactorAI } from "../FactorAI";

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
  const [activeTab, setActiveTab] = useState("trademark");
  
  // Trademark Checker State
  const [trademarkData, setTrademarkData] = useState({
    businessName: '',
    searchResults: [],
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
    checklist: null,
    isGenerating: false
  });

  // Feasibility Report State
  const [feasibilityData, setFeasibilityData] = useState({
    ideaSummary: '',
    report: null,
    isGenerating: false,
    confidence: 0
  });

  // Initialize with MVP data if available
  useEffect(() => {
    if (mvpData?.ideaSummary) {
      setFeasibilityData(prev => ({ ...prev, ideaSummary: mvpData.ideaSummary }));
    }
  }, [mvpData]);

  // Trademark Search Logic
  const searchTrademarks = async () => {
    if (!trademarkData.businessName.trim()) return;
    
    setTrademarkData(prev => ({ ...prev, isSearching: true }));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock results for demonstration
    const mockResults = [
      { name: trademarkData.businessName, status: 'Available', similarity: 0, type: 'Exact Match' },
      { name: trademarkData.businessName + ' Inc', status: 'Taken', similarity: 85, type: 'Similar' },
      { name: trademarkData.businessName.slice(0, -1), status: 'Taken', similarity: 90, type: 'Similar' },
      { name: trademarkData.businessName + ' Solutions', status: 'Pending', similarity: 75, type: 'Similar' }
    ];
    
    setTrademarkData(prev => ({
      ...prev,
      searchResults: mockResults,
      isSearching: false,
      searchCompleted: true
    }));
  };

  // Implementation Guide Generator
  const generateImplementationGuide = async () => {
    setImplementationData(prev => ({ ...prev, isGenerating: true }));
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const checklist = {
      entity: implementationData.businessEntity,
      headquarters: implementationData.headquartersCity,
      employees: implementationData.employeeCount,
      industry: implementationData.industryType,
      timeline: implementationData.timeline,
      
      // Legal requirements based on entity type
      entityRequirements: getEntityRequirements(implementationData.businessEntity),
      
      // Employment law requirements based on employee count
      employmentRequirements: getEmploymentRequirements(implementationData.employeeCount),
      
      // Industry-specific compliance
      industryCompliance: getIndustryCompliance(implementationData.industryType),
      
      // Location-specific requirements
      locationRequirements: getLocationRequirements(implementationData.headquartersCity),
      
      // Timeline-based milestones
      milestones: getTimelineMilestones(implementationData.timeline)
    };
    
    setImplementationData(prev => ({ ...prev, checklist, isGenerating: false }));
  };

  // Helper functions for generating legal requirements
  const getEntityRequirements = (entity: string) => {
    const requirements: { [key: string]: string[] } = {
      'delaware-c-corp': [
        'File Certificate of Incorporation in Delaware',
        'Appoint registered agent in Delaware',
        'Draft corporate bylaws',
        'Issue stock certificates',
        'Hold organizational board meeting',
        'Obtain federal EIN',
        'File Form 8832 (entity classification election)',
        'Set up corporate records book'
      ],
      'llc': [
        'File Articles of Organization',
        'Create Operating Agreement',
        'Obtain federal EIN',
        'Choose tax classification (Form 8832)',
        'Register for state taxes',
        'Get required business licenses',
        'Open business bank account'
      ],
      's-corp': [
        'File Articles of Incorporation',
        'Draft corporate bylaws',
        'File Form 2553 (S-Corp election)',
        'Issue stock certificates',
        'Obtain federal EIN',
        'Set up payroll for owner-employees',
        'Maintain corporate formalities'
      ]
    };
    return requirements[entity] || ['Consult with attorney for entity-specific requirements'];
  };

  const getEmploymentRequirements = (count: string) => {
    const requirements: { [key: string]: string[] } = {
      '1': ['No additional employment law requirements'],
      '2-9': [
        'Obtain workers\' compensation insurance',
        'Register for unemployment insurance',
        'Prepare employee handbook',
        'Set up I-9 verification process'
      ],
      '10-49': [
        'Workers\' compensation insurance',
        'Unemployment insurance registration',
        'Employee handbook with anti-discrimination policies',
        'I-9 verification and E-Verify compliance',
        'OSHA workplace safety compliance',
        'State disability insurance (if applicable)'
      ],
      '50+': [
        'All previous requirements plus:',
        'ACA compliance (health insurance reporting)',
        'FMLA compliance and policies',
        'Enhanced OSHA reporting requirements',
        'EEO-1 reporting (if 100+ employees)',
        'COBRA administration'
      ]
    };
    return requirements[count] || ['Consult employment attorney for specific requirements'];
  };

  const getIndustryCompliance = (industry: string) => {
    const compliance: { [key: string]: string[] } = {
      'fintech': [
        'Money transmitter licenses (state-by-state)',
        'FinCEN registration and BSA compliance',
        'PCI DSS compliance for payment processing',
        'SOC 2 Type II certification',
        'State usury law compliance'
      ],
      'healthcare': [
        'HIPAA compliance program',
        'State healthcare licenses',
        'Medical device FDA regulations (if applicable)',
        'Professional liability insurance',
        'Clinical trial regulations (if applicable)'
      ],
      'saas': [
        'Data privacy compliance (GDPR, CCPA)',
        'SOC 2 certification',
        'Terms of service and privacy policy',
        'International data transfer agreements',
        'Cybersecurity insurance'
      ],
      'ecommerce': [
        'Sales tax registration (multi-state)',
        'Consumer protection law compliance',
        'Product liability insurance',
        'Return/refund policy compliance',
        'International trade regulations (if applicable)'
      ]
    };
    return compliance[industry] || ['General business compliance requirements'];
  };

  const getLocationRequirements = (city: string) => {
    // Simplified based on major cities - in practice would need more detailed mapping
    if (city.toLowerCase().includes('new york')) {
      return [
        'NYC business license',
        'New York State tax registration',
        'Commercial lease compliance',
        'Fire department certificate of occupancy'
      ];
    } else if (city.toLowerCase().includes('san francisco') || city.toLowerCase().includes('california')) {
      return [
        'California state tax registration',
        'Local business license',
        'California Privacy Rights Act compliance',
        'Workers\' compensation (CA specific requirements)'
      ];
    } else {
      return [
        'Local business license registration',
        'State tax registration',
        'Zoning compliance verification',
        'Local permit requirements'
      ];
    }
  };

  const getTimelineMilestones = (timeline: string) => {
    const milestones: { [key: string]: Array<{phase: string, timeframe: string, tasks: string[]}> } = {
      '3-months': [
        {
          phase: 'Month 1',
          timeframe: 'Weeks 1-4',
          tasks: ['Entity formation', 'EIN acquisition', 'Banking setup', 'Initial compliance research']
        },
        {
          phase: 'Month 2', 
          timeframe: 'Weeks 5-8',
          tasks: ['License applications', 'Insurance procurement', 'Legal documentation', 'Tax registrations']
        },
        {
          phase: 'Month 3',
          timeframe: 'Weeks 9-12', 
          tasks: ['Final compliance verification', 'Employee handbook', 'Ongoing compliance systems', 'Legal review']
        }
      ],
      '6-months': [
        {
          phase: 'Months 1-2',
          timeframe: 'Foundation Phase',
          tasks: ['Entity formation', 'Banking and EIN', 'Core legal documentation', 'Initial license research']
        },
        {
          phase: 'Months 3-4',
          timeframe: 'Compliance Phase', 
          tasks: ['License applications', 'Insurance setup', 'Employment law compliance', 'Industry-specific requirements']
        },
        {
          phase: 'Months 5-6',
          timeframe: 'Optimization Phase',
          tasks: ['Advanced compliance', 'Policy refinement', 'Legal system optimization', 'Growth preparation']
        }
      ]
    };
    return milestones[timeline] || milestones['6-months'];
  };

  // Feasibility Report Generator
  const generateFeasibilityReport = async () => {
    if (!feasibilityData.ideaSummary.trim()) return;
    
    setFeasibilityData(prev => ({ ...prev, isGenerating: true }));
    
    // Simulate deep research model delay
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const report = {
      viabilityScore: Math.floor(Math.random() * 30) + 70, // 70-100%
      marketSize: `$${(Math.random() * 50 + 10).toFixed(1)}B global market`,
      competition: 'Moderate to High',
      barriers: ['Technical complexity', 'Regulatory requirements', 'Capital requirements'],
      opportunities: ['Growing market demand', 'Technological advancement', 'Underserved segments'],
      risks: ['Market saturation', 'Regulatory changes', 'Technology disruption'],
      recommendations: [
        'Focus on unique value proposition',
        'Build strong team with relevant expertise',
        'Start with MVP to validate assumptions',
        'Consider strategic partnerships'
      ],
      nextSteps: [
        'Conduct detailed market research',
        'Develop prototype/MVP',
        'Validate with target customers',
        'Secure initial funding'
      ]
    };
    
    setFeasibilityData(prev => ({ 
      ...prev, 
      report, 
      isGenerating: false,
      confidence: report.viabilityScore
    }));
  };

  const handleComplete = () => {
    const legalData = {
      trademarkData,
      implementationData,
      feasibilityData,
      completedAt: new Date().toISOString()
    };

    StationFlowManager.saveStationOutput('legal', legalData, 90);
    onComplete(legalData);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Scale className="h-8 w-8 text-primary" />
                Legal Workshop
              </h1>
              <p className="text-muted-foreground mt-1">
                Build your legal foundation with guided tools and templates
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">Station 10/11</Badge>
        </div>

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
                  Business Name Trademark Checker
                </CardTitle>
                <CardDescription>
                  Check if your business name is available for trademark registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business/Brand Name</Label>
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
                            Searching...
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

                  {trademarkData.searchCompleted && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Search Results</h3>
                      <div className="space-y-3">
                        {trademarkData.searchResults.map((result: any, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{result.name}</div>
                              <div className="text-sm text-muted-foreground">{result.type}</div>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={result.status === 'Available' ? 'default' : 
                                        result.status === 'Taken' ? 'destructive' : 'secondary'}
                              >
                                {result.status}
                              </Badge>
                              {result.similarity > 0 && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {result.similarity}% similar
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Consider consulting with a trademark attorney</li>
                          <li>• File a trademark application if name is available</li>
                          <li>• Consider alternative names if conflicts exist</li>
                          <li>• Check domain availability for your chosen name</li>
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
                  Get a customized legal compliance checklist based on your business structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Business Entity Type</Label>
                      <Select onValueChange={(value) => setImplementationData(prev => ({ ...prev, businessEntity: value }))}>
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
                      <Label>Headquarters City/State</Label>
                      <Input
                        placeholder="e.g., San Francisco, CA"
                        value={implementationData.headquartersCity}
                        onChange={(e) => setImplementationData(prev => ({ ...prev, headquartersCity: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Expected Employee Count</Label>
                      <Select onValueChange={(value) => setImplementationData(prev => ({ ...prev, employeeCount: value }))}>
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
                      <Label>Industry Type</Label>
                      <Select onValueChange={(value) => setImplementationData(prev => ({ ...prev, industryType: value }))}>
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
                      <Label>Implementation Timeline</Label>
                      <Select onValueChange={(value) => setImplementationData(prev => ({ ...prev, timeline: value }))}>
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
                      onClick={generateImplementationGuide}
                      disabled={implementationData.isGenerating || !implementationData.businessEntity || !implementationData.employeeCount}
                      className="w-full"
                    >
                      {implementationData.isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Checklist...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Generate Legal Checklist
                        </>
                      )}
                    </Button>
                  </div>

                  {implementationData.checklist && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                        <h3 className="font-semibold text-blue-900 mb-2">Legal Compliance Checklist</h3>
                        <div className="text-blue-800 text-sm space-y-1">
                          <div><strong>Entity:</strong> {implementationData.checklist.entity}</div>
                          <div><strong>Location:</strong> {implementationData.checklist.headquarters}</div>
                          <div><strong>Team Size:</strong> {implementationData.checklist.employees}</div>
                          <div><strong>Industry:</strong> {implementationData.checklist.industry}</div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
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
                      </div>

                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-amber-900 mb-2">Implementation Timeline</h4>
                        <div className="space-y-2">
                          {implementationData.checklist.milestones.map((milestone: any, index: number) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium text-amber-800">{milestone.phase} ({milestone.timeframe})</div>
                              <div className="text-amber-700 ml-2">
                                {milestone.tasks.join(' • ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
                  This section will display the Flowise-powered legal deep research report tailored to your business idea.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Idea Summary</Label>
                  <Textarea
                    placeholder="Briefly summarize your idea to guide the legal deep research"
                    value={feasibilityData.ideaSummary}
                    onChange={(e) => setFeasibilityData(prev => ({ ...prev, ideaSummary: e.target.value }))}
                  />
                </div>
                <div className="p-4 rounded-md border bg-muted/30">
                  <div className="text-sm text-muted-foreground">
                    Placeholder: Flowise Legal Deep Research report will render here.
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button disabled>
                    <Loader2 className="h-4 w-4 mr-2" />
                    Generating Report...
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
    </div>
  );
};