import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Factory, Cog, Users, Shield, TrendingUp, Target, Building2, GraduationCap } from "lucide-react";

interface FactoryLandingProps {
  onStartJourney: () => void;
  onB2BConfig: () => void;
  onMentorSignup: () => void;
  onInvestorSignup: () => void;
  onLogin: () => void;
  onAccountCreation: () => void;
  onHome: () => void;
}

export const FactoryLanding = ({
  onStartJourney,
  onB2BConfig,
  onMentorSignup,
  onInvestorSignup,
  onLogin,
  onAccountCreation,
  onHome,
}: FactoryLandingProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Factory className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">XFactory</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onLogin}>
                Login
              </Button>
              <Button variant="outline" size="sm" onClick={onMentorSignup}>
                Join as Mentor
              </Button>
              <Button variant="outline" size="sm" onClick={onInvestorSignup}>
                Join as Investor
              </Button>
              <Button variant="outline" size="sm" onClick={onB2BConfig}>
                Admin Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <Badge variant="default" className="px-4 py-2">
                🏭 STARTUP MANUFACTURING SYSTEM
              </Badge>
              
              <h1 className="text-6xl md:text-7xl font-bold leading-tight">
                <span className="text-primary">Startup</span>
                <br />
                <span className="text-accent">Factory</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Industrial-grade startup production system. Transform ideas into market-ready products 
                through our assembly line of validation, development, and launch protocols.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="xl" onClick={onAccountCreation} className="group">
                Join Production Line
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Watch Factory Tour
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Production Lines Section */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Production Lines</h2>
            <p className="text-xl text-muted-foreground">
              Multi-stage manufacturing process for startup development
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Main Production Line */}
            <div className="lg:col-span-2">
              <div className="bg-card border rounded-lg p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Cog className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">Main Assembly Line</h3>
                </div>
                
                <div className="space-y-4">
                  {[
                    "Idea Generation & Enhancement",
                    "Auto Visual Mockup Creation", 
                    "Validation Engine",
                    "Pitch Deck Manufacturing",
                    "Mentor Matching System",
                    "MVP Factory Production",
                    "Launch Protocol Execution"
                  ].map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enabler Lines */}
            <div className="space-y-6">
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold">Worker Line</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vetted talent marketplace for hiring developers, marketers, and specialists
                </p>
              </div>

              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold">Legal Line</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automated legal setup, IP protection, and compliance workflows
                </p>
              </div>

              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold">Investor Line</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect with vetted investors and funding opportunities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentor & Investor Network Section */}
      <section className="py-20 bg-muted/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Join Our Expert Network</h2>
            <p className="text-xl text-muted-foreground">
              Help shape the next generation of startups
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-6 mx-auto">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4">Become a Mentor</h3>
              <p className="text-muted-foreground text-center mb-6">
                Share your expertise and guide entrepreneurs through critical startup phases. 
                Help validate ideas, refine strategies, and accelerate growth.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Flexible scheduling and compensation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Access to cutting-edge startups</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Professional development opportunities</span>
                </div>
              </div>
              <Button className="w-full" onClick={onMentorSignup}>
                Apply as Mentor
              </Button>
            </div>

            <div className="bg-card border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center mb-6 mx-auto">
                <TrendingUp className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4">Become an Investor</h3>
              <p className="text-muted-foreground text-center mb-6">
                Discover and invest in high-potential startups going through our systematic 
                validation and development process.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span>Pre-validated startup opportunities</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span>Comprehensive due diligence data</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span>Direct founder access</span>
                </div>
              </div>
              <Button variant="accent" className="w-full" onClick={onInvestorSignup}>
                Join as Investor
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Configuration Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Factory Customization</h2>
            <p className="text-xl text-muted-foreground">
              White-label solutions for institutions and organizations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-6 mx-auto">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-center mb-4">Universities</h3>
              <p className="text-muted-foreground text-center mb-6">
                Custom curriculum integration, student tracking, and academic mentor networks
              </p>
              <Button variant="outline" className="w-full" onClick={onB2BConfig}>
                Configure University Factory
              </Button>
            </div>

            <div className="bg-card border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center mb-6 mx-auto">
                <Target className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold text-center mb-4">Accelerators</h3>
              <p className="text-muted-foreground text-center mb-6">
                Cohort management, investor connections, and fast-track development programs
              </p>
              <Button variant="accent" className="w-full" onClick={onB2BConfig}>
                Setup Accelerator Factory
              </Button>
            </div>

            <div className="bg-card border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-success rounded-lg flex items-center justify-center mb-6 mx-auto">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-center mb-4">Corporations</h3>
              <p className="text-muted-foreground text-center mb-6">
                Innovation labs, intrapreneurship programs, and corporate venture building
              </p>
              <Button variant="success" className="w-full" onClick={onB2BConfig}>
                Launch Corporate Factory
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Factory Stats */}
      <section className="py-16 bg-muted/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">1,000+</div>
              <div className="text-muted-foreground">Startups Manufactured</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-accent">95%</div>
              <div className="text-muted-foreground">Validation Success Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-success">$50M+</div>
              <div className="text-muted-foreground">Total Funding Raised</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-warning">30+</div>
              <div className="text-muted-foreground">Factory Locations</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};