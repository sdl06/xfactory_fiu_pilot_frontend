import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, TrendingUp, DollarSign, Target, CheckCircle } from "lucide-react";

interface InvestorAccountCreationProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

export const InvestorAccountCreation = ({ onBack, onComplete }: InvestorAccountCreationProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    photo: "",
    organization: "",
    title: "",
    investorType: "",
    portfolioSize: "",
    checkSizeMin: "",
    checkSizeMax: "",
    totalInvestments: "",
    successfulExits: "",
    background: "",
    investmentFocus: [] as string[],
    preferredStages: [] as string[],
    geography: [] as string[],
    linkedinUrl: "",
    firmWebsite: "",
    bio: "",
    notable_investments: ""
  });

  const [newFocus, setNewFocus] = useState("");
  const [newStage, setNewStage] = useState("");
  const [newGeography, setNewGeography] = useState("");

  const investmentFocusOptions = [
    "Technology", "Healthcare", "Finance", "E-commerce", "SaaS", "Mobile Apps",
    "AI/ML", "Blockchain", "EdTech", "FinTech", "Consumer Products", "B2B Software",
    "Clean Energy", "BioTech", "Real Estate Tech", "Media & Entertainment"
  ];

  const stageOptions = [
    "Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Late Stage"
  ];

  const geographyOptions = [
    "North America", "Europe", "Asia Pacific", "Latin America", "Middle East", 
    "Africa", "Global", "US Only", "Silicon Valley", "New York", "London", "Berlin"
  ];

  const investorTypeOptions = [
    "Angel Investor", "Venture Capital", "Private Equity", "Corporate VC", 
    "Family Office", "Accelerator", "Incubator", "Government Fund"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: string, value: string, setValue: (val: string) => void) => {
    if (value && !formData[field as keyof typeof formData].includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof formData] as string[]), value]
      }));
      setValue("");
    }
  };

  const removeFromArray = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof formData] as string[]).filter(item => item !== value)
    }));
  };

  const handleSubmit = () => {
    onComplete({
      ...formData,
      accountType: "investor",
      createdAt: new Date().toISOString()
    });
  };

  const isFormValid = () => {
    return formData.name && formData.email && formData.organization && 
           formData.investorType && formData.checkSizeMin && formData.investmentFocus.length > 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Landing
            </Button>
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-50">Become an Investor</h1>
              <p className="text-sm text-slate-50">Join our investor network</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Alex Morgan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="alex.morgan@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo">Profile Photo URL</Label>
                <Input
                  id="photo"
                  value={formData.photo}
                  onChange={(e) => handleInputChange("photo", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Background */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Investment Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization/Fund</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => handleInputChange("organization", e.target.value)}
                    placeholder="Accel Partners"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title/Position</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="General Partner"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investorType">Investor Type</Label>
                  <Select value={formData.investorType} onValueChange={(value) => handleInputChange("investorType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investor type" />
                    </SelectTrigger>
                    <SelectContent>
                      {investorTypeOptions.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioSize">Portfolio Size (USD)</Label>
                  <Input
                    id="portfolioSize"
                    value={formData.portfolioSize}
                    onChange={(e) => handleInputChange("portfolioSize", e.target.value)}
                    placeholder="$100M"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkSizeMin">Min Check Size (USD)</Label>
                  <Input
                    id="checkSizeMin"
                    value={formData.checkSizeMin}
                    onChange={(e) => handleInputChange("checkSizeMin", e.target.value)}
                    placeholder="$25,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkSizeMax">Max Check Size (USD)</Label>
                  <Input
                    id="checkSizeMax"
                    value={formData.checkSizeMax}
                    onChange={(e) => handleInputChange("checkSizeMax", e.target.value)}
                    placeholder="$1,000,000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Investment Background</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => handleInputChange("background", e.target.value)}
                  placeholder="General Partner at Accel Partners with 10+ years of venture capital experience. Led investments in 50+ startups with 8 successful exits..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Track Record */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                Investment Track Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalInvestments">Total Investments Made</Label>
                  <Input
                    id="totalInvestments"
                    type="number"
                    value={formData.totalInvestments}
                    onChange={(e) => handleInputChange("totalInvestments", e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="successfulExits">Successful Exits</Label>
                  <Input
                    id="successfulExits"
                    type="number"
                    value={formData.successfulExits}
                    onChange={(e) => handleInputChange("successfulExits", e.target.value)}
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notable_investments">Notable Investments</Label>
                <Textarea
                  id="notable_investments"
                  value={formData.notable_investments}
                  onChange={(e) => handleInputChange("notable_investments", e.target.value)}
                  placeholder="Led Series A rounds in Slack ($27B acquisition), Dropbox (IPO), and 6 other unicorns..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Investment Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Investment Focus */}
              <div className="space-y-3">
                <Label>Investment Focus Areas</Label>
                <div className="flex gap-2">
                  <Select value={newFocus} onValueChange={setNewFocus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select focus area" />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentFocusOptions.map(focus => (
                        <SelectItem key={focus} value={focus}>
                          {focus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addToArray("investmentFocus", newFocus, setNewFocus)} disabled={!newFocus}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.investmentFocus.map(focus => (
                    <Badge key={focus} variant="secondary" className="flex items-center gap-1">
                      {focus}
                      <button onClick={() => removeFromArray("investmentFocus", focus)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preferred Stages */}
              <div className="space-y-3">
                <Label>Preferred Investment Stages</Label>
                <div className="flex gap-2">
                  <Select value={newStage} onValueChange={setNewStage}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stageOptions.map(stage => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addToArray("preferredStages", newStage, setNewStage)} disabled={!newStage}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.preferredStages.map(stage => (
                    <Badge key={stage} variant="accent" className="flex items-center gap-1">
                      {stage}
                      <button onClick={() => removeFromArray("preferredStages", stage)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Geography */}
              <div className="space-y-3">
                <Label>Geographic Focus</Label>
                <div className="flex gap-2">
                  <Select value={newGeography} onValueChange={setNewGeography}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select geography" />
                    </SelectTrigger>
                    <SelectContent>
                      {geographyOptions.map(geo => (
                        <SelectItem key={geo} value={geo}>
                          {geo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addToArray("geography", newGeography, setNewGeography)} disabled={!newGeography}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.geography.map(geo => (
                    <Badge key={geo} variant="success" className="flex items-center gap-1">
                      {geo}
                      <button onClick={() => removeFromArray("geography", geo)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/alex-morgan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firmWebsite">Firm Website</Label>
                  <Input
                    id="firmWebsite"
                    value={formData.firmWebsite}
                    onChange={(e) => handleInputChange("firmWebsite", e.target.value)}
                    placeholder="https://accel.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Personal Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Brief personal bio and investment philosophy..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Card className={`border-2 ${isFormValid() ? 'border-success bg-success/5' : 'border-muted'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`h-6 w-6 ${isFormValid() ? 'text-success' : 'text-muted-foreground'}`} />
                  <div>
                    <h3 className="font-semibold">
                      {isFormValid() ? 'Ready to Submit' : 'Complete Required Fields'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isFormValid() 
                        ? 'Your investor application is ready for review'
                        : 'Fill in all required fields to submit your application'
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isFormValid()}
                  size="lg"
                >
                  Submit Application
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};