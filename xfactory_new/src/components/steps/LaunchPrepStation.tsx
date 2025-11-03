import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Rocket, 
  FileText, 
  CreditCard,
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { FactorAI } from "../FactorAI";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { UserMenu } from "../UserMenu";

interface LaunchPrepStationProps {
  mvpData: any;
  onComplete: (launchPrepData: any) => void;
  onBack: () => void;
}

export const LaunchPrepStation = ({ mvpData, onComplete, onBack }: LaunchPrepStationProps) => {
  const [currentTab, setCurrentTab] = useState("press-release");
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);
  const { toast } = useToast();

  // Press Release State
  const [pressReleaseData, setPressReleaseData] = useState({
    headline: "",
    subtitle: "",
    content: "",
    template: "",
    featureTemplate: ""
  });

  // Website & Checkout State
  const [integrationData, setIntegrationData] = useState({
    paymentProvider: "",
    websiteUrl: "",
    checkoutIntegrated: false,
    analyticsSetup: false
  });

  // Load saved press releases on mount
  useEffect(() => {
    const loadPressReleases = async () => {
      setIsLoadingReleases(true);
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        
        if (!teamId) {
          setIsLoadingReleases(false);
          return;
        }
        
        const response = await apiClient.getPressReleases(teamId);
        const data = (response as any).data || response;
        
        if (data?.success && data?.press_releases && data.press_releases.length > 0) {
          const productLaunch = data.press_releases.find((r: any) => r.variant === 'product_launch');
          const featureAnnouncement = data.press_releases.find((r: any) => r.variant === 'feature_announcement');
          
          setPressReleaseData({
            headline: productLaunch?.business_name || "",
            subtitle: "",
            content: productLaunch?.content || "",
            template: productLaunch?.content || "",
            featureTemplate: featureAnnouncement?.content || ""
          });
        }
      } catch (error) {
        console.error('Failed to load press releases:', error);
      } finally {
        setIsLoadingReleases(false);
      }
    };
    
    loadPressReleases();
  }, []);

  const handleSectionComplete = (section: string) => {
    if (!completedSections.includes(section)) {
      setCompletedSections([...completedSections, section]);
      toast({
        title: "Section Complete",
        description: `${section.replace('-', ' ')} setup completed successfully!`,
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const generatePressRelease = async () => {
    setIsGenerating(true);
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      
      if (!teamId) {
        toast({
          title: "Error",
          description: "Team ID not found",
          variant: "destructive"
        });
        return;
      }

      // Generate product launch template
      const productResp = await apiClient.generatePressRelease(teamId, 'product_launch');
      // Generate new feature announcement template
      const featureResp = await apiClient.generatePressRelease(teamId, 'feature_announcement');
      
      console.log('Product response:', productResp);
      console.log('Feature response:', featureResp);
      
      const productData = (productResp as any).data || productResp;
      const featureData = (featureResp as any).data || featureResp;
      
      console.log('Product data:', productData);
      console.log('Feature data:', featureData);
      
      if (productData?.success) {
        setPressReleaseData(prev => ({
          ...prev,
          headline: productData.business_name || "",
          subtitle: "",
          content: productData.press_release || "",
          template: productData.press_release || ""
        }));
      }
      if (featureData?.success) {
        setPressReleaseData(prev => ({
          ...prev,
          featureTemplate: featureData.press_release || prev.featureTemplate
        }));
      }
      if (productData?.success || featureData?.success) {
        toast({
          title: "Success!",
          description: "Press release templates generated",
        });
      } else {
        throw new Error('Failed to generate press release');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate press release",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    const launchPrepData = {
      pressRelease: pressReleaseData,
      integrations: integrationData,
      completedSections,
      completedAt: new Date().toISOString()
    };
    onComplete(launchPrepData);
  };

  const progress = (completedSections.length / 2) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-info relative">
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
            className="h-10 w-10 text-info-foreground hover:bg-white/10 rounded-full"
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
                <Rocket className="h-6 w-6 text-info-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-info-foreground">Launch Prep Station</h1>
                <p className="text-sm text-info-foreground/80">Prepare everything for your product launch</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Progress */}
          <div className="mb-6">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {completedSections.length} of 2 sections completed
            </p>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="press-release" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Press Release
                {completedSections.includes('press-release') && <CheckCircle className="h-3 w-3 text-success" />}
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Integrations
                {completedSections.includes('integrations') && <CheckCircle className="h-3 w-3 text-success" />}
              </TabsTrigger>
            </TabsList>

            {/* Press Release Generation */}
            <TabsContent value="press-release" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generate Press Release
                  </CardTitle>
                  <CardDescription>
                    Create professional press releases to announce your launch with AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Button 
                      onClick={generatePressRelease}
                      disabled={isGenerating}
                      className="flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate Press Release
                        </>
                      )}
                    </Button>
                  </div>

                  {isLoadingReleases ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-muted-foreground">Loading press releases...</span>
                    </div>
                  ) : (pressReleaseData.template || pressReleaseData.featureTemplate) && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="headline">Headline</Label>
                        <Input
                          id="headline"
                          placeholder="Your product launch headline"
                          value={pressReleaseData.headline}
                          onChange={(e) => setPressReleaseData({...pressReleaseData, headline: e.target.value})}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="press-content">Press Release Content</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(pressReleaseData.template)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Template
                          </Button>
                        </div>
                        <Textarea
                          id="press-content"
                          rows={12}
                          value={pressReleaseData.template}
                          onChange={(e) => setPressReleaseData({...pressReleaseData, template: e.target.value})}
                          className="text-sm leading-relaxed"
                        />
                      </div>
                      {pressReleaseData.featureTemplate && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="feature-content">New Feature Announcement</Label>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard(pressReleaseData.featureTemplate)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Feature Template
                            </Button>
                          </div>
                          <Textarea
                            id="feature-content"
                            rows={12}
                            value={pressReleaseData.featureTemplate}
                            onChange={(e) => setPressReleaseData({...pressReleaseData, featureTemplate: e.target.value})}
                            className="text-sm leading-relaxed"
                          />
                        </div>
                      )}
                      <Button onClick={() => handleSectionComplete('press-release')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Press Release
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


            {/* Website & Checkout Integrations */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Website & Checkout Integrations
                  </CardTitle>
                  <CardDescription>
                    Set up payment processing and website integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Providers */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Payment Processing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 cursor-pointer hover:shadow-md transition-all">
                        <div className="text-center">
                          <h4 className="font-medium">Stripe</h4>
                          <p className="text-sm text-muted-foreground mb-3">2.9% + 30¢ per transaction</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open('https://dashboard.stripe.com/register', '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Setup Stripe
                          </Button>
                        </div>
                      </Card>
                      <Card className="p-4 cursor-pointer hover:shadow-md transition-all">
                        <div className="text-center">
                          <h4 className="font-medium">PayPal</h4>
                          <p className="text-sm text-muted-foreground mb-3">2.9% + fixed fee</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open('https://www.paypal.com/businessprofile/mysettings/commerce/create', '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Setup PayPal
                          </Button>
                        </div>
                      </Card>
                      <Card className="p-4 cursor-pointer hover:shadow-md transition-all">
                        <div className="text-center">
                          <h4 className="font-medium">Square</h4>
                          <p className="text-sm text-muted-foreground mb-3">2.6% + 10¢ per transaction</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open('https://app.squareup.com/signup/en-US', '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Setup Square
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Website URL */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Website Configuration</h3>
                    <div>
                      <Label htmlFor="website-url">Production Website URL</Label>
                      <Input
                        id="website-url"
                        placeholder="yourcompany.com"
                        value={integrationData.websiteUrl}
                        onChange={(e) => setIntegrationData({...integrationData, websiteUrl: e.target.value})}
                      />
                      {integrationData.websiteUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const url = `https://www.godaddy.com/domainsearch/find?domainToCheck=${integrationData.websiteUrl}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Check Domain Availability
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Analytics & Tracking</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Google Analytics</h4>
                        <p className="text-sm text-muted-foreground mb-3">Track website visitors and behavior</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://analytics.google.com/', '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Setup GA4
                        </Button>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Facebook Pixel</h4>
                        <p className="text-sm text-muted-foreground mb-3">Track conversions for ads</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://business.facebook.com/events_manager', '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Setup Pixel
                        </Button>
                      </Card>
                    </div>
                  </div>

                  <Button onClick={() => handleSectionComplete('integrations')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Integration Setup
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={completedSections.length < 2}
            >
              Complete Launch Prep
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={8}
        userData={{ mvpData }}
        context="launch-preparation"
      />
    </div>
  );
};
