import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Plus, X, Users, Star, BookOpen, CheckCircle } from "lucide-react";

interface MentorAccountCreationProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

export const MentorAccountCreation = ({ onBack, onComplete }: MentorAccountCreationProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    photo: "",
    expertise: "",
    experience: "",
    background: "",
    company: "",
    position: "",
    yearsExperience: "",
    successfulLaunches: "",
    menteeCount: "",
    industries: [] as string[],
    skills: [] as string[],
    availability: "",
    hourlyRate: "",
    linkedinUrl: "",
    portfolioUrl: "",
    calendlyUrl: ""
  });

  const [newIndustry, setNewIndustry] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const industryOptions = [
    "Technology", "Healthcare", "Finance", "E-commerce", "SaaS", "Mobile Apps",
    "AI/ML", "Blockchain", "EdTech", "FinTech", "Consumer Products", "B2B Software"
  ];

  const skillOptions = [
    "Product Strategy", "UX Design", "Growth Marketing", "Technical Architecture",
    "Fundraising", "Team Building", "Sales Strategy", "Business Development",
    "Data Analytics", "User Research", "Brand Strategy", "Operations"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addIndustry = () => {
    if (newIndustry && !formData.industries.includes(newIndustry)) {
      setFormData(prev => ({
        ...prev,
        industries: [...prev.industries, newIndustry]
      }));
      setNewIndustry("");
    }
  };

  const removeIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.filter(i => i !== industry)
    }));
  };

  const addSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = () => {
    onComplete({
      ...formData,
      accountType: "mentor",
      createdAt: new Date().toISOString()
    });
  };

  const isFormValid = () => {
    const requiredFields = [
      formData.name,
      formData.email,
      formData.password,
      formData.company,
      formData.position,
      formData.calendlyUrl,
    ];
    return requiredFields.every(v => String(v || '').trim().length > 0);
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
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-50">Become a Mentor</h1>
              <p className="text-sm text-slate-50">Join our expert mentor network</p>
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
                <Users className="h-5 w-5 text-primary" />
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
                    placeholder="Sarah Chen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="sarah.chen@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Enter a strong password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Profile Photo</Label>
                <div className="grid md:grid-cols-2 gap-2">
                <Input
                  id="photo"
                  value={formData.photo}
                  onChange={(e) => handleInputChange("photo", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                  <div className="flex items-center gap-2">
                    <Input id="photoFile" type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { apiClient } = await import("@/lib/api");
                        const res = await apiClient.uploadMentorPhoto(file);
                        const url = (res as any)?.data?.url;
                        if (res.status >= 200 && res.status < 300 && url) {
                          handleInputChange("photo", url);
                        } else {
                          alert((res as any)?.data?.error || 'Upload failed');
                        }
                      } catch (err: any) {
                        alert(err?.message || 'Upload failed');
                      }
                    }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Background */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                Professional Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Current/Previous Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Google"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position/Title</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    placeholder="Senior Product Manager"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise">Primary Expertise</Label>
                <Input
                  id="expertise"
                  value={formData.expertise}
                  onChange={(e) => handleInputChange("expertise", e.target.value)}
                  placeholder="Product Strategy & UX Design"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                  placeholder="8+ years at Google, 3 successful product launches"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Detailed Background</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => handleInputChange("background", e.target.value)}
                  placeholder="Former Google Product Manager with 8+ years experience in building consumer tech products. Successfully led 3 product launches that reached 10M+ users..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Track Record */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-success" />
                Track Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="successfulLaunches">Successful Product Launches</Label>
                  <Input
                    id="successfulLaunches"
                    type="number"
                    value={formData.successfulLaunches}
                    onChange={(e) => handleInputChange("successfulLaunches", e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menteeCount">Previous Mentees</Label>
                  <Input
                    id="menteeCount"
                    type="number"
                    value={formData.menteeCount}
                    onChange={(e) => handleInputChange("menteeCount", e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                    placeholder="150"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industries & Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Industries & Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Industries */}
              <div className="space-y-3">
                <Label>Industries</Label>
                <div className="flex gap-2">
                  <Select value={newIndustry} onValueChange={setNewIndustry}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addIndustry} disabled={!newIndustry}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.industries.map(industry => (
                    <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                      {industry}
                      <button onClick={() => removeIndustry(industry)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Select value={newSkill} onValueChange={setNewSkill}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillOptions.map(skill => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addSkill} disabled={!newSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map(skill => (
                    <Badge key={skill} variant="accent" className="flex items-center gap-1">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>
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
                    placeholder="https://linkedin.com/in/sarah-chen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">Portfolio/Website</Label>
                  <Input
                    id="portfolioUrl"
                    value={formData.portfolioUrl}
                    onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
                    placeholder="https://sarahchen.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Select value={formData.availability} onValueChange={(value) => handleInputChange("availability", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-10hrs">5-10 hours per week</SelectItem>
                    <SelectItem value="10-20hrs">10-20 hours per week</SelectItem>
                    <SelectItem value="20+hrs">20+ hours per week</SelectItem>
                    <SelectItem value="project-based">Project-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendlyUrl">Calendly Link</Label>
                <Input
                  id="calendlyUrl"
                  value={formData.calendlyUrl}
                  onChange={(e) => handleInputChange("calendlyUrl", e.target.value)}
                  placeholder="https://calendly.com/your-handle"
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
                        ? 'Your mentor application is ready for review'
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
                  Register
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};