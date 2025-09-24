import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Calendar, MessageSquare, FileText, User, Mail, Target } from "lucide-react";
import { apiClient } from "@/lib/api";
import TeamProgressView from "./TeamProgressView";
import { useToast } from "@/hooks/use-toast";

interface MentorTeamDetailsProps {
  teamId: number;
  mentorEmail: string;
  onClose: () => void;
}

interface TeamMemberUser {
  id?: number;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  major?: string;
  phone_number?: string;
  course_professor?: string;
  availability?: string;
  preferred_archetype?: string;
}

interface TeamMember {
  id: number;
  user?: TeamMemberUser;
  assigned_archetype?: string | null;
  is_active?: boolean;
}

interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
  members?: TeamMember[];
  current_member_count?: number;
  max_members?: number;
  created_at?: string | null;
}

interface MentorTeamDetailsResponse {
  success: boolean;
  error?: string;
  team?: TeamSummary;
  roadmap_completion?: Record<string, unknown>;
  validation_data?: Record<string, unknown>;
  pitch_deck_data?: Record<string, unknown>;
  idea_data?: Record<string, unknown>;
}

const FALLBACK_ERROR_MESSAGE = 'Failed to load team details';

export const MentorTeamDetails: React.FC<MentorTeamDetailsProps> = ({
  teamId,
  mentorEmail,
  onClose,
}) => {
  const [teamDetails, setTeamDetails] = useState<MentorTeamDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isCancelled = false;

    const fetchTeamDetails = async () => {
      setLoading(true);
      setError(null);
      setTeamDetails(null);

      try {
        const response = await apiClient.getMentorTeamDetails(teamId, mentorEmail);
        const payload = response.data as MentorTeamDetailsResponse | undefined;

        if (response.status === 200 && payload?.success && payload.team) {
          if (!isCancelled) {
            setTeamDetails(payload);
          }
          return;
        }

        if (isCancelled) {
          return;
        }

        const message =
          payload?.error ||
          (typeof response.data === 'string' ? response.data : undefined) ||
          response.error ||
          FALLBACK_ERROR_MESSAGE;

        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } catch (err) {
        if (isCancelled) {
          return;
        }

        console.error('Error loading team details:', err);
        setError(FALLBACK_ERROR_MESSAGE);
        toast({
          title: 'Error',
          description: FALLBACK_ERROR_MESSAGE,
          variant: 'destructive',
        });
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchTeamDetails();

    return () => {
      isCancelled = true;
    };
  }, [teamId, mentorEmail, toast]);

  const team = teamDetails?.team;
  const members = team?.members ?? [];
  const currentMemberCount =
    typeof team?.current_member_count === 'number' ? team.current_member_count : members.length;
  const maxMembers =
    typeof team?.max_members === 'number' ? team.max_members : undefined;

  const formattedCreatedDate = (() => {
    if (!team?.created_at) {
      return 'Not available';
    }
    const date = new Date(team.created_at);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
  })();

  const teamDescription =
    team?.description && team.description.trim().length > 0
      ? team.description
      : 'Overview of the team assigned to you.';

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogDescription>Loading mentor team details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading team details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !team) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogDescription>{error ?? FALLBACK_ERROR_MESSAGE}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-red-500">{error ?? 'Team not found'}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <div className="space-y-6 p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-bold">{team.name}</DialogTitle>
            <DialogDescription>{teamDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Team Size</p>
                    <p className="text-2xl font-bold">
                      {typeof maxMembers === 'number' ? `${currentMemberCount}/${maxMembers}` : currentMemberCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm">{formattedCreatedDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant="outline">{currentMemberCount > 0 ? 'Active' : 'Pending'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="members">Team Members</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members ({members.length})
                  </CardTitle>
                  <CardDescription>
                    Current team members and their assigned roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {members.length > 0 ? (
                    <div className="space-y-4">
                      {members.map((member) => {
                        const user = member.user ?? {};
                        const displayName =
                          user.full_name?.trim() ||
                          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
                          user.email ||
                          'Unknown member';
                        const email = user.email ?? 'Email not provided';
                        const assignedArchetype = member.assigned_archetype || 'Unassigned';

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{displayName}</div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {email}
                                </div>
                                {user.student_id && (
                                  <div className="text-xs text-muted-foreground">
                                    Student ID: {user.student_id}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{assignedArchetype}</Badge>
                              {user.major && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {user.major}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                      No active team members yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              <TeamProgressView
                team={team}
                initialSection="idea"
                showSectionNavigation
                mode="mentor"
              />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Mentor Notes
                  </CardTitle>
                  <CardDescription>
                    Add notes and observations about the team's progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>Notes feature coming soon...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};


