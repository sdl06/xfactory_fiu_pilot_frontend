import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Copy, Clock, CheckCircle, XCircle, User, Mail, MessageSquare, UserPlus, Loader2, Plus, Trash2, Settings, Factory, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface MemberAdditionScreenProps {
  teamData: any;
  onComplete: () => void;
  onBack: () => void;
  fromDashboard?: boolean; // New prop to track if user came from dashboard
}

interface JoinRequest {
  id: number;
  user_name: string;
  user_email: string;
  user_skills: string;
  preferred_archetype: string;
  message: string;
  status: string;
  created_at: string;
}

export const MemberAdditionScreen = ({ teamData, onComplete, onBack, fromDashboard = false }: MemberAdditionScreenProps) => {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [pendingAdditionRequests, setPendingAdditionRequests] = useState<any[]>([]);
  const [isLoadingAdditionRequests, setIsLoadingAdditionRequests] = useState(false);
  const [lookingFor, setLookingFor] = useState<any[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ job_role: '', keywords: '', job_description: '' });
  const [isUpdatingLookingFor, setIsUpdatingLookingFor] = useState(false);
  const [userArchetype, setUserArchetype] = useState<string>("");
  const [isUpdatingArchetype, setIsUpdatingArchetype] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Mock deadline - in real implementation, this would come from backend
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // 7 days from now

  useEffect(() => {
    // Load user archetype
    if (user?.preferred_archetype) {
      setUserArchetype(user.preferred_archetype);
    }

    // Only load when we have a valid team id
    const tid = teamData?.id || Number(localStorage.getItem('xfactoryTeamId')) || null;
    if (tid) {
      // Ensure we have the freshest team info (team_code, counts) from status
      (async () => {
        try {
          const status = await apiClient.request('/team-formation/status/');
          const currentTeam = (status as any)?.data?.current_team;
          if (currentTeam?.id === tid) {
            Object.assign(teamData, currentTeam);
            // Initialize looking_for state
            setLookingFor(Array.isArray(currentTeam.looking_for) ? currentTeam.looking_for : []);
          }
        } catch {}
      })();
      loadJoinRequests();
      loadMembers();
    }
    
    // Update countdown timer
    const timer = setInterval(() => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Deadline passed");
        onComplete(); // Auto-proceed to idea generation
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [user]);

  const loadJoinRequests = async () => {
    try {
      const response = await apiClient.request('/team-formation/requests/');
      if (response.data) {
        // Filter requests for this team
        const teamRequests = response.data.filter((req: any) => req.team === teamData.id);
        setJoinRequests(teamRequests);
      }
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const loadMembers = async () => {
    try {
      // Resolve team id before requesting
      let resolvedTeamId = teamData?.id as number | undefined;
      if (!resolvedTeamId) {
        const status = await apiClient.request('/team-formation/status/');
        resolvedTeamId = status.data?.current_team?.id || Number(localStorage.getItem('xfactoryTeamId')) || undefined;
      }
      if (!resolvedTeamId) { setMembers([]); return; }
      const response = await apiClient.request(`/team-formation/teams/${resolvedTeamId}/members/`);
      if (response.data) setMembers(response.data);
      
      // Also load pending addition requests
      await loadPendingAdditionRequests(resolvedTeamId);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadPendingAdditionRequests = async (teamId: number) => {
    try {
      setIsLoadingAdditionRequests(true);
      const response = await apiClient.getTeamMemberAdditionRequests(teamId);
      if (response.data) {
        // Filter only pending requests (exclude withdrawn, accepted, rejected, expired)
        const pendingRequests = response.data.filter((req: any) => req.status === 'pending');
        setPendingAdditionRequests(pendingRequests);
      }
    } catch (error) {
      console.error('Error loading pending addition requests:', error);
      setPendingAdditionRequests([]);
    } finally {
      setIsLoadingAdditionRequests(false);
    }
  };

  const copyTeamCode = () => {
    navigator.clipboard.writeText(teamData.team_code);
    toast({
      title: "Team Code Copied!",
      description: "Share this code with potential team members.",
    });
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) return;
    
    try {
      setIsSendingInvitation(true);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail.trim())) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is eligible (licensed user without team)
      const eligibleResponse = await apiClient.get('/team-formation/eligible-users/');
      const eligibleData = eligibleResponse.data as any;
      
      if (eligibleData?.eligible_users) {
        const isEligible = eligibleData.eligible_users.some((user: any) =>
          user.email.toLowerCase() === inviteEmail.trim().toLowerCase()
        );

        if (!isEligible) {
          toast({
            title: "Email Not Found",
            description: "The person you are inviting is outside our database. Only licensed users can be invited.",
            variant: "destructive",
          });
          return;
        }
      }

      // Send invitation
      const teamId = teamData?.id;
      if (!teamId) {
        toast({
          title: "Error",
          description: "Team not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      await apiClient.createTeamMemberAdditionRequest(teamId, {
        invited_user_email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined
      });

      toast({
        title: "Invitation Sent!",
        description: `Invitation sent to ${inviteEmail.trim()}`,
      });

      // Clear form
      setInviteEmail("");
      setInviteMessage("");
      
      // Refresh the pending addition requests list to show the new invitation
      await loadPendingAdditionRequests(teamId);
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error?.error || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleRequestResponse = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      setIsLoading(true);

      const req = joinRequests.find(r => r.id === requestId);
      const mappedAction = action === 'accept' ? 'approve' : 'reject';

      const payload: any = { action: mappedAction };
      if (mappedAction === 'approve' && req?.preferred_archetype) {
        payload.assigned_archetype = req.preferred_archetype;
      }

      const response = await apiClient.post(`/team-formation/requests/${requestId}/respond/`, payload);

      if (response.data) {
        toast({
          title: action === 'accept' ? "Request Accepted!" : "Request Rejected",
          description: action === 'accept' 
            ? "The member has been added to your team." 
            : "The request has been declined.",
        });
        
        // Remove the request locally to immediately update UI
        setJoinRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Refresh lists
        await loadJoinRequests();
        if (mappedAction === 'approve') {
          await loadMembers();
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.error || `Failed to ${action} request`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToIdeaGeneration = () => {
    onComplete();
  };

  const addRole = async () => {
    if (!newRole.job_role.trim()) {
      toast({
        title: "Role Required",
        description: "Please enter a job role.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingLookingFor(true);
      const updatedLookingFor = [...lookingFor, { ...newRole }];
      
      // Update team's looking_for field
      const teamId = teamData?.id;
      if (teamId) {
        await apiClient.put(`/team-formation/teams/${teamId}/`, {
          looking_for: updatedLookingFor
        });
        
        setLookingFor(updatedLookingFor);
        setNewRole({ job_role: '', keywords: '', job_description: '' });
        setShowAddRole(false);
        
        toast({
          title: "Role Added!",
          description: "New role added to your team's looking for list.",
        });
      }
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: error?.error || "Failed to add role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLookingFor(false);
    }
  };

  const removeRole = async (index: number) => {
    try {
      setIsUpdatingLookingFor(true);
      const updatedLookingFor = lookingFor.filter((_, i) => i !== index);
      
      // Update team's looking_for field
      const teamId = teamData?.id;
      if (teamId) {
        await apiClient.put(`/team-formation/teams/${teamId}/`, {
          looking_for: updatedLookingFor
        });
        
        setLookingFor(updatedLookingFor);
        
        toast({
          title: "Role Removed",
          description: "Role removed from your team's looking for list.",
        });
      }
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: error?.error || "Failed to remove role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLookingFor(false);
    }
  };

  const updateUserArchetype = async (newArchetype: string) => {
    try {
      setIsUpdatingArchetype(true);
      
      // Update user's preferred archetype
      const response = await apiClient.put('/auth/user/', {
        preferred_archetype: newArchetype
      });
      
      setUserArchetype(newArchetype);
      
      // Update the user context with the new archetype
      if (response.data?.user) {
        // The user context will be updated automatically on next login/profile fetch
        // For now, just update the local state
      }
      
      toast({
        title: "Archetype Updated!",
        description: `Your archetype has been updated to ${newArchetype}`,
      });
    } catch (error: any) {
      console.error('Error updating archetype:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.error || "Failed to update archetype. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingArchetype(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50 w-full relative">
        {/* Logos positioned at absolute left edge */}
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img 
            src="/logos/prov_logo_white.png" 
            alt="xFactory Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackIcon = document.createElement('div');
                fallbackIcon.innerHTML = '<svg class="h-8 w-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>';
                parent.appendChild(fallbackIcon);
              }
            }}
          />
          <img 
            src="/logos/fiualonetransreverse.png" 
            alt="FIU Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackText = document.createElement('span');
                fallbackText.textContent = 'FIU';
                fallbackText.className = 'text-white font-bold text-lg';
                parent.appendChild(fallbackText);
              }
            }}
          />
        </div>

        {/* User controls positioned at absolute right edge */}
        <div className="absolute right-0 top-0 h-full flex items-center gap-3 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
          >
            <User className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
            onClick={onBack}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            {/* Center: Section name and icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Team Formation</h1>
                <p className="text-sm text-white/80">Build your dream team</p>
              </div>
            </div>
            
            {/* Timer positioned to the right of center */}
            <div className="absolute right-1/4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{timeRemaining}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Team Info Card */}
        <Card className="mb-6 shadow-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {teamData.name}
            </CardTitle>
            <CardDescription>
              {teamData.description || "Your team is ready to grow!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {teamData.current_member_count}/{teamData.max_members} Members
                </Badge>
                <Badge variant="secondary">
                  Leader: You
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={copyTeamCode}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Code: {teamData.team_code}
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Main Content */}
        <Tabs defaultValue="code" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Team Code
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Join Requests
              {joinRequests.filter(req => req.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {joinRequests.filter(req => req.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code">
            <Card className="shadow-industrial">
              <CardHeader>
                <CardTitle>Share Your Team Code</CardTitle>
                <CardDescription>
                  Give this code to people you want to invite to your team. They can use it to send join requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl font-mono font-bold text-primary mb-4 tracking-widest">
                    {teamData.team_code}
                  </div>
                  <Button onClick={copyTeamCode} size="lg" variant="machinery">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3">How it works:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Share this 6-character code with potential team members</li>
                    <li>They enter the code when creating their account or joining teams</li>
                    <li>You'll receive their join requests in the "Join Requests" tab</li>
                    <li>Accept the best candidates to build your dream team</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="shadow-industrial">
              <CardHeader>
                <CardTitle>Join Requests</CardTitle>
                <CardDescription>
                  Review and respond to people who want to join your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Looking For Management Section */}
                <div className="mb-6 p-4 bg-muted/20 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Looking For</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddRole(!showAddRole)}
                      disabled={isUpdatingLookingFor}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Role
                    </Button>
                  </div>
                  
                  {/* Add Role Form */}
                  {showAddRole && (
                    <div className="space-y-3 p-3 bg-background rounded border mb-4">
                      <div>
                        <Label htmlFor="jobRole" className="text-sm">Job Role *</Label>
                        <Input
                          id="jobRole"
                          placeholder="e.g., Frontend Developer, Marketing Specialist"
                          value={newRole.job_role}
                          onChange={(e) => setNewRole(prev => ({ ...prev, job_role: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="keywords" className="text-sm">Skills/Keywords</Label>
                        <Input
                          id="keywords"
                          placeholder="e.g., React, JavaScript, Marketing"
                          value={newRole.keywords}
                          onChange={(e) => setNewRole(prev => ({ ...prev, keywords: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="jobDescription" className="text-sm">Description</Label>
                        <Textarea
                          id="jobDescription"
                          placeholder="Brief description of the role and what you're looking for..."
                          value={newRole.job_description}
                          onChange={(e) => setNewRole(prev => ({ ...prev, job_description: e.target.value }))}
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={addRole}
                          disabled={!newRole.job_role.trim() || isUpdatingLookingFor}
                        >
                          {isUpdatingLookingFor ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Role
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddRole(false);
                            setNewRole({ job_role: '', keywords: '', job_description: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Current Roles */}
                  {lookingFor.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No roles added yet</p>
                      <p className="text-sm">Click "Add Role" to specify what you're looking for</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lookingFor.map((role: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-background rounded border">
                          <div className="flex-1">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeRole(index)}
                            disabled={isUpdatingLookingFor}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {joinRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No join requests yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Share your team code to start receiving requests!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <User className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{request.user_name}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {request.user_email}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">
                                  {request.preferred_archetype}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Badge>
                              </div>
                              {request.message && (
                                <p className="text-sm mt-2 p-2 bg-muted rounded">
                                  "{request.message}"
                                </p>
                              )}
                              {request.user_skills && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Skills: {request.user_skills}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestResponse(request.id, 'accept')}
                                disabled={isLoading}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestResponse(request.id, 'reject')}
                                disabled={isLoading}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          
                          {request.status !== 'pending' && (
                            <Badge variant={request.status === 'accepted' ? 'default' : 'secondary'}>
                              {request.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card className="shadow-industrial">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>All members currently in your team.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Invite Members Section - Expandable/Collapsible */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Invite Members</h3>
                    <Button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      variant="outline"
                      size="sm"
                    >
                      {showInviteForm ? "Hide" : "Show Invite Form"}
                    </Button>
                  </div>
                  
                  {showInviteForm && (
                    <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="inviteEmail" className="text-sm font-medium">Email Address</Label>
                          <Input
                            id="inviteEmail"
                            type="email"
                            placeholder="Enter email address to invite..."
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter the email of a licensed user you want to invite
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="inviteMessage" className="text-sm font-medium">Message (Optional)</Label>
                          <Textarea
                            id="inviteMessage"
                            placeholder="Personal message for the invitation..."
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSendInvitation}
                          disabled={!inviteEmail.trim() || isSendingInvitation}
                          className="flex items-center gap-2"
                        >
                          {isSendingInvitation ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Requested Members Section */}
                <div className="border-t pt-6 mb-6">
                  <h4 className="font-medium mb-3">Requested Members</h4>
                  {isLoadingAdditionRequests ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading pending requests...</p>
                    </div>
                  ) : pendingAdditionRequests.length === 0 ? (
                    <div className="text-center py-4">
                      <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No pending invitations</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingAdditionRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between border rounded-lg p-3 bg-amber-50 border-amber-200">
                          <div>
                            <div className="font-medium text-amber-800">{request.invited_user_email}</div>
                            <div className="text-sm text-amber-600">
                              Invited by: {request.invited_by_name || request.invited_by_email}
                            </div>
                            {request.message && (
                              <div className="text-xs text-amber-700 mt-1 p-2 bg-white/50 rounded border border-amber-200">
                                "{request.message}"
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                                Pending Response
                              </Badge>
                              <span className="text-xs text-amber-600">
                                Sent: {new Date(request.requested_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiClient.cancelAdditionRequest(request.id);
                                  toast({
                                    title: "Invitation Cancelled",
                                    description: "The invitation has been cancelled",
                                  });
                                  // Refresh the list
                                  await loadPendingAdditionRequests(teamData.id);
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to cancel",
                                    description: error?.error || "Please try again",
                                  });
                                }
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3">Current Members</h4>
                  {members.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No members yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <div className="font-medium">{m.user_name || m.user_email}</div>
                            <div className="text-sm text-muted-foreground">{m.user_email}</div>
                            {m.assigned_archetype && (
                              <Badge variant="outline" className="mt-1">{m.assigned_archetype}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">{m.role}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          {fromDashboard ? (
            // When coming from dashboard, show "Back to Dashboard" as primary button
            <Button onClick={onBack} size="lg" variant="machinery" className="w-full">
              ← Back to Dashboard
            </Button>
          ) : (
            // Original behavior when coming from onboarding flow
            <>
              <Button variant="ghost" onClick={onBack}>
                ← Back
              </Button>
              <Button onClick={proceedToIdeaGeneration} size="lg" variant="machinery">
                {(() => { 
                  try { 
                    const isIdeaCompleted = localStorage.getItem('xfactoryIdeaCompleted') === 'true';
                    const now = new Date();
                    const formationDeadline = teamData.formation_deadline ? new Date(teamData.formation_deadline) : null;
                    const isFormationComplete = formationDeadline ? now > formationDeadline : teamData.current_member_count >= teamData.max_members;
                    
                    if (isIdeaCompleted) {
                      return 'Back to Dashboard →';
                    } else if (isFormationComplete) {
                      return 'Complete Team Formation →';
                    } else {
                      return 'Go to Idea Generation →';
                    }
                  } catch { 
                    return 'Complete Team Formation →'; 
                  } 
                })()}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 