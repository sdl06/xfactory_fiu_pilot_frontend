import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, User, Users, UserPlus, Crown, Mail, Lock, DollarSign, Code, Target, AlertTriangle, Loader2, ChevronDown, X, CheckCircle, XCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface AccountCreationFlowProps {
  onComplete: (accountData: any) => void;
  onBack: () => void;
  forceNewAccount?: boolean;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: number;
  skills: string[];
  openPositions: string[];
  leader: string;
}

export const AccountCreationFlow = ({ onComplete, onBack, forceNewAccount = false }: AccountCreationFlowProps) => {
  const { user, setAuthData } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Always start at account creation (no skip)
  useEffect(() => {
    // This effect intentionally left minimal; see below for async setup after functions are defined
  }, []);
  const [accountData, setAccountData] = useState({
    email: "",
    studentId: "",
    password: "",
    courseProfessor: "",
    major: "",
    phoneNumber: ""
  });
  const [teamChoice, setTeamChoice] = useState<"create" | "join" | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    is_open_for_requests: true,
    funding_access: "",
    technical_expertise: "",
    looking_for: [] as Array<{
      keywords: string;
      job_role: string;
      job_description: string;
      key_skills: string;
    }>
  });
  const [currentKeywordInputs, setCurrentKeywordInputs] = useState<{[key: number]: string}>({});
  const [joinRequest, setJoinRequest] = useState({
    message: "",
    preferred_archetype: ""
  });
  const [teamCode, setTeamCode] = useState("");
  const [isFindingByCode, setIsFindingByCode] = useState(false);
  const [additionRequests, setAdditionRequests] = useState<any[]>([]);
  const [additionRequestsCount, setAdditionRequestsCount] = useState(0);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberMessage, setNewMemberMessage] = useState("");
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [selectedEligibleUser, setSelectedEligibleUser] = useState<string>("");
  const [isLoadingEligibleUsers, setIsLoadingEligibleUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<string[]>([]);


  const fundingOptions = [
    "Self-funded - Using your own money",
    "Seeking angel investment - Rich individuals invest in your idea",
    "Preparing for VC - Professional investors give larger amounts",
    "Government grants - Free money from government programs",
    "Crowdfunding - Many people donate small amounts online",
    "Already funded - You already have money for your business",
    "I don't know - Not sure about funding options yet"
  ];

  const techLevels = [
    "Basic - I can create an Instagram account",
    "Medium - I can proficiently use AI",
    "Advanced - I can code with Python",
    "Expert - I can build an app"
  ];

  const handleAccountSubmit = async () => {
    if (!accountData.email || !accountData.password) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Register the user
      const response = await apiClient.post('/auth/register/', {
        email: accountData.email,
        password: accountData.password,
        password_confirm: accountData.password,
        first_name: accountData.email.split('@')[0],
        last_name: "",
        student_id: accountData.studentId,
        course_professor: accountData.courseProfessor,
        major: accountData.major,
        phone_number: accountData.phoneNumber
      });

      console.log('Registration response:', response); // DEBUG

      // ApiClient returns a response object, not throwing errors
      if (response.data && response.status >= 200 && response.status < 300) {
        // Success case - auto-login the user
        
        // Update the auth context to log the user in
        setAuthData(response.data.token, response.data.user);
        
        toast({
          title: "Account Created Successfully!",
          description: "Welcome to Ivy Factory. You are now logged in. Let's set up your team.",
        });
        
        // Load available teams for step 2
        await loadAvailableTeams();
        setStep(2);
      } else {
        // Error case - handle the error response
        console.log('Error response data:', response.data); // DEBUG
        if (response.data) {
          const errorData = response.data;
          
          // Handle field-specific errors (like email validation)
          if (errorData.email && Array.isArray(errorData.email)) {
            console.log('Setting email error:', errorData.email[0]); // DEBUG
            setError(errorData.email[0]);
          } else if (errorData.password && Array.isArray(errorData.password)) {
            setError(errorData.password[0]);
          } else if (errorData.password_confirm && Array.isArray(errorData.password_confirm)) {
            setError(errorData.password_confirm[0]);
          } else if (errorData.error) {
            // Handle general error messages
            setError(errorData.error);
          } else if (typeof errorData === 'string') {
            setError(errorData);
          } else {
            // Handle non-field errors or validation errors
            const firstError = Object.values(errorData)[0];
            if (Array.isArray(firstError)) {
              setError(firstError[0]);
            } else {
              setError(String(firstError));
            }
          }
        } else if (response.error) {
          // Handle generic error from ApiClient
          setError(response.error);
        } else {
          setError("An error occurred during registration. Please try again.");
        }
      }
    } catch (error: any) {
      // Handle network errors or other exceptions
      console.error('Registration error:', error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTeams = async () => {
    try {
      const response = await apiClient.get('/team-formation/teams/?open_only=true');
      if (response.data) {
        setAvailableTeams(response.data);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setAvailableTeams([]);
    }
  };

  // Background init after functions are defined
  useEffect(() => {
    // Load teams in background so step 2 is ready when user proceeds
    loadAvailableTeams();
    // If user is already authenticated (forceNewAccount === false), skip account form and go to team step
    try {
      if (!forceNewAccount && user) {
        setStep(2);
      }
    } catch {}
    // If user has pending join requests and no current team, go straight to team formation
    (async () => {
      try {
        if (!user) return;
        const status = await apiClient.get('/team-formation/status/');
        const hasPending = Array.isArray(status.data?.pending_requests) && status.data.pending_requests.length > 0;
        const hasTeam = !!status.data?.current_team;
        if (hasPending && !hasTeam) {
          setStep(2);
        }
        
        // Always load addition requests (invitations TO the user)
        await loadAdditionRequests();
        
        // Load eligible users only if user has a team (for sending invitations)
        if (hasTeam) {
          await loadEligibleUsers();
        }
      } catch {}
    })();
  }, [user]);

  const loadAdditionRequests = async () => {
    try {
      console.log('🔍 Loading addition requests...');
      const status = await apiClient.get('/team-formation/status/');
      const data = status.data as any;
      console.log('🔍 Team formation status response:', data);
      console.log('🔍 Available keys:', Object.keys(data || {}));
      
      if (data?.pending_addition_requests) {
        console.log('🔍 Found pending_addition_requests:', data.pending_addition_requests);
        setAdditionRequests(data.pending_addition_requests);
        setAdditionRequestsCount(data.addition_requests_count || 0);
      } else {
        console.log('🔍 No pending_addition_requests found in response');
        setAdditionRequests([]);
        setAdditionRequestsCount(0);
      }
    } catch (error) {
      console.error('Failed to load addition requests:', error);
      setAdditionRequests([]);
      setAdditionRequestsCount(0);
    }
  };

  const loadEligibleUsers = async () => {
    try {
      setIsLoadingEligibleUsers(true);
      console.log('🔍 Frontend: Starting to load eligible users...');
      
      const response = await apiClient.getEligibleUsersForInvitation();
      console.log('🔍 Frontend: Raw API response:', response);
      
      const data = response.data as any;
      console.log('🔍 Frontend: Response data:', data);
      console.log('🔍 Frontend: Data type:', typeof data);
      console.log('🔍 Frontend: Data keys:', Object.keys(data || {}));
      
      if (data?.eligible_users) {
        console.log('🔍 Frontend: Found eligible_users array with length:', data.eligible_users.length);
        console.log('🔍 Frontend: Eligible users content:', data.eligible_users);
        setEligibleUsers(data.eligible_users);
      } else {
        console.log('🔍 Frontend: No eligible_users found in response');
        console.log('🔍 Frontend: Available data keys:', Object.keys(data || {}));
        setEligibleUsers([]);
      }
    } catch (error) {
      console.error('🔍 Frontend: Error loading eligible users:', error);
      setEligibleUsers([]);
    } finally {
      setIsLoadingEligibleUsers(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedEligibleUser || !selectedEligibleUser.trim()) {
      toast({ title: "Error", description: "Please enter a valid email address" });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedEligibleUser.trim())) {
      toast({ title: "Error", description: "Please enter a valid email address" });
      return;
    }
    
    const emailToInvite = selectedEligibleUser.trim();
    
    // Check if email is already in pending invitations
    if (pendingInvitations.includes(emailToInvite)) {
      toast({ title: "Already Added", description: "This email is already in your invitation list" });
      return;
    }
    
    // Validate that the email exists in our licensed users database
    try {
      setIsInvitingMember(true);
      
      // Check if this email is eligible for invitation
      const eligibleResponse = await apiClient.getEligibleUsersForInvitation();
      const eligibleData = eligibleResponse.data as any;
      
      if (eligibleData?.eligible_users) {
        const isEligible = eligibleData.eligible_users.some((user: any) => 
          user.email.toLowerCase() === emailToInvite.toLowerCase()
        );
        
        if (!isEligible) {
          toast({ 
            title: "Email Not Found", 
            description: "The person you are inviting is outside our database. Only licensed users can be invited." 
          });
          return;
        }
      } else {
        // If we can't get eligible users, show error
        toast({ 
          title: "Validation Error", 
          description: "Unable to validate email. Please try again." 
        });
        return;
      }
      
      // Email is eligible - add to pending invitations
      setPendingInvitations(prev => [...prev, emailToInvite]);
      
      toast({ title: "Member Added", description: `Added ${emailToInvite} to invitation list` });
      setSelectedEligibleUser("");
      setNewMemberMessage("");
      
    } catch (error) {
      console.error('Error validating email:', error);
      toast({ 
        title: "Validation Error", 
        description: "Unable to validate email. Please try again." 
      });
    } finally {
      setIsInvitingMember(false);
    }
  };

  const handleTeamComplete = async () => {
    if (teamChoice === "create" && newTeam.name.trim()) {
      // Create new team
      try {
        setIsLoading(true);
        const response = await apiClient.post('/team-formation/teams/', {
          name: newTeam.name,
          description: newTeam.description,
          is_open_for_requests: newTeam.is_open_for_requests,
          funding_access: newTeam.funding_access,
          technical_expertise: newTeam.technical_expertise,
          looking_for: newTeam.looking_for
        });
        
        if (response.data) {
          toast({
            title: "Team Created!",
            description: `Welcome to ${newTeam.name}! You are now the team leader.`,
          });
          try {
            const teamId = (response as any).data?.id;
            if (teamId) localStorage.setItem('xfactoryTeamId', String(teamId));
            
            // Send all pending invitations after team creation
            if (pendingInvitations.length > 0) {
              console.log(`Sending ${pendingInvitations.length} pending invitations...`);
              console.log('Team ID for invitations:', teamId);
              
              if (!teamId) {
                console.error('No team ID available for sending invitations');
                toast({
                  title: "Team Created, Invitations Pending",
                  description: "Team created successfully, but invitations couldn't be sent. You can send them later from the team dashboard.",
                });
              } else {
                const invitationPromises = pendingInvitations.map(email => 
                  apiClient.createTeamMemberAdditionRequest(teamId, {
                    invited_user_email: email,
                    message: newMemberMessage.trim() || undefined
                  })
                );
                
                try {
                  const results = await Promise.allSettled(invitationPromises);
                  console.log('Invitation results:', results);
                  
                  const successful = results.filter(r => r.status === 'fulfilled').length;
                  const failed = results.filter(r => r.status === 'rejected').length;
                  
                  if (successful > 0) {
                    toast({
                      title: "Invitations Sent!",
                      description: `Sent ${successful} member invitation(s)${failed > 0 ? `, ${failed} failed` : ''}`,
                    });
                  }
                  
                  setPendingInvitations([]); // Clear pending invitations
                } catch (invitationError) {
                  console.error('Error sending invitations:', invitationError);
                  toast({
                    title: "Team Created, Invitations Pending",
                    description: "Team created successfully, but some invitations failed to send. You can send them later.",
                  });
                }
              }
            }
          } catch {}
          // Hydrate full team details for next screen (team code, member counts)
          let hydratedTeam: any = (response as any).data;
          try {
            const status = await apiClient.get('/team-formation/status/');
            const currentTeam = (status as any)?.data?.current_team;
            if (currentTeam?.id) {
              localStorage.setItem('xfactoryTeamId', String(currentTeam.id));
              hydratedTeam = { ...currentTeam };
            }
          } catch {}
          // Note: No direct detail endpoint; rely on status.current_team for hydrated fields
 
          const finalData = {
            ...accountData,
            teamChoice: "create",
            teamData: hydratedTeam
          };
          onComplete(finalData);
        } else {
          setError("Failed to create team");
        }
      } catch (error: any) {
        console.error('Error creating team:', error);
        setError(error.error || "Failed to create team");
      } finally {
        setIsLoading(false);
      }
    } else if (teamChoice === "join" && selectedTeam) {
      // Send join request
      try {
        setIsLoading(true);
        const response = await apiClient.post('/team-formation/requests/create/', {
          team: selectedTeam,
          message: joinRequest.message,
          preferred_archetype: joinRequest.preferred_archetype
        });
        
        if (response.data) {
          toast({
            title: "Join Request Sent!",
            description: "Your request has been sent to the team leader.",
          });
          
          const finalData = {
            ...accountData,
            teamChoice: "join",
            joinRequestData: response.data
          };
          onComplete(finalData);
        } else {
          setError("Failed to send join request");
        }
      } catch (error: any) {
        console.error('Error sending join request:', error);
        setError(error.error || "Failed to send join request");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Skip team formation for now
      const finalData = {
        ...accountData,
        teamChoice: null
      };
      onComplete(finalData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header for step 2 */}
      {step === 2 && (
        <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50 w-full">
          <div className="w-full px-6 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Team Formation</h1>
                  <p className="text-sm text-white/80">Build your dream team</p>
                </div>
              </div>
              
              {/* Centered step indicators */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                <Badge variant={step >= 1 ? "default" : "secondary"}>1</Badge>
                <div className="w-8 h-0.5 bg-border"></div>
                <Badge variant={step >= 2 ? "default" : "secondary"}>2</Badge>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Logo - bigger and positioned on the right */}
                <img 
                  src="/logos/prov_logo_white.png" 
                  alt="Ivy Factory Logo" 
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to Factory icon if logo fails to load
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.style.display = 'none';
                    const parent = imgElement.parentElement;
                    if (parent) {
                      const fallbackIcon = document.createElement('div');
                      fallbackIcon.innerHTML = '<svg class="h-12 w-12 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>';
                      parent.appendChild(fallbackIcon);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="max-w-2xl mx-auto p-6">
        {/* Header for step 1 only */}
        {step === 1 && (
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant={step >= 1 ? "default" : "secondary"}>1</Badge>
              <div className="w-8 h-0.5 bg-border"></div>
              <Badge variant={step >= 2 ? "default" : "secondary"}>2</Badge>
            </div>
          </div>
        )}

        {/* Step 1: Account Creation */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription className="text-lg">
                Join the Ivy Factory community and start building your startup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-500">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={accountData.email}
                      onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="studentId">Student ID</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter your student ID"
                      className="pl-10"
                      value={accountData.studentId}
                      onChange={(e) => setAccountData(prev => ({ ...prev, studentId: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={accountData.password}
                      onChange={(e) => setAccountData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
              <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Enter your phone number"
                    className="pl-10"
                      value={accountData.phoneNumber}
                      onChange={(e) => setAccountData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="courseProfessor">Course/Professor</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="courseProfessor"
                    type="text"
                    placeholder="e.g., CS 101 - Dr. Smith"
                    className="pl-10"
                    value={accountData.courseProfessor}
                    onChange={(e) => setAccountData(prev => ({ ...prev, courseProfessor: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="major">Major</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="major"
                    type="text"
                    placeholder="e.g., Computer Science, Business, Engineering..."
                    className="pl-10"
                    value={accountData.major}
                    onChange={(e) => setAccountData(prev => ({ ...prev, major: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="school">College</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="school"
                    type="text"
                    placeholder="e.g., College of Business, College of Engineering..."
                    className="pl-10"
                    value={(accountData as any).school || ''}
                    onChange={(e) => setAccountData((prev: any) => ({ ...prev, school: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleAccountSubmit}
                disabled={!accountData.email || !accountData.password || !accountData.studentId || !accountData.courseProfessor || !accountData.major || !accountData.phoneNumber || isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Continue to Team Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Team Formation */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Team Formation</CardTitle>
              <CardDescription className="text-lg">
                Great startups are built by great teams. Let's get you connected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={teamChoice || ""} onValueChange={(value) => setTeamChoice(value as "create" | "join")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create" className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Create Team
                  </TabsTrigger>
                  <TabsTrigger value="join" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Join Team
                    {additionRequestsCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {additionRequestsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4">
                  <div>
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      placeholder="Enter your team name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="teamDescription">Team Description</Label>
                    <Textarea
                      id="teamDescription"
                      placeholder="Describe your team's mission and vision"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label htmlFor="fundingAccess">Funding Access</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          toast({
                            title: "What is Funding? 💰",
                            description: "Funding is money to start your business. It can come from your own savings, investors (people who give money for a share of your company), government programs, or crowdfunding (many people giving small amounts).",
                            duration: 8000,
                          });
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select onValueChange={(value) => setNewTeam(prev => ({ ...prev, funding_access: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your funding situation" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundingOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="technicalExpertise">Technical Expertise</Label>
                    <Select onValueChange={(value) => setNewTeam(prev => ({ ...prev, technical_expertise: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your technical level" />
                      </SelectTrigger>
                      <SelectContent>
                        {techLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Looking For Section */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">Looking For</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            toast({
                              title: "Looking For Section",
                              description: "This section helps you specify what roles and skills you need for your team. It helps other users understand what you're looking for when they request to join your team.",
                            });
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTeam(prev => ({ 
                          ...prev, 
                          looking_for: [...prev.looking_for, {
                            keywords: "",
                            job_role: "",
                            job_description: "",
                            key_skills: ""
                          }]
                        }))}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Position
                      </Button>
                    </div>
                    
                    {newTeam.looking_for.map((position, index) => (
                      <div key={index} className="border rounded-lg p-4 mb-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-medium">Position {index + 1}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewTeam(prev => ({ 
                              ...prev, 
                              looking_for: prev.looking_for.filter((_, i) => i !== index)
                            }))}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`jobRole-${index}`}>Job Role</Label>
                            <Input
                              id={`jobRole-${index}`}
                              placeholder="e.g., Frontend Developer, Product Manager"
                              value={position.job_role}
                              onChange={(e) => setNewTeam(prev => ({
                                ...prev,
                                looking_for: prev.looking_for.map((p, i) => 
                                  i === index ? { ...p, job_role: e.target.value } : p
                                )
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`keywords-${index}`}>Keywords</Label>
                            <div className="relative">
                              <div className="flex flex-wrap gap-1 p-2 min-h-[40px] border border-input bg-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                {position.keywords && position.keywords.split(',').map((keyword: string, keyIndex: number) => {
                                  const trimmedKeyword = keyword.trim();
                                  if (!trimmedKeyword) return null;
                                  return (
                                    <Badge key={keyIndex} variant="secondary" className="text-xs">
                                      {trimmedKeyword}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const keywordsArray = position.keywords.split(',');
                                          keywordsArray.splice(keyIndex, 1);
                                          const newKeywords = keywordsArray.join(',');
                                          setNewTeam(prev => ({
                                            ...prev,
                                            looking_for: prev.looking_for.map((p, i) => 
                                              i === index ? { ...p, keywords: newKeywords } : p
                                            )
                                          }));
                                        }}
                                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  );
                                })}
                                <input
                                  id={`keywords-${index}`}
                                  type="text"
                                  placeholder={position.keywords ? "" : "e.g., React, Python, Marketing"}
                                  value={currentKeywordInputs[index] || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setCurrentKeywordInputs(prev => ({
                                      ...prev,
                                      [index]: value
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      const value = e.currentTarget.value.trim();
                                      if (value) {
                                        const newKeywords = position.keywords ? `${position.keywords},${value}` : value;
                                        setNewTeam(prev => ({
                                          ...prev,
                                          looking_for: prev.looking_for.map((p, i) => 
                                            i === index ? { ...p, keywords: newKeywords } : p
                                          )
                                        }));
                                        setCurrentKeywordInputs(prev => ({
                                          ...prev,
                                          [index]: ''
                                        }));
                                      }
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const pastedText = e.clipboardData.getData('text');
                                    const keywords = pastedText.split(',').map(k => k.trim()).filter(k => k);
                                    
                                    if (keywords.length > 0) {
                                      const existingKeywords = position.keywords ? position.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
                                      const allKeywords = [...existingKeywords, ...keywords];
                                      const uniqueKeywords = [...new Set(allKeywords)]; // Remove duplicates
                                      
                                      setNewTeam(prev => ({
                                        ...prev,
                                        looking_for: prev.looking_for.map((p, i) => 
                                          i === index ? { ...p, keywords: uniqueKeywords.join(',') } : p
                                        )
                                      }));
                                      setCurrentKeywordInputs(prev => ({
                                        ...prev,
                                        [index]: ''
                                      }));
                                    }
                                  }}
                                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <Label htmlFor={`jobDescription-${index}`}>Job Description</Label>
                          <Textarea
                            id={`jobDescription-${index}`}
                            placeholder="Describe the role and responsibilities..."
                            value={position.job_description}
                            onChange={(e) => setNewTeam(prev => ({
                              ...prev,
                              looking_for: prev.looking_for.map((p, i) => 
                                i === index ? { ...p, job_description: e.target.value } : p
                              )
                            }))}
                            rows={3}
                          />
                        </div>
                        
                        <div className="mt-3">
                          <Label htmlFor={`keySkills-${index}`}>Key Skills</Label>
                          <Textarea
                            id={`keySkills-${index}`}
                            placeholder="List the key skills and requirements..."
                            value={position.key_skills}
                            onChange={(e) => setNewTeam(prev => ({
                              ...prev,
                              looking_for: prev.looking_for.map((p, i) => 
                                i === index ? { ...p, key_skills: e.target.value } : p
                              )
                            }))}
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {newTeam.looking_for.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No positions added yet</p>
                        <p className="text-sm">Click "Add Position" to start building your team</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Add Members Section */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">Add Members</Label>
                        <div className="group relative">
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Recommended team size: 3-4 members
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddMembers(!showAddMembers)}
                      >
                        {showAddMembers ? "Hide" : "Show"}
                        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAddMembers ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                    
                    {showAddMembers && (
                      <div className="space-y-3 animate-fade-in">
                        <div>
                          <Label htmlFor="memberEmail">Email Address to Invite</Label>
                          <Input
                            id="memberEmail"
                            type="email"
                            placeholder="Enter email address..."
                            value={selectedEligibleUser}
                            onChange={(e) => setSelectedEligibleUser(e.target.value)}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter the email address of the licensed user you want to invite
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="memberMessage">Message (Optional)</Label>
                          <Textarea
                            id="memberMessage"
                            placeholder="Personal message for the invitation..."
                            value={newMemberMessage}
                            onChange={(e) => setNewMemberMessage(e.target.value)}
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={handleInviteMember}
                          disabled={!selectedEligibleUser?.trim() || isInvitingMember}
                          size="sm"
                          className="w-full"
                        >
                          {isInvitingMember ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating Email...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add to Invitation List
                            </>
                          )}
                        </Button>
                        
                        {/* Display Pending Invitations */}
                        {pendingInvitations.length > 0 && (
                          <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                            <Label className="text-sm font-medium mb-2">Pending Invitations ({pendingInvitations.length})</Label>
                            <div className="space-y-2">
                              {pendingInvitations.map((email, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                                  <span className="text-sm">{email}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPendingInvitations(prev => prev.filter((_, i) => i !== index))}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Debug Button */}
                        <Button
                          onClick={async () => {
                            try {
                              console.log('🔍 Testing debug endpoints...');
                              
                              // Test debug-all-users endpoint
                              const allUsersResponse = await apiClient.debugAllUsers();
                              console.log('📊 Debug All Users Response:', allUsersResponse.data);
                              
                              // Test debug-allowed-users endpoint
                              const allowedUsersResponse = await apiClient.debugAllowedUsers();
                              console.log('📋 Debug Allowed Users Response:', allowedUsersResponse.data);
                              
                              // Test eligible-users endpoint
                              const eligibleUsersResponse = await apiClient.getEligibleUsersForInvitation();
                              console.log('✅ Eligible Users Response:', eligibleUsersResponse.data);
                              
                            } catch (error) {
                              console.error('❌ Debug test failed:', error);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                        >
                          🔍 Debug Endpoints
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="join" className="space-y-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="teamCode">Have a team code?</Label>
                      <Input
                        id="teamCode"
                        placeholder="Enter 6-character code (e.g., A1B2C3)"
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const code = teamCode.trim().toUpperCase();
                        if (code.length !== 6) {
                          toast({ title: "Invalid code", description: "Please enter a 6-character team code." });
                          return;
                        }
                        try {
                          setIsFindingByCode(true);
                          const res = await apiClient.findTeamByCode(code);
                          if (res.data) {
                            const team = res.data as any;
                            setAvailableTeams([team]);
                            setSelectedTeam(team.id);
                            toast({ title: "Team found", description: `${team.name}` });
                          } else if (res.error) {
                            toast({ title: "Not found", description: res.error });
                          }
                        } catch (err: any) {
                          toast({ title: "Lookup failed", description: err?.error || "Unable to find team" });
                        } finally {
                          setIsFindingByCode(false);
                        }
                      }}
                      disabled={isFindingByCode || !teamCode.trim()}
                    >
                      {isFindingByCode ? "Searching..." : "Find by Code"}
                    </Button>
                    {availableTeams.length === 1 && (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          setTeamCode("");
                          await loadAvailableTeams();
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  {/* Debug info */}
                  {additionRequests.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-800 mb-2">Debug: Addition Requests Found</h4>
                      <div className="text-sm text-blue-700">
                        <p>Total requests: {additionRequests.length}</p>
                        <p>Requests: {JSON.stringify(additionRequests.map(req => ({ id: req.id, team: req.team, team_id_type: typeof req.team })))}</p>
                        <p>Available teams: {JSON.stringify(availableTeams.map(team => ({ id: team.id, id_type: typeof team.id })))}</p>
                      </div>
                    </div>
                  )}
                  
                  {availableTeams.length > 0 ? (
                    <div className="grid gap-4">
                      {/* Teams with pending addition requests - shown first with green background */}
                      {availableTeams
                        .filter(team => additionRequests.some(req => String(req.team) === String(team.id)))
                        .map((team) => {
                          const pendingRequest = additionRequests.find(req => String(req.team) === String(team.id));
                          return (
                            <div
                              key={team.id}
                              className="p-4 border-2 border-green-200 bg-green-50 rounded-lg transition-all hover:shadow-md"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-green-800">{team.name}</h3>
                                  <Badge variant="default" className="bg-green-600 text-white">
                                    Invitation Pending
                                  </Badge>
                                </div>
                                <Badge variant="secondary">{team.current_member_count} members</Badge>
                              </div>
                              <p className="text-sm text-green-700 mb-3">{team.description || "No description provided"}</p>
                              
                              {team.needed_archetypes && team.needed_archetypes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {team.needed_archetypes.map((archetype: string) => (
                                    <Badge key={archetype} variant="outline" className="text-xs border-green-300 text-green-700">
                                      {archetype}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="text-xs text-green-600 mb-3">
                                <div className="font-medium">Led by: {team.created_by_name}</div>
                                {team.needed_archetypes && team.needed_archetypes.length > 0 && (
                                  <div>Looking for: {team.needed_archetypes.join(", ")}</div>
                                )}
                                {pendingRequest?.message && (
                                  <div className="mt-2 p-2 bg-white/50 rounded border border-green-200">
                                    <span className="font-medium">Message:</span> "{pendingRequest.message}"
                                  </div>
                                )}
                              </div>

                              {/* Accept/Reject buttons */}
                              <div className="flex gap-2 pt-2 border-t border-green-200">
                                <Button
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await apiClient.respondToAdditionRequest(pendingRequest!.id, {
                                        action: 'accept'
                                      });
                                      toast({
                                        title: "Invitation Accepted!",
                                        description: `You've joined ${team.name}`,
                                      });
                                      // Complete the flow and redirect to MemberAdditionScreen
                                      onComplete({
                                        teamId: team.id,
                                        teamName: team.name,
                                        action: 'accepted_invitation'
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Failed to accept",
                                        description: error?.error || "Please try again",
                                      });
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await apiClient.respondToAdditionRequest(pendingRequest!.id, {
                                        action: 'reject'
                                      });
                                      toast({
                                        title: "Invitation Rejected",
                                        description: "The invitation has been declined",
                                      });
                                      // Refresh addition requests
                                      await loadAdditionRequests();
                                    } catch (error: any) {
                                      toast({
                                        title: "Failed to reject",
                                        description: error?.error || "Please try again",
                                      });
                                    }
                                  }}
                                  className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                      {/* Regular available teams - shown below */}
                      {availableTeams
                        .filter(team => !additionRequests.some(req => String(req.team) === String(team.id)))
                        .map((team) => (
                        <div
                          key={team.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedTeam === team.id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => setSelectedTeam(team.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{team.name}</h3>
                            <Badge variant="secondary">{team.current_member_count} members</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{team.description || "No description provided"}</p>
                          
                          {team.needed_archetypes && team.needed_archetypes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {team.needed_archetypes.map((archetype: string) => (
                                <Badge key={archetype} variant="outline" className="text-xs">
                                  {archetype}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Looking For Section */}
                          {team.looking_for && team.looking_for.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Looking For:</div>
                              <div className="space-y-2">
                                {team.looking_for.map((role: any, index: number) => (
                                  <div key={index} className="p-2 bg-muted/20 rounded border-l-2 border-primary/20">
                                    {role.keywords && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {role.keywords.split(',').map((keyword: string, keyIndex: number) => {
                                          const trimmedKeyword = keyword.trim();
                                          if (!trimmedKeyword) return null;
                                          return (
                                            <Badge key={keyIndex} variant="secondary" className="text-xs">
                                              {trimmedKeyword}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <div className="font-medium text-sm">{role.job_role || "Team Member"}</div>
                                    {role.job_description && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {role.job_description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            <div className="font-medium">Led by: {team.created_by_name}</div>
                            {team.needed_archetypes && team.needed_archetypes.length > 0 && (
                              <div>Archetypes needed: {team.needed_archetypes.join(", ")}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">No teams available</h3>
                      <p className="text-muted-foreground">Be the first to create a team!</p>
                    </div>
                  )}
                  
                  {selectedTeam && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label htmlFor="joinMessage">Message to Team (Optional)</Label>
                        <Textarea
                          id="joinMessage"
                          placeholder="Tell the team why you'd like to join..."
                          value={joinRequest.message}
                          onChange={(e) => setJoinRequest(prev => ({ ...prev, message: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="preferredArchetype">Preferred Role</Label>
                        <Select 
                          value={joinRequest.preferred_archetype} 
                          onValueChange={(value) => setJoinRequest(prev => ({ ...prev, preferred_archetype: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your preferred role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Strategist">Strategist (The Dreamer & Strategist)</SelectItem>
                            <SelectItem value="Builder">Builder (The Technical Architect)</SelectItem>
                            <SelectItem value="Seller">Seller (The Sales & Growth Operator)</SelectItem>
                            <SelectItem value="Designer">Designer (The User Experience Guardian)</SelectItem>
                            <SelectItem value="Operator">Operator (The Execution Backbone)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  

                </TabsContent>
              </Tabs>

              <div className="flex gap-3">
                <Button 
                  onClick={handleTeamComplete}
                  disabled={
                    isLoading || 
                    !teamChoice || 
                    (teamChoice === "create" && !newTeam.name.trim()) || 
                    (teamChoice === "join" && !selectedTeam)
                  }
                  size="lg"
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {teamChoice === "create" ? "Creating..." : "Joining..."}
                    </>
                  ) : (
                    <>
                      {teamChoice === "create" ? "Create Team" : teamChoice === "join" ? "Send Request" : "Complete Setup"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};