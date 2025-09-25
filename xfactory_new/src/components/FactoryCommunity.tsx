import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, MessageSquare, Search, Filter, Plus, ArrowLeft, Heart, MessageCircle, Share, Briefcase, GraduationCap, MapPin, Clock } from "lucide-react";

interface FactoryCommunityProps {
  onGoBack: () => void;
}

interface Post {
  id: string;
  type: "engagement" | "looking-for-people" | "team-search";
  title: string;
  content: string;
  author: {
    name: string;
    role?: string;
    company?: string;
    avatar: string;
  };
  timestamp: string;
  likes: number;
  comments: number;
  tags: string[];
  // For looking-for-people posts
  role?: string;
  ideaDescription?: string;
  jobExpectations?: string;
  // For team-search posts
  degree?: string;
  experience?: string;
}

const mockPosts: Post[] = [
  {
    id: "1",
    type: "engagement",
    title: "Just launched our MVP! Here's what we learned",
    content: "After 3 months of development, we finally launched our SaaS platform. The biggest lesson? Start with user interviews much earlier than we did. Would love to hear about your launch experiences!",
    author: { name: "Sarah Chen", role: "Founder", company: "TaskFlow", avatar: "SC" },
    timestamp: "2 hours ago",
    likes: 24,
    comments: 8,
    tags: ["MVP", "Launch", "SaaS"]
  },
  {
    id: "2",
    type: "looking-for-people",
    title: "Looking for Full-Stack Developer",
    content: "Building an AI-powered fitness app that personalizes workout routines based on user data and preferences.",
    role: "Full-Stack Developer",
    ideaDescription: "AI-powered fitness app with personalized workout routines, progress tracking, and community features",
    jobExpectations: "3+ years experience with React, Node.js, and machine learning integration. Equity + competitive salary.",
    author: { name: "Mike Johnson", role: "CEO", company: "FitAI", avatar: "MJ" },
    timestamp: "4 hours ago",
    likes: 12,
    comments: 5,
    tags: ["React", "Node.js", "AI", "Fitness"]
  },
  {
    id: "3",
    type: "team-search",
    title: "Experienced Product Manager seeking team",
    content: "Looking to join an early-stage startup as Head of Product. I have 8 years of experience scaling products from 0 to 1M+ users.",
    degree: "MBA, Stanford Graduate School of Business",
    experience: "8 years product management at Meta, Stripe, and various startups. Led teams of 15+ engineers and designers.",
    author: { name: "Alex Rodriguez", role: "Product Manager", avatar: "AR" },
    timestamp: "1 day ago",
    likes: 18,
    comments: 12,
    tags: ["Product Management", "Leadership", "Scale"]
  },
  {
    id: "4",
    type: "engagement",
    title: "Fundraising tips for first-time founders",
    content: "Just closed our seed round! Here are 5 key things I wish I knew before starting the fundraising process...",
    author: { name: "David Kim", role: "Co-Founder", company: "DataViz Pro", avatar: "DK" },
    timestamp: "2 days ago",
    likes: 45,
    comments: 23,
    tags: ["Fundraising", "Seed", "Tips"]
  }
];

export const FactoryCommunity = ({ onGoBack }: FactoryCommunityProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterTags, setFilterTags] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState<{
    type: "engagement" | "looking-for-people" | "team-search";
    title: string;
    content: string;
    role: string;
    ideaDescription: string;
    jobExpectations: string;
    degree: string;
    experience: string;
    tags: string;
  }>({
    type: "engagement",
    title: "",
    content: "",
    role: "",
    ideaDescription: "",
    jobExpectations: "",
    degree: "",
    experience: "",
    tags: ""
  });

  const filteredPosts = mockPosts.filter(post => {
    const matchesTab = activeTab === "all" || post.type === activeTab;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || post.role?.toLowerCase().includes(filterRole.toLowerCase());
    const matchesTags = !filterTags || post.tags.some(tag => 
      tag.toLowerCase().includes(filterTags.toLowerCase())
    );
    
    return matchesTab && matchesSearch && matchesRole && matchesTags;
  });

  const handleCreatePost = () => {
    // In a real app, this would submit to an API
    console.log("Creating post:", newPost);
    setShowCreatePost(false);
    setNewPost({
      type: "engagement",
      title: "",
      content: "",
      role: "",
      ideaDescription: "",
      jobExpectations: "",
      degree: "",
      experience: "",
      tags: ""
    });
  };

  const PostCard = ({ post }: { post: Post }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
              {post.author.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{post.author.name}</h3>
                {post.author.role && (
                  <Badge variant="secondary" className="text-xs">
                    {post.author.role}
                  </Badge>
                )}
                {post.author.company && (
                  <span className="text-sm text-muted-foreground">@ {post.author.company}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {post.timestamp}
              </div>
            </div>
          </div>
          <Badge variant={
            post.type === "engagement" ? "default" : 
            post.type === "looking-for-people" ? "success" : 
            "warning"
          }>
            {post.type === "engagement" ? "Discussion" : 
             post.type === "looking-for-people" ? "Hiring" : 
             "Available"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <h4 className="font-semibold text-lg mb-2">{post.title}</h4>
        <p className="text-muted-foreground mb-3">{post.content}</p>
        
        {post.type === "looking-for-people" && (
          <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-medium">Role: {post.role}</span>
            </div>
            <div>
              <span className="font-medium text-sm">Idea: </span>
              <span className="text-sm text-muted-foreground">{post.ideaDescription}</span>
            </div>
            <div>
              <span className="font-medium text-sm">Expectations: </span>
              <span className="text-sm text-muted-foreground">{post.jobExpectations}</span>
            </div>
            <div className="flex justify-start mt-3">
              <Button variant="success" size="sm">
                Apply
              </Button>
            </div>
          </div>
        )}
        
        {post.type === "team-search" && (
          <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Education: </span>
              <span className="text-sm text-muted-foreground">{post.degree}</span>
            </div>
            <div>
              <span className="font-medium text-sm">Experience: </span>
              <span className="text-sm text-muted-foreground">{post.experience}</span>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="success" size="sm">
                Hire
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Heart className="h-4 w-4" />
              {post.likes}
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onGoBack} className="text-slate-50 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-50">Ivy Factory Community</h1>
                  <p className="text-sm text-slate-50">Connect, collaborate, and build together</p>
                </div>
              </div>
            </div>
            <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="post-type">Post Type</Label>
                    <Select value={newPost.type} onValueChange={(value: any) => setNewPost({...newPost, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engagement">Engagement/Discussion</SelectItem>
                        <SelectItem value="looking-for-people">Looking for Team Members</SelectItem>
                        <SelectItem value="team-search">Available to Join Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title"
                      value={newPost.title}
                      onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                      placeholder="What's your post about?"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea 
                      id="content"
                      value={newPost.content}
                      onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                      placeholder="Share your thoughts, experiences, or requirements..."
                      rows={4}
                    />
                  </div>
                  
                  {newPost.type === "looking-for-people" && (
                    <>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Input 
                          id="role"
                          value={newPost.role}
                          onChange={(e) => setNewPost({...newPost, role: e.target.value})}
                          placeholder="e.g., Full-Stack Developer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="idea">Idea Description</Label>
                        <Textarea 
                          id="idea"
                          value={newPost.ideaDescription}
                          onChange={(e) => setNewPost({...newPost, ideaDescription: e.target.value})}
                          placeholder="Briefly describe your startup idea..."
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expectations">Job Expectations</Label>
                        <Textarea 
                          id="expectations"
                          value={newPost.jobExpectations}
                          onChange={(e) => setNewPost({...newPost, jobExpectations: e.target.value})}
                          placeholder="Requirements, compensation, equity, etc..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                  
                  {newPost.type === "team-search" && (
                    <>
                      <div>
                        <Label htmlFor="degree">Education</Label>
                        <Input 
                          id="degree"
                          value={newPost.degree}
                          onChange={(e) => setNewPost({...newPost, degree: e.target.value})}
                          placeholder="e.g., MBA, Stanford Graduate School of Business"
                        />
                      </div>
                      <div>
                        <Label htmlFor="experience">Experience</Label>
                        <Textarea 
                          id="experience"
                          value={newPost.experience}
                          onChange={(e) => setNewPost({...newPost, experience: e.target.value})}
                          placeholder="Describe your professional experience..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input 
                      id="tags"
                      value={newPost.tags}
                      onChange={(e) => setNewPost({...newPost, tags: e.target.value})}
                      placeholder="e.g., React, Node.js, AI (comma-separated)"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePost}>
                      Create Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="product">Product Manager</SelectItem>
                <SelectItem value="founder">Founder/CEO</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Filter by tags"
              value={filterTags}
              onChange={(e) => setFilterTags(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Posts</TabsTrigger>
            <TabsTrigger value="engagement">Discussions</TabsTrigger>
            <TabsTrigger value="looking-for-people">Hiring</TabsTrigger>
            <TabsTrigger value="team-search">Available</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Posts */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                <p>Try adjusting your filters or be the first to create a post!</p>
              </div>
            </Card>
          ) : (
            filteredPosts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
};