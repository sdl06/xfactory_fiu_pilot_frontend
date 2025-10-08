import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { 
  Lightbulb, 
  Palette, 
  Target, 
  Code, 
  TestTube, 
  RefreshCw, 
  TrendingUp, 
  Rocket, 
  BarChart3,
  Lock,
  CheckCircle,
  Play,
  Clock,
  Package,
  Users,
  Scale,
  DollarSign
} from "lucide-react";

interface ProductionLineFlowProps {
  completedStations: number[];
  currentStation: number;
  onEnterStation: (stationId: number, reviewMode?: boolean) => void;
  stationData?: any; // Add stationData for refresh mechanism
}

const StationNode = ({ data }: { data: any }) => {
  const { station, status, onEnter, isFirst, isLast, isWorkshop } = data;
  const Icon = station.icon;
  
  // Workshop stations render as horizontal lines
  if (isWorkshop) {
    return (
      <div className="relative">
        {/* Wide workshop card without connection handles */}
        <div className={`bg-background border rounded-lg p-3 w-[460px] h-auto py-4 shadow-sm transition-all hover:shadow-md flex items-center ${
          status === 'completed' ? 'border-success bg-success/5' :
          status === 'active' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :
          status === 'unlocked' ? 'border-warning bg-warning/5' :
          'border-muted bg-muted/10 opacity-60'
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
            status === 'completed' ? 'bg-success text-success-foreground' :
            status === 'active' ? 'bg-primary text-primary-foreground' :
            status === 'unlocked' ? 'bg-warning text-warning-foreground' :
            'bg-muted text-muted-foreground'
          }`}>
            {status === 'completed' ? (
              <CheckCircle className="h-4 w-4" />
            ) : status === 'locked' ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{station.title}</h3>
            <div className="text-xs text-muted-foreground">{station.estimatedTime}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={
              status === 'completed' ? 'success' :
              status === 'active' ? 'default' :
              status === 'unlocked' ? 'accent' :
              'secondary'
            } className="text-xs">
              {status === 'completed' ? 'Complete' :
               status === 'active' ? 'Active' :
               status === 'unlocked' ? 'Ready' :
               'Locked'}
            </Badge>
            {(status === 'active' || status === 'unlocked') && (
              <Button 
                size="sm" 
                variant={status === 'active' ? 'default' : 'secondary'}
                className="h-7 px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnter(station.id);
                }}
              >
                <Play className="h-3 w-3 mr-1" />
                {status === 'active' ? 'Continue' : 'Start'}
              </Button>
            )}
            {status === 'completed' && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 px-3 border-success text-success"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnter(station.id, true);
                }}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Review
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Input Handle */}
      {!isFirst && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ 
            background: status === 'completed' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
            border: 'none',
            width: '12px',
            height: '12px'
          }}
        />
      )}
      
      {/* Clean Station Card */}
      <div className={`bg-background border rounded-lg p-4 w-72 shadow-sm transition-all hover:shadow-md ${
        status === 'completed' ? 'border-success bg-success/5' :
        status === 'active' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :
        status === 'unlocked' ? 'border-warning bg-warning/5' :
        'border-muted bg-muted/10 opacity-60'
      }`}>
        
        {/* Header Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            status === 'completed' ? 'bg-success text-success-foreground' :
            status === 'active' ? 'bg-primary text-primary-foreground' :
            status === 'unlocked' ? 'bg-warning text-warning-foreground' :
            'bg-muted text-muted-foreground'
          }`}>
            {status === 'completed' ? (
              <CheckCircle className="h-5 w-5" />
            ) : status === 'locked' ? (
              <Lock className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{station.title}</h3>
            <Badge variant={
              status === 'completed' ? 'success' :
              status === 'active' ? 'default' :
              status === 'unlocked' ? 'accent' :
              'secondary'
            } className="text-xs mt-1">
              {status === 'completed' ? 'Complete' :
               status === 'active' ? 'Active' :
               status === 'unlocked' ? 'Ready' :
               'Locked'}
            </Badge>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {station.description}
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <div className="font-medium">{station.estimatedTime}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Output:</span>
            <div className="font-medium">{station.output}</div>
          </div>
        </div>
        
        {/* Action Button */}
        {(status === 'active' || status === 'unlocked') && (
          <Button 
            size="sm" 
            variant={status === 'active' ? 'default' : 'secondary'}
            className="w-full"
            onClick={async (e) => {
              e.stopPropagation();
              // For AI Powered Idea Creation (station 1): if concept card exists but pitch not submitted,
              // jump straight to the concept card (review mode) so the student can submit the pitch.
              if (station.id === 1) {
                try {
                  const teamIdStr = localStorage.getItem('xfactoryTeamId');
                  const teamId = teamIdStr ? Number(teamIdStr) : null;
                  if (teamId) {
                    // Check if a team concept card exists
                    let hasCard = false;
                    try {
                      const cardRes: any = await apiClient.getTeamConceptCard(teamId);
                      hasCard = !!(cardRes && cardRes.status >= 200 && cardRes.status < 300 && (cardRes as any).data);
                    } catch { hasCard = false; }
                    // Check if elevator pitch link is submitted
                    let hasPitch = false;
                    try {
                      const pitchRes: any = await apiClient.getElevatorPitchSubmission(teamId);
                      const d: any = pitchRes?.data || {};
                      hasPitch = Boolean(d?.submitted || (typeof d?.google_drive_link === 'string' && d.google_drive_link.trim()));
                    } catch {
                      try { const v = localStorage.getItem('xfactoryElevatorPitchLink'); hasPitch = !!(v && v.trim()); } catch { hasPitch = false; }
                    }
                    if (hasCard && !hasPitch) {
                      // Prefetch pitch link to ensure UI reflects saved state
                      try { await apiClient.getElevatorPitchSubmission(teamId); } catch {}
                      onEnter(station.id, true); // open concept card popup in review mode
                      return;
                    }
                  }
                } catch {}
              }
              onEnter(station.id);
            }}
          >
            <Play className="h-3 w-3 mr-2" />
            {status === 'active' ? 'Continue' : 'Start'}
          </Button>
        )}
        
        {status === 'completed' && (
          <Button 
            size="sm" 
            variant="outline"
            className="w-full border-success text-success"
            onClick={async (e) => {
              e.stopPropagation();
              // Prefetch concept card when reviewing AI Powered Idea Creation (station 1)
              if (station.id === 1) {
                try {
                  const teamIdStr = localStorage.getItem('xfactoryTeamId');
                  const teamId = teamIdStr ? Number(teamIdStr) : null;
                  if (teamId) {
                    let res: any = await apiClient.getTeamConceptCard(teamId);
                    const ok = res && res.status >= 200 && res.status < 300 && (res as any).data;
                    if (!ok) {
                      try { await apiClient.generateTeamConceptCard(teamId); } catch {}
                      try { res = await apiClient.getTeamConceptCard(teamId); } catch {}
                    }
                    // Also prefetch elevator pitch submission so review shows saved state
                    try { await apiClient.getElevatorPitchSubmission(teamId); } catch {}
                  }
                } catch {}
              }
              onEnter(station.id, true); // Pass true for review mode
            }}
          >
            <CheckCircle className="h-3 w-3 mr-2" />
            Review
          </Button>
        )}
        
      </div>
      
      {/* Output Handle */}
      {!isLast && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ 
            background: status === 'completed' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
            border: 'none',
            width: '12px',
            height: '12px'
          }}
        />
      )}
    </div>
  );
};

// Move nodeTypes outside component to prevent re-creation on every render
const nodeTypes = {
  station: StationNode,
};

export const ProductionLineFlow = ({ 
  completedStations = [], 
  currentStation = 1, 
  onEnterStation,
  stationData = {} // Add stationData for refresh mechanism
}: ProductionLineFlowProps) => {
  const [adminLocks, setAdminLocks] = useState<Record<string, boolean>>({});
  const [adminUnlocks, setAdminUnlocks] = useState<Record<string, boolean>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [ideaCardComplete, setIdeaCardComplete] = useState<boolean>(false);
  
  // Viewport metrics for positioning
  const [viewportMetrics, setViewportMetrics] = useState({
    x: 0,
    y: 0,
    zoom: 1,
    width: 0,
    height: 0
  });

  // Stable reference for loading admin locks
  const loadAdminLocks = useCallback(async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      
      const res = await apiClient.getTeamRoadmap(teamId);
      const locks = (res as any)?.data?.admin_locks || {};
      const unlocks = (res as any)?.data?.admin_unlocks || {};
      
      // Only update if data actually changed
      setAdminLocks(prev => {
        const changed = JSON.stringify(prev) !== JSON.stringify(locks);
        return changed ? locks : prev;
      });
      setAdminUnlocks(prev => {
        const changed = JSON.stringify(prev) !== JSON.stringify(unlocks);
        return changed ? unlocks : prev;
      });
      
      setLastUpdateTime(Date.now());
    } catch {}
  }, []);

  // Load admin locks only once on mount and when explicitly triggered
  useEffect(() => {
    loadAdminLocks();
    // Also determine if idea generation (station 1) is effectively complete
    (async () => {
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;
        try {
          const cardRes: any = await apiClient.getTeamConceptCard(teamId);
          const ok = cardRes && cardRes.status >= 200 && cardRes.status < 300 && (cardRes as any).data;
          setIdeaCardComplete(Boolean(ok));
        } catch {
          setIdeaCardComplete(false);
        }
      } catch {}
    })();
    
    // Throttled refresh function
    let refreshTimeout: NodeJS.Timeout | null = null;
    const throttledRefresh = () => {
      if (refreshTimeout) return;
      refreshTimeout = setTimeout(() => {
        loadAdminLocks();
        refreshTimeout = null;
      }, 2000);
    };
    
    // Listen for admin changes via storage
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'xfactory_adminLocksUpdated') {
        throttledRefresh();
      }
    };
    
    window.addEventListener('storage', onStorage);
    
    return () => {
      window.removeEventListener('storage', onStorage);
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, []); // Empty dependency array - only run once
  const stations = [
    { id: 1, title: "AI Powered Idea Creation", description: "Generate and refine your startup idea with AI assistance and market research", icon: Lightbulb, estimatedTime: "30 mins", output: "Refined Idea Card" },
    { id: 2, title: "Visual Mockup Station", description: "Create stunning visual mockups and wireframes for your product concept", icon: Palette, estimatedTime: "45 mins", output: "Product Mockups" },
    { id: 3, title: "Validation Engine", description: "Comprehensive market validation through surveys, interviews, and data analysis", icon: Target, estimatedTime: "2 hours", output: "Validation Report" },
    { id: 4, title: "Pitch Deck Creation", description: "Create compelling investor presentations with financial projections and market analysis", icon: Package, estimatedTime: "2 days", output: "Pitch Deck" },
    { id: 5, title: "Pre-MVP Mentorship Session", description: "Strategic guidance and planning before building your MVP with expert mentors", icon: Users, estimatedTime: "60 mins", output: "Mentorship Insights" },
    { id: 6, title: "MVP Development Station", description: "Plan and build your Minimum Viable Product with development roadmap", icon: Code, estimatedTime: "2-8 weeks", output: "MVP Plan & Build" },
    { id: 7, title: "Post-MVP Mentorship Session", description: "Review MVP results and plan next steps with experienced mentors", icon: Users, estimatedTime: "90 mins", output: "Strategic Guidance" },
    { id: 8, title: "Launch Prep Station", description: "Prepare for product launch with go-to-market strategy and launch planning", icon: Rocket, estimatedTime: "1 week", output: "Launch Plan" },
    { id: 9, title: "Launch Execution Station", description: "Execute your product launch with coordinated marketing and communication", icon: TrendingUp, estimatedTime: "1 week", output: "Executed Launch" },
    { id: 10, title: "Pre-Investor Mentorship Session", description: "Final coaching and review before investor presentations", icon: Users, estimatedTime: "60 mins", output: "Mentorship Insights" },
    { id: 11, title: "Pitch Practice Station", description: "Practice investor pitches and refine messaging with AI feedback", icon: Target, estimatedTime: "45 mins", output: "Pitch Video & Feedback" },
    // Workshops (12-14): Finance, Marketing, Legal
    { id: 12, title: "Workshop: Financial Modeling", description: "Hands-on session to build your initial financial model", icon: DollarSign, estimatedTime: "90 mins", output: "Financial Model" },
    { id: 13, title: "Workshop: Marketing Strategy", description: "Branding, acquisition channels, and campaign planning", icon: TrendingUp, estimatedTime: "60 mins", output: "Marketing Plan" },
    { id: 14, title: "Workshop: Legal & Compliance", description: "Ensure your startup is compliant with key legal requirements", icon: Scale, estimatedTime: "60 mins", output: "Compliance Checklist" },
    { id: 15, title: "Investor Presentation", description: "Present your startup to investors with polished materials", icon: Target, estimatedTime: "2 hours", output: "Investor Presentation" },
  ];

  const workshopIds = [12, 13, 14];

  const sectionKeyForStation = (stationId: number): string => {
    switch (stationId) {
      case 1: return 'idea';
      case 2: return 'mockups';
      case 3: return 'validation';
      case 4: return 'pitch_deck';
      case 5: return 'mentorship_pre';
      case 6: return 'mvp';
      case 7: return 'mentorship_post';
      case 8: return 'launch_prep';
      case 9: return 'launch_execution';
      case 10: return 'mentorship_pre_investor';
      case 11: return 'pitch_practice';
      case 12: return 'finance';
      case 13: return 'marketing';
      case 14: return 'legal';
      case 15: return 'investor_presentation';
      default: return `station_${stationId}`;
    }
  };

  const getStationStatus = useCallback((stationId: number) => {
    // Debug logging for workshop stations
    if (stationId >= 12 && stationId <= 14) {
      console.log(`🔍 Station ${stationId} status check:`, {
        stationId,
        completedStations,
        currentStation,
        isCompleted: completedStations.includes(stationId),
        isCurrent: stationId === currentStation,
        financeCompleted: completedStations.includes(12),
        marketingCompleted: completedStations.includes(13),
        postMvpCompleted: completedStations.includes(7),
        adminDataLoaded: Object.keys(adminLocks).length > 0 || Object.keys(adminUnlocks).length > 0
      });
    }
    
    // Completion display - always show completed stations as completed
    if (completedStations.includes(stationId)) return 'completed';

    // Treat AI Powered Idea Creation as completed if a concept card exists
    if (stationId === 1 && ideaCardComplete) return 'completed';
    
    // Locked-by-default gating: only admin unlocks open a station
    const key = sectionKeyForStation(stationId);
    const explicitlyUnlocked = adminUnlocks?.[key] === true;
    const explicitlyLocked = adminLocks?.[key] === true;

    // Current station is active only if explicitly unlocked (and not explicitly locked)
    if (stationId === currentStation) return (explicitlyUnlocked && !explicitlyLocked) ? 'active' : 'locked';

    // Other stations are unlocked only if explicitly unlocked (and not explicitly locked)
    return (explicitlyUnlocked && !explicitlyLocked) ? 'unlocked' : 'locked';
  }, [completedStations, currentStation, adminLocks, adminUnlocks, ideaCardComplete]);

  // Build pipeline order: after 7, include workshops 12-14, then continue 8..11, and 15
  const pipelineOrder: number[] = useMemo(() => [1,2,3,4,5,6,7,12,13,14,8,9,10,11,15], []);

  // Fixed container height for consistent layout (desktop), adaptive on ultra-narrow devices
  const isUltraNarrow = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 420px)').matches : false;
  const FIXED_CONTAINER_HEIGHT = isUltraNarrow ? (typeof window !== 'undefined' ? Math.max(Math.floor(window.innerHeight * 0.7), 560) : 560) : 1400;

  // Memoize nodes calculation (top workshops + pipeline grid)
  const initialNodes: any[] = useMemo(() => {
    const nodes: any[] = [];
    // Top workshops row (wide cards)
    workshopIds.forEach((wid, idx) => {
      const station = stations.find(s => s.id === wid)!;
      nodes.push({
        id: `work-${wid}`,
        type: 'station',
        position: { x: 80 + idx * 460, y: 80 },
        data: {
          station,
          status: getStationStatus(wid),
          onEnter: onEnterStation,
          isFirst: false,
          isLast: false,
          isWorkshop: true,
        },
      });
    });
    // Pipeline grid (3 per row; include workshop clones after 7)
    pipelineOrder.forEach((sid, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const station = stations.find(s => s.id === sid)!;
      const isWorkshopClone = workshopIds.includes(sid);
      nodes.push({
        id: isWorkshopClone ? `pipe-${sid}` : `${sid}`,
        type: 'station',
        position: { x: col * 380 + 120, y: row * 240 + 220 },
        data: {
          station,
          status: getStationStatus(sid),
          onEnter: onEnterStation,
          isFirst: i === 0,
          isLast: i === pipelineOrder.length - 1,
          isWorkshop: false,
        },
      });
    });
    return nodes;
  }, [stations, getStationStatus, onEnterStation]);

  // Edges based on pipeline order
  const initialEdges: any[] = useMemo(() => {
    const edges: any[] = [];
    for (let i = 0; i < pipelineOrder.length - 1; i++) {
      const curr = pipelineOrder[i];
      const next = pipelineOrder[i + 1];
      const sourceId = workshopIds.includes(curr) ? `pipe-${curr}` : `${curr}`;
      const targetId = workshopIds.includes(next) ? `pipe-${next}` : `${next}`;
      const isCompleted = getStationStatus(curr) === 'completed';
      edges.push({
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        animated: isCompleted,
        style: {
          stroke: isCompleted ? 'hsl(var(--success))' : 'hsl(var(--border))',
          strokeWidth: 2,
          opacity: isCompleted ? 1 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? 'hsl(var(--success))' : 'hsl(var(--border))',
          width: 16,
          height: 16,
        },
      });
    }
    return edges;
  }, [pipelineOrder, getStationStatus]);

  // Create a stable key for memoization based on actual state changes
  const stateKey = useMemo(() => {
    return `${completedStations.join(',')}-${currentStation}-${JSON.stringify(adminLocks)}-${JSON.stringify(adminUnlocks)}-${stationData._refresh || 0}`;
  }, [completedStations, currentStation, adminLocks, adminUnlocks, stationData._refresh]);

  // Memoize nodes with stable dependencies
  const finalNodes = useMemo(() => {
    const nodesNext: any[] = [];
    
    // Top workshops row
    workshopIds.forEach((wid, idx) => {
      const station = stations.find(s => s.id === wid)!;
      nodesNext.push({
        id: `work-${wid}`,
        type: 'station',
        position: { x: 80 + idx * 460, y: 80 },
        data: {
          station,
          status: getStationStatus(wid),
          onEnter: onEnterStation,
          isFirst: false,
          isLast: false,
          isWorkshop: true,
        },
      });
    });
    
    // Pipeline grid
    pipelineOrder.forEach((sid, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const station = stations.find(s => s.id === sid)!;
      const isWorkshopClone = workshopIds.includes(sid);
      nodesNext.push({
        id: isWorkshopClone ? `pipe-${sid}` : `${sid}`,
        type: 'station',
        position: { x: col * 380 + 120, y: row * 240 + 220 },
        data: {
          station,
          status: getStationStatus(sid),
          onEnter: onEnterStation,
          isFirst: i === 0,
          isLast: i === pipelineOrder.length - 1,
          isWorkshop: false,
        },
      });
    });
    
    return nodesNext;
  }, [stateKey, getStationStatus, onEnterStation]); // Only depend on stateKey and stable functions

  // Memoize edges with stable dependencies
  const finalEdges = useMemo(() => {
    const edgesNext: any[] = [];
    for (let i = 0; i < pipelineOrder.length - 1; i++) {
      const curr = pipelineOrder[i];
      const next = pipelineOrder[i + 1];
      const sourceId = workshopIds.includes(curr) ? `pipe-${curr}` : `${curr}`;
      const targetId = workshopIds.includes(next) ? `pipe-${next}` : `${next}`;
      const isCompleted = getStationStatus(curr) === 'completed';
      edgesNext.push({
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        animated: isCompleted,
        style: {
          stroke: isCompleted ? 'hsl(var(--success))' : 'hsl(var(--border))',
          strokeWidth: 2,
          opacity: isCompleted ? 1 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? 'hsl(var(--success))' : 'hsl(var(--border))',
          width: 16,
          height: 16,
        },
      });
    }
    return edgesNext;
  }, [stateKey, getStationStatus]); // Only depend on stateKey and stable functions

  // Handle viewport changes to track metrics
  const onViewportChange = useCallback((viewport: any) => {
    setViewportMetrics(prev => ({
      ...prev,
      x: Math.round(viewport.x),
      y: Math.round(viewport.y),
      zoom: Math.round(viewport.zoom * 100) / 100
    }));
  }, []);

  // Handle resize to track container dimensions
  const onResize = useCallback((dimensions: any) => {
    setViewportMetrics(prev => ({
      ...prev,
      width: Math.round(dimensions.width),
      height: Math.round(dimensions.height)
    }));
  }, []);

  return (
    <div className="w-full bg-transparent relative" style={{ height: `${FIXED_CONTAINER_HEIGHT}px` }}>
      <div className={isUltraNarrow ? "absolute inset-0 overflow-auto" : "absolute inset-0 overflow-auto hover:overflow-auto"}>
        <ReactFlow
          key={`flow-${stateKey}`}
          nodes={finalNodes}
          edges={finalEdges}
          nodeTypes={nodeTypes}
          defaultViewport={isUltraNarrow ? { x: -40, y: -40, zoom: 0.6 } : { x: -62, y: -65, zoom: 0.88 }}
          fitView={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          preventScrolling={false}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={isUltraNarrow ? true : false}
          onViewportChange={onViewportChange}
          onResize={onResize}
        >
          {/* Background/Controls removed to match installed @xyflow/react typings */}
        </ReactFlow>
      </div>
      
      {/* Viewport Metrics Display - Bottom Right Corner */}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono p-2 rounded border backdrop-blur-sm">
        <div className="space-y-1">
          <div>X: {viewportMetrics.x}</div>
          <div>Y: {viewportMetrics.y}</div>
          <div>Zoom: {viewportMetrics.zoom}</div>
          <div>W: {viewportMetrics.width}</div>
          <div>H: {viewportMetrics.height}</div>
        </div>
      </div>
    </div>
  );
};

export default ProductionLineFlow;
