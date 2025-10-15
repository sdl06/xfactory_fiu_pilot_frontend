import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Factory, Cog, Users, Target, FileText, UserCheck, Code, Rocket, Scale, TrendingUp, DollarSign, Lock, CheckCircle, ArrowRight, Zap, AlertTriangle, Settings, Star, BarChart3, Home, Image, UserPlus, Loader2 } from "lucide-react";
import { ProductionLineFlow } from "./ProductionLineFlow";
import { FactorAI } from "./FactorAI";
import { BusinessType } from "./OnboardingFlow";
import { Separator } from "@/components/ui/separator";
import { lsGetScoped, scopedKey } from "@/lib/teamScope";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
interface FactoryDashboardProps {
  userData: {
    hasIdea: boolean;
    businessType: BusinessType | null;
    ideaSummary: string;
  };
  stationData: {
    currentStation: number;
    ideaCard?: any;
    mockups?: any;
    validationData?: any;
    completedStations: number[];
  };
  onEnterStation: (stationId: number, reviewMode?: boolean) => void;
  onGoHome: () => void;
  onEnterCommunity: () => void;
  onEnterTeamFormation?: () => void;
}
interface FactoryDepartment {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "unlocked" | "locked";
  accessLevel: "always" | "after-step";
  unlockStep?: number;
}
export const FactoryDashboard = ({
  userData,
  stationData,
  onEnterStation,
  onGoHome,
  onEnterCommunity,
  onEnterTeamFormation
}: FactoryDashboardProps) => {
  const [showDepartments, setShowDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [conceptTitle, setConceptTitle] = useState<string>("");
  const [showMembers, setShowMembers] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any|null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberMessage, setNewMemberMessage] = useState("");
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any|null>(null);
  const [selectedEligibleUser, setSelectedEligibleUser] = useState<string>("");
  const [isLoadingEligibleUsers, setIsLoadingEligibleUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoadingPendingInvitations, setIsLoadingPendingInvitations] = useState(false);
  const [userArchetype, setUserArchetype] = useState<string>("");
  const [isUpdatingArchetype, setIsUpdatingArchetype] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const { apiClient } = await import("@/lib/api");
      const status = await apiClient.get('/team-formation/status/');
      const team = status.data?.current_team;
      if (team?.id) {
        setTeamInfo(team);
        const res = await apiClient.get(`/team-formation/teams/${team.id}/members/`);
        setMembers(Array.isArray(res.data) ? res.data : []);
        
        // Also load pending invitations
        await loadPendingInvitations(team.id);
      } else {
        setMembers([]);
        setPendingInvitations([]);
      }
    } catch {
      setMembers([]);
      setPendingInvitations([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadPendingInvitations = async (teamId: number) => {
    try {
      setIsLoadingPendingInvitations(true);
      const { apiClient } = await import("@/lib/api");
      const response = await apiClient.getTeamMemberAdditionRequests(teamId);
      setPendingInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load pending invitations:', error);
      setPendingInvitations([]);
    } finally {
      setIsLoadingPendingInvitations(false);
    }
  };

  const loadEligibleUsers = async () => {
    try {
      setIsLoadingEligibleUsers(true);
      console.log('Loading eligible users...');
      
      const { apiClient } = await import("@/lib/api");
      const response = await apiClient.getEligibleUsersForInvitation();
      console.log('Eligible users response:', response);
      
      const data = response.data as any;
      console.log('Eligible users data:', data);
      
      if (data?.eligible_users) {
        console.log('Setting eligible users:', data.eligible_users);
        setEligibleUsers(data.eligible_users);
      } else {
        console.log('No eligible_users in response, setting empty array');
        setEligibleUsers([]);
      }
    } catch (error: any) {
      console.error('Failed to load eligible users:', error);
      
      // More detailed error logging
      console.error('Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        fullError: error
      });
      
      setEligibleUsers([]);
      
      // Show user-friendly error message
      if (error?.response?.data?.error) {
        alert(`Failed to load users: ${error.response.data.error}`);
      } else {
        alert('Failed to load eligible users. Please try again.');
      }
    } finally {
      setIsLoadingEligibleUsers(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedEligibleUser) {
      alert("Please select a user to invite");
      return;
    }
    
    try {
      setIsInvitingMember(true);
      console.log('Starting member invitation process...');
      
      const { apiClient } = await import("@/lib/api");
      
      // Get team status
      console.log('Getting team status...');
      const status = await apiClient.get('/team-formation/status/');
      console.log('Team status response:', status);
      
      const teamId = status.data?.current_team?.id;
      if (!teamId) {
        alert("No team found. Please create or join a team first.");
        return;
      }
      
      console.log('Team ID found:', teamId);
      
      // Find the selected user's email
      const selectedUser = eligibleUsers.find(u => u.id.toString() === selectedEligibleUser);
      if (!selectedUser) {
        alert("Selected user not found. Please refresh the list and try again.");
        return;
      }
      
      console.log('Selected user:', selectedUser);
      
      // Check if this is a licensed email (not yet registered)
      if (selectedUser.id.startsWith('licensed_')) {
        console.log('Inviting licensed email:', selectedUser.email);
      }
      
      // Create the invitation
      console.log('Creating team member addition request...');
      const invitationData = {
        invited_user_email: selectedUser.email,
        message: newMemberMessage.trim() || undefined
      };
      console.log('Invitation data:', invitationData);
      
      const response = await apiClient.createTeamMemberAdditionRequest(teamId, invitationData);
      console.log('Invitation response:', response);
      
      alert(`Invitation sent to ${selectedUser.email}`);
      setSelectedEligibleUser("");
      setNewMemberMessage("");
      setShowAddMember(false);
      
      // Refresh eligible users
      console.log('Refreshing eligible users...');
      await loadEligibleUsers();
      
    } catch (error: any) {
      console.error('Error inviting member:', error);
      
      // More detailed error handling
      let errorMessage = "Failed to send invitation";
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('Error details:', {
        message: errorMessage,
        status: error?.response?.status,
        data: error?.response?.data,
        fullError: error
      });
      
      alert(`Failed to send invitation: ${errorMessage}`);
    } finally {
      setIsInvitingMember(false);
    }
  };

  useEffect(() => {
    const t = lsGetScoped('xfactoryConceptTitle');
      if (t) setConceptTitle(t);
  }, []);

  useEffect(() => {
    // Load user archetype
    if (user?.preferred_archetype) {
      setUserArchetype(user.preferred_archetype);
    }
  }, [user]);

  // Fetch business name (concept title) from backend for cross-browser consistency
  useEffect(() => {
    (async () => {
      try {
        const { apiClient } = await import("@/lib/api");
        let teamIdStr = localStorage.getItem('xfactoryTeamId');
        if (!teamIdStr) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const tid = (status as any)?.data?.current_team?.id;
            if (tid) teamIdStr = String(tid);
          } catch {}
        }
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;
        // Prefer concept card title
        try {
          const res = await apiClient.getTeamConceptCard(teamId);
          if (res?.status >= 200 && res.status < 300 && res.data) {
            const title = (res.data as any)?.title;
            if (typeof title === 'string' && title.trim()) {
              setConceptTitle(title);
              try { localStorage.setItem(scopedKey('xfactoryConceptTitle'), title); } catch {}
              return;
            }
          }
        } catch {}
        // Fallback: derive from PST (problem/solution) or output_name
        try {
          const pst = await apiClient.getTeamProblemSolution(teamId);
          const d: any = (pst as any)?.data || {};
          const fallback = (typeof d.output_name === 'string' && d.output_name.trim())
            ? d.output_name
            : String(d.problem || d.input_problem || '').split(' ').slice(0, 6).join(' ') || 'Concept';
          if (fallback) {
            setConceptTitle(fallback);
            try { localStorage.setItem(scopedKey('xfactoryConceptTitle'), fallback); } catch {}
          }
        } catch {}
      } catch {}
    })();
  }, []);

  const updateUserArchetype = async (newArchetype: string) => {
    try {
      setIsUpdatingArchetype(true);
      
      // Update user's preferred archetype
      await apiClient.put('/auth/user/', {
        preferred_archetype: newArchetype
      });
      
      setUserArchetype(newArchetype);
      
      toast({
        title: "Archetype Updated!",
        description: `Your archetype has been updated to ${newArchetype}`,
      });
    } catch (error: any) {
      console.error('Error updating archetype:', error);
      toast({
        title: "Error",
        description: error?.error || "Failed to update archetype. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingArchetype(false);
    }
  };

  // Calculate progress
  const completedCount = stationData.completedStations.length;
  const totalSteps = 15; // Total number of stations
  const progressPercentage = completedCount / totalSteps * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ivy Factory Dashboard</h1>
              <p className="text-sm text-muted-foreground">Your startup journey</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="secondary" onClick={() => { 
              if (onEnterTeamFormation) {
                onEnterTeamFormation();
              }
            }}>
              <Users className="h-4 w-4 mr-2" />
              Members
            </Button>
            
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
            
            {/* Account Settings Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Account Settings</DialogTitle>
                  <DialogDescription>
                    Update your profile information and preferences.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="archetype">Preferred Archetype</Label>
                    <Select value={userArchetype} onValueChange={updateUserArchetype} disabled={isUpdatingArchetype}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your archetype" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Strategist">Strategist (The Dreamer & Strategist)</SelectItem>
                        <SelectItem value="Builder">Builder (The Technical Architect)</SelectItem>
                        <SelectItem value="Seller">Seller (The Sales & Growth Operator)</SelectItem>
                        <SelectItem value="Designer">Designer (The User Experience Guardian)</SelectItem>
                        <SelectItem value="Operator">Operator (The Execution Backbone)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your archetype helps teams understand your role and skills.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Members Dialog */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Team Members</DialogTitle>
            </DialogHeader>
            {membersLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-2">
                    {members.map((m, idx) => (
                      <button key={m.id || idx} onClick={() => setSelectedMember(m)} className={`w-full text-left p-2 rounded border ${selectedMember?.id === m.id ? 'border-primary' : 'border-border'} hover:bg-muted/50`}>
                        <div className="font-medium">{m.user_full_name || m.full_name || `${m.user_name || ''} ${m.user_last_name || ''}`.trim() || m.name || m.username || m.user_email || m.email}</div>
                        <div className="text-xs text-muted-foreground">{m.role || m.assigned_archetype || m.user_preferred_archetype || 'Member'}</div>
                      </button>
                    ))}
                    {members.length === 0 && (
                      <div className="text-sm text-muted-foreground">No members found.</div>
                    )}
                    
                    {/* Pending Invitations Section */}
                    {pendingInvitations.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Pending Invitations ({pendingInvitations.length})
                        </div>
                        <div className="space-y-2">
                          {pendingInvitations.map((invitation, idx) => (
                            <div 
                              key={invitation.id || idx} 
                              className="w-full p-2 rounded border bg-green-50 border-green-200"
                            >
                              <div className="font-medium text-green-800">
                                {invitation.invited_user_email}
                              </div>
                              <div className="text-xs text-green-600">
                                Request Sent
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add Member Button */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!showAddMember) {
                            await loadEligibleUsers();
                          }
                          setShowAddMember(!showAddMember);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                      
                                              {showAddMember && (
                          <div className="mt-4 space-y-3 p-3 bg-muted/20 rounded-lg">
                            <div>
                              <Label htmlFor="memberSelect" className="text-sm">Select User to Invite</Label>
                              {isLoadingEligibleUsers ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Loading eligible users...
                                </div>
                              ) : eligibleUsers.length === 0 ? (
                                <div className="text-center p-2 text-sm text-muted-foreground">
                                  No eligible users found
                                </div>
                              ) : (
                                <Select 
                                  value={selectedEligibleUser} 
                                  onValueChange={setSelectedEligibleUser}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Choose a user to invite..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {eligibleUsers.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{user.email}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name provided'}
                                            {user.user_type && ` • ${user.user_type}`}
                                            {!user.is_registered && ' • Not registered yet'}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="memberMessage" className="text-sm">Message (Optional)</Label>
                              <Textarea
                                id="memberMessage"
                                placeholder="Personal message for the invitation..."
                                value={newMemberMessage}
                                onChange={(e) => setNewMemberMessage(e.target.value)}
                                rows={2}
                                className="mt-1"
                              />
                        </div>
                        <Button
                          onClick={handleInviteMember}
                          disabled={!selectedEligibleUser || isInvitingMember}
                          size="sm"
                          className="w-full"
                        >
                          {isInvitingMember ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Invitation...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                <div>
                  {/* Looking For Section */}
                  {teamInfo?.looking_for && Array.isArray(teamInfo.looking_for) && teamInfo.looking_for.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Looking For</h4>
                      <div className="space-y-2">
                        {teamInfo.looking_for.map((role: any, index: number) => (
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
                            <div className="font-medium text-sm">{role.job_role || 'Team Member'}</div>
                            {role.job_description && (
                              <div className="text-xs text-muted-foreground mt-1">{role.job_description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedMember ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Name</div>
                        <div className="font-medium">{selectedMember.user_full_name || `${selectedMember.user_name || ''} ${selectedMember.user_last_name || ''}`.trim() || selectedMember.full_name || selectedMember.name || selectedMember.username || selectedMember.user_email || selectedMember.email}</div>
                      </div>
                      <Separator />
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium">{selectedMember.user_email || selectedMember.email || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Archetype</div>
                        <div className="font-medium">{selectedMember.assigned_archetype || selectedMember.user_preferred_archetype || selectedMember.preferred_archetype || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Skills</div>
                        <div className="font-medium text-sm">{selectedMember.user_skills || (Array.isArray(selectedMember.skills) ? selectedMember.skills.join(', ') : selectedMember.skills) || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Availability</div>
                        <div className="font-medium text-sm">{selectedMember.user_availability || selectedMember.availability || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">About</div>
                        <div className="font-medium text-sm whitespace-pre-wrap">{selectedMember.bio || selectedMember.about || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Select a member to view details</div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Factory Overview */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-4">
            <Card className="bg-gradient-primary text-primary-foreground shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Cog className="h-8 w-8" />
                  {conceptTitle || (userData?.ideaSummary ? `${userData.ideaSummary.slice(0, 50)}...` : 'xFactory Dashboard')}
                </CardTitle>
                <div className="space-y-3">
                  <Progress value={progressPercentage} className="h-3" />
                  <p className="text-primary-foreground/80">
                    Main Production Line Active
                  </p>
                  <div className="text-xs opacity-80">
                    Team: {(() => { try { return localStorage.getItem('xfactoryTeamName') || '—'; } catch { return '—'; } })()}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* The Departments */}
        <div className="p-6 bg-gradient-conveyor/20 rounded-lg border border-border mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-accent" />
            The Departments
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Button variant="success" size="sm" className="h-auto p-4 flex-col gap-2" onClick={onEnterCommunity}>
              <Users className="h-5 w-5" />
              <span>Factory Community</span>
            </Button>
            <Button variant="machinery" size="sm" className="h-auto p-4 flex-col gap-2" style={{ animation: 'none' }} asChild>
              <a href="mailto:trinity@ivyfactory.com,adelaide@ivyfactory.com?subject=Support Request">
                <Cog className="h-5 w-5" />
                <span>Support Crew</span>
              </a>
            </Button>
            <Button variant="warning" size="sm" className="h-auto p-4 flex-col gap-2" onClick={() => onEnterStation(4)}>
              <TrendingUp className="h-5 w-5" />
              <span>Investor Hub</span>
            </Button>

            <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2">
              <Scale className="h-5 w-5" />
              <span>Leadership Board</span>
            </Button>
          </div>
        </div>

        {/* Production Line Journey Flow */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-foreground">
              Production Line Journey
            </h2>
            <Badge variant="success" className="text-lg px-4 py-2">
              {completedCount}/{totalSteps} Stations Complete
            </Badge>
          </div>
          {/* Make roadmap section same max width as Departments by inheriting container width */}
          <ProductionLineFlow 
            completedStations={stationData.completedStations}
            currentStation={stationData.currentStation}
            onEnterStation={onEnterStation}
            stationData={stationData}
          />
        </div>

        {/* FactorAI Assistant */}
        <div>
          <FactorAI currentStation={stationData.currentStation} stationData={stationData} userData={userData} context="factory-dashboard" />
        </div>
      </div>
    </div>
  );
};
