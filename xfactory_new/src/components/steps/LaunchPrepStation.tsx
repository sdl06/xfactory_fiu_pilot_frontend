import { useState } from "react";
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
  Globe, 
  Mail, 
  CreditCard,
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Download,
  Copy,
  ExternalLink
} from "lucide-react";
import { FactorAI } from "../FactorAI";
import { useToast } from "@/hooks/use-toast";

interface LaunchPrepStationProps {
  mvpData: any;
  onComplete: (launchPrepData: any) => void;
  onBack: () => void;
}

export const LaunchPrepStation = ({ mvpData, onComplete, onBack }: LaunchPrepStationProps) => {
  const [currentTab, setCurrentTab] = useState("press-release");
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const { toast } = useToast();

  // Press Release State
  const [pressReleaseData, setPressReleaseData] = useState({
    headline: "",
    subtitle: "",
    content: "",
    template: ""
  });

  // Domain & Email State
  const [domainData, setDomainData] = useState({
    domain: "",
    email: "",
    dnsConfigured: false,
    emailConfigured: false
  });

  // Website & Checkout State
  const [integrationData, setIntegrationData] = useState({
    paymentProvider: "",
    websiteUrl: "",
    checkoutIntegrated: false,
    analyticsSetup: false
  });

  const pressReleaseTemplates = [
    {
      id: "startup-launch",
      title: "Startup Product Launch",
      template: `FOR IMMEDIATE RELEASE

[Your Company] Launches Revolutionary [Product Name] to Transform [Industry]

[City, Date] – [Your Company], a [brief company description], today announced the launch of [Product Name], a groundbreaking [product category] designed to [main value proposition].

[Product Name] addresses the critical challenge of [problem you solve] by [how you solve it]. Key features include:
• [Feature 1]
• [Feature 2] 
• [Feature 3]

"[Quote from founder/CEO about the vision and impact]," said [Name], [Title] of [Your Company].

Early users have reported [specific benefit/metric]. [Customer quote if available].

[Product Name] is available starting [date] at [website/pricing]. For more information, visit [website].

About [Your Company]:
[Company boilerplate - 2-3 sentences about company, mission, location, team size, etc.]

Contact:
[Name]
[Title]
[Email]
[Phone]`
    },
    {
      id: "feature-announcement",
      title: "New Feature Announcement",
      template: `FOR IMMEDIATE RELEASE

[Your Company] Unveils Game-Changing [Feature Name] for [Product Name]

[City, Date] – [Your Company] today introduced [Feature Name], a powerful new capability that [main benefit/impact].

The new feature enables users to [specific capability], addressing feedback from [user base size] active users who requested [user need].

Key benefits include:
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

"[Quote about why this feature matters]," said [Name], [Title] at [Your Company].

[Feature Name] is now available to all [Product Name] users at no additional cost. Learn more at [website].

###`
    }
  ];

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

  const handleComplete = () => {
    const launchPrepData = {
      pressRelease: pressReleaseData,
      domain: domainData,
      integrations: integrationData,
      completedSections,
      completedAt: new Date().toISOString()
    };
    onComplete(launchPrepData);
  };

  const progress = (completedSections.length / 3) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-info">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Rocket className="h-8 w-8 text-info-foreground" />
              <div>
                <h1 className="text-xl font-bold text-info-foreground">Launch Prep Station</h1>
                <p className="text-sm text-info-foreground/80">Prepare everything for your product launch</p>
              </div>
            </div>
            <Badge variant="accent">Station 8</Badge>
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
              {completedSections.length} of 3 sections completed
            </p>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="press-release" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Press Release
                {completedSections.includes('press-release') && <CheckCircle className="h-3 w-3 text-success" />}
              </TabsTrigger>
              <TabsTrigger value="domain-email" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain & Email
                {completedSections.includes('domain-email') && <CheckCircle className="h-3 w-3 text-success" />}
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Integrations
                {completedSections.includes('integrations') && <CheckCircle className="h-3 w-3 text-success" />}
              </TabsTrigger>
            </TabsList>

            {/* Press Release Templates */}
            <TabsContent value="press-release" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Press Release Templates
                  </CardTitle>
                  <CardDescription>
                    Create professional press releases to announce your launch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {pressReleaseTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-all">
                        <CardHeader>
                          <CardTitle className="text-lg">{template.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setPressReleaseData({...pressReleaseData, template: template.template})}
                            >
                              Use Template
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(template.template)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {pressReleaseData.template && (
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
                        <Label htmlFor="press-content">Press Release Content</Label>
                        <Textarea
                          id="press-content"
                          rows={12}
                          value={pressReleaseData.template}
                          onChange={(e) => setPressReleaseData({...pressReleaseData, template: e.target.value})}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button onClick={() => handleSectionComplete('press-release')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Press Release
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Domain & Email Setup */}
            <TabsContent value="domain-email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Domain & Email Setup
                  </CardTitle>
                  <CardDescription>
                    Configure your custom domain and professional email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Domain Setup */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Custom Domain
                    </h3>
                    <div>
                      <Label htmlFor="domain">Domain Name</Label>
                      <Input
                        id="domain"
                        placeholder="yourcompany.com"
                        value={domainData.domain}
                        onChange={(e) => setDomainData({...domainData, domain: e.target.value})}
                      />
                    </div>
                    <Card className="p-4 bg-muted/50">
                      <h4 className="font-medium mb-2">DNS Configuration Required:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>A Record (@):</span>
                          <code className="bg-background px-2 py-1 rounded">185.158.133.1</code>
                        </div>
                        <div className="flex justify-between">
                          <span>A Record (www):</span>
                          <code className="bg-background px-2 py-1 rounded">185.158.133.1</code>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => window.open('https://dnschecker.org', '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Check DNS Propagation
                      </Button>
                    </Card>
                  </div>

                  {/* Email Setup */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Professional Email
                    </h3>
                    <div>
                      <Label htmlFor="email">Business Email</Label>
                      <Input
                        id="email"
                        placeholder="hello@yourcompany.com"
                        value={domainData.email}
                        onChange={(e) => setDomainData({...domainData, email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 text-center">
                        <h4 className="font-medium">Google Workspace</h4>
                        <p className="text-sm text-muted-foreground mb-3">$6/user/month</p>
                        <Button variant="outline" size="sm">Setup</Button>
                      </Card>
                      <Card className="p-4 text-center">
                        <h4 className="font-medium">Microsoft 365</h4>
                        <p className="text-sm text-muted-foreground mb-3">$5/user/month</p>
                        <Button variant="outline" size="sm">Setup</Button>
                      </Card>
                      <Card className="p-4 text-center">
                        <h4 className="font-medium">Zoho Mail</h4>
                        <p className="text-sm text-muted-foreground mb-3">$1/user/month</p>
                        <Button variant="outline" size="sm">Setup</Button>
                      </Card>
                    </div>
                  </div>

                  <Button onClick={() => handleSectionComplete('domain-email')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Domain & Email Setup
                  </Button>
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
                            onClick={() => setIntegrationData({...integrationData, paymentProvider: 'stripe'})}
                          >
                            Select Stripe
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
                            onClick={() => setIntegrationData({...integrationData, paymentProvider: 'paypal'})}
                          >
                            Select PayPal
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
                            onClick={() => setIntegrationData({...integrationData, paymentProvider: 'square'})}
                          >
                            Select Square
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
                        placeholder="https://yourcompany.com"
                        value={integrationData.websiteUrl}
                        onChange={(e) => setIntegrationData({...integrationData, websiteUrl: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Analytics & Tracking</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Google Analytics</h4>
                        <p className="text-sm text-muted-foreground mb-3">Track website visitors and behavior</p>
                        <Button variant="outline" size="sm">Setup GA4</Button>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Facebook Pixel</h4>
                        <p className="text-sm text-muted-foreground mb-3">Track conversions for ads</p>
                        <Button variant="outline" size="sm">Setup Pixel</Button>
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
              disabled={completedSections.length < 3}
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