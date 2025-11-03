import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Globe, 
  Mail, 
  CreditCard,
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Loader2,
  ExternalLink,
  Users,
  BarChart3,
  Megaphone,
  Zap
} from "lucide-react";
import { FactorAI } from "../FactorAI";
import { useToast } from "@/hooks/use-toast";
import { UserMenu } from "../UserMenu";

interface LaunchExecutionStationProps {
  launchPrepData: any;
  onComplete: (launchExecutionData: any) => void;
  onBack: () => void;
}

export const LaunchExecutionStation = ({ launchPrepData, onComplete, onBack }: LaunchExecutionStationProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState(0);
  const [launchedAssets, setLaunchedAssets] = useState<string[]>([]);
  const [launchComplete, setLaunchComplete] = useState(false);
  const { toast } = useToast();

  const assets = [
    {
      id: "website",
      name: "Production Website",
      description: "Deploy your website to production servers",
      icon: Globe,
      url: launchPrepData?.integrations?.websiteUrl || "https://yourcompany.com",
      status: "ready"
    },
    {
      id: "domain",
      name: "Custom Domain",
      description: "Activate your custom domain and SSL certificate",
      icon: Globe,
      url: launchPrepData?.domain?.domain || "yourcompany.com",
      status: "ready"
    },
    {
      id: "email",
      name: "Business Email",
      description: "Activate professional email addresses",
      icon: Mail,
      url: `mailto:${launchPrepData?.domain?.email || 'hello@yourcompany.com'}`,
      status: "ready"
    },
    {
      id: "payments",
      name: "Payment Processing",
      description: "Enable live payment processing and checkout",
      icon: CreditCard,
      url: "#",
      status: "ready"
    },
    {
      id: "analytics",
      name: "Analytics & Tracking",
      description: "Start tracking visitors and conversions",
      icon: BarChart3,
      url: "#",
      status: "ready"
    },
    {
      id: "press-release",
      name: "Press Release Distribution",
      description: "Distribute your press release to media outlets",
      icon: Megaphone,
      url: "#",
      status: "ready"
    }
  ];

  const executeGoLive = async () => {
    setIsLaunching(true);
    setLaunchProgress(0);
    setLaunchedAssets([]);

    const launchSteps = [
      { asset: "website", delay: 2000, message: "Deploying website to production..." },
      { asset: "domain", delay: 1500, message: "Activating custom domain..." },
      { asset: "email", delay: 1000, message: "Setting up business email..." },
      { asset: "payments", delay: 2000, message: "Enabling payment processing..." },
      { asset: "analytics", delay: 1000, message: "Starting analytics tracking..." },
      { asset: "press-release", delay: 1500, message: "Distributing press release..." }
    ];

    for (let i = 0; i < launchSteps.length; i++) {
      const step = launchSteps[i];
      
      toast({
        title: "Launching Asset",
        description: step.message,
      });

      await new Promise(resolve => setTimeout(resolve, step.delay));
      
      setLaunchedAssets(prev => [...prev, step.asset]);
      setLaunchProgress(((i + 1) / launchSteps.length) * 100);
    }

    // Final completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLaunchComplete(true);
    setIsLaunching(false);

    toast({
      title: "🚀 Launch Complete!",
      description: "All assets are now live and ready for customers!",
    });

    // Generate launch execution data
    const launchExecutionData = {
      launchDate: new Date().toISOString(),
      launchedAssets: assets.map(asset => ({
        ...asset,
        launchedAt: new Date().toISOString(),
        status: "live"
      })),
      metrics: {
        initialVisitors: Math.floor(Math.random() * 500) + 100,
        signups: Math.floor(Math.random() * 50) + 25,
        conversions: Math.floor(Math.random() * 10) + 5
      },
      channels: [
        "Direct traffic",
        "Social media",
        "Press coverage",
        "Email marketing"
      ]
    };

    // Auto-complete after 3 seconds
    setTimeout(() => {
      onComplete(launchExecutionData);
    }, 3000);
  };

  const getAssetStatus = (assetId: string) => {
    if (launchedAssets.includes(assetId)) return "live";
    if (isLaunching && launchedAssets.length < assets.findIndex(a => a.id === assetId) + 1) return "launching";
    return "ready";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary to-primary/80 relative">
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
            className="h-10 w-10 text-primary-foreground hover:bg-white/10 rounded-full"
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
                <Rocket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Launch Execution Station</h1>
                <p className="text-sm text-primary-foreground/80">Go live with all your assets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Launch Status */}
          {isLaunching && (
            <Card className="border-primary">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <div>
                    <h3 className="font-semibold">Launching Assets...</h3>
                    <p className="text-sm text-muted-foreground">
                      {launchedAssets.length} of {assets.length} assets deployed
                    </p>
                  </div>
                </div>
                <Progress value={launchProgress} className="w-full" />
              </CardContent>
            </Card>
          )}

          {/* Launch Complete Status */}
          {launchComplete && (
            <Card className="border-success bg-success/5">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
                      <Rocket className="h-8 w-8 text-success-foreground" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-success mb-2">🚀 Launch Successful!</h2>
                  <p className="text-muted-foreground mb-4">
                    All your assets are now live and ready for customers. Your startup is officially launched!
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => window.open(assets[0].url, '_blank')}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Live Site
                    </Button>
                    <Button variant="outline" onClick={() => window.open('https://analytics.google.com', '_blank')}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Launch Assets Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Launch Assets
              </CardTitle>
              <CardDescription>
                Review all assets ready for launch. Click "Go Live" to deploy everything at once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {assets.map((asset) => {
                  const Icon = asset.icon;
                  const status = getAssetStatus(asset.id);
                  
                  return (
                    <Card 
                      key={asset.id} 
                      className={`transition-all ${
                        status === 'live' ? 'border-success bg-success/5' :
                        status === 'launching' ? 'border-warning bg-warning/5' :
                        'border-muted'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            status === 'live' ? 'bg-success text-success-foreground' :
                            status === 'launching' ? 'bg-warning text-warning-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {status === 'live' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : status === 'launching' ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight">{asset.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>
                            <Badge 
                              variant={
                                status === 'live' ? 'success' :
                                status === 'launching' ? 'accent' :
                                'secondary'
                              } 
                              className="text-xs mt-2"
                            >
                              {status === 'live' ? 'Live' :
                               status === 'launching' ? 'Launching...' :
                               'Ready'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Go Live Button */}
              {!launchComplete && (
                <div className="text-center">
                  <Button 
                    onClick={executeGoLive}
                    disabled={isLaunching}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-3"
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-5 w-5" />
                        🚀 Go Live with All Assets
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    This will deploy all your assets to production and make them live for customers
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack} disabled={isLaunching}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            {launchComplete && (
              <Button onClick={() => onComplete({})}>
                Continue to Performance Monitoring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={9}
        userData={{ launchPrepData }}
        context="launch-execution"
      />
    </div>
  );