import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { SubmitGate } from "@/components/SubmitGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Image, Smartphone, Monitor, Palette, Download, ArrowRight, ArrowLeft, Zap, Eye, ExternalLink, CheckCircle2, LayoutDashboard, Sparkles, Timer, AlertTriangle, ZoomIn, ZoomOut, Plus, Minus, Info } from "lucide-react";
import { FactorAI } from "../FactorAI";
import { v0 } from 'v0-sdk';
import { createLogger } from "@/lib/logger";
import { apiClient, toAbsoluteMediaUrl } from "@/lib/api";
import { scopedKey } from "@/lib/teamScope";
const log = createLogger("MockupStation");
// Ensure v0 SDK sees API key/project if it supports runtime config
try {
  const _cfg: any = (v0 as any);
  if (_cfg && typeof _cfg.configure === 'function') {
    _cfg.configure({
      apiKey: (import.meta as any).env?.VITE_V0_API_KEY,
      projectId: (import.meta as any).env?.VITE_V0_PROJECT_ID,
    });
  }
} catch {}

// Function to normalize media URLs using API origin
const getBackendMediaUrl = (mediaPath: string): string => {
  try {
    return toAbsoluteMediaUrl(mediaPath) || '';
  } catch {
    // Fallbacks: pass-through absolute, prefix origin for relative
    const s = String(mediaPath || '');
    if (/^https?:\/\//i.test(s)) return s;
    const origin = (import.meta as any).env?.VITE_API_URL || 'https://api.ivyfactory.io/api';
    // derive origin without trailing /api
    const base = (() => { try { const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return 'https://api.ivyfactory.io'; } })();
    return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
  }
};

// Ensure we don't render duplicate images (e.g., same file saved twice)
const dedupeMockups = (list: Array<any>): Array<any> => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const m of Array.isArray(list) ? list : []) {
    const key = String(m?.url || '').trim().toLowerCase();
    if (!key) { out.push(m); continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
};

interface MockupStationProps {
  ideaCard: any;
  onComplete: (mockups: any) => void;
  onBack: () => void;
  autoGenerate?: boolean;
  forceNewV0?: boolean;
}
export const MockupStation = ({
  ideaCard,
  onComplete,
  onBack,
  autoGenerate = false,
  forceNewV0 = false
}: MockupStationProps) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMockups, setGeneratedMockups] = useState<any[]>([]);
  const [selectedMockups, setSelectedMockups] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [v0DemoUrl, setV0DemoUrl] = useState<string | null>(null);
  const [v0LiveUrl, setV0LiveUrl] = useState<string | null>(null);
  const [v0Phase, setV0Phase] = useState<'intro' | 'generating' | 'preview'>('intro');
  const [showV0LandingScreen, setShowV0LandingScreen] = useState(false);
  const [v0InitialPrompt, setV0InitialPrompt] = useState<string>("");
  const [v0UserMessage, setV0UserMessage] = useState<string>("");
  const [isSendingV0, setIsSendingV0] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<'menu' | 'landing' | 'images' | 'service'>('menu');
  const [serviceDoc, setServiceDoc] = useState<any | null>(null);
  const [serviceSection, setServiceSection] = useState<'flowchart'|'journeys'|'timeline'|'milestones'|'phases'>("flowchart");
  const [journeyZoom, setJourneyZoom] = useState<number>(1.15);
  const [flowZoom, setFlowZoom] = useState<number>(1.0);
  // Flowchart editing state
  const [flowEditMode, setFlowEditMode] = useState<boolean>(false);
  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState<string | null>(null);
  const [selectedFlowEdgeIndex, setSelectedFlowEdgeIndex] = useState<number | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [serviceDocSnapshot, setServiceDocSnapshot] = useState<any | null>(null);
  // Info dialogs for service roadmap/flowchart sections
  const [showServiceFlowIntro, setShowServiceFlowIntro] = useState(false);
  const [showFlowchartInfo, setShowFlowchartInfo] = useState(false);
  const [showJourneysInfo, setShowJourneysInfo] = useState(false);
  const [showTimelineInfo, setShowTimelineInfo] = useState(false);
  const [showMilestonesInfo, setShowMilestonesInfo] = useState(false);
  const [showPhasesInfo, setShowPhasesInfo] = useState(false);
  // Journeys edit mode
  const [journeysEditMode, setJourneysEditMode] = useState<boolean>(false);
  const [timelineEditMode, setTimelineEditMode] = useState<boolean>(false);
  const [milestonesEditMode, setMilestonesEditMode] = useState<boolean>(false);
  const [phasesEditMode, setPhasesEditMode] = useState<boolean>(false);
  // Physical mockup personalization state
  const [editingPrompts, setEditingPrompts] = useState<boolean>(false);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [regenerationRound, setRegenerationRound] = useState<number>(0);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [maxRegenerationReached, setMaxRegenerationReached] = useState<boolean>(false);

  // Build a save payload that always includes current flowchart
  const getRoadmapSaveObject = (): any => {
    const base: any = (serviceDoc as any) || {};
    const rd: any = base.roadmap_data || base;
    const flow = base.service_flowchart || rd?.service_flowchart || {};
    return { ...rd, service_flowchart: flow };
  };

  // Helpers for flow editing
  const mutateFlow = (mutator: (flow: { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] }) => { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] }) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = (prev as any);
      const currentFlow = base.service_flowchart || buildServiceFlowFrom(base.roadmap_data || base);
      const nextFlow = mutator(currentFlow);
      return { ...base, service_flowchart: nextFlow } as any;
    });
  };

  const addFlowNode = () => {
    const id = `node_${Date.now()}`;
    mutateFlow(flow => {
      const lanes = (Array.isArray(flow.lanes) && flow.lanes.length) ? flow.lanes : ['Customer','Frontstage UI','Backstage','Integrations'];
      const lane = lanes[0];
      const node: FlowNode = { id, label: 'New Step', lane, type: 'process' };
      setSelectedFlowNodeId(id);
      return { lanes, nodes: [...(flow.nodes||[]), node], edges: [...(flow.edges||[])] };
    });
  };

  const deleteFlowSelection = () => {
    if (selectedFlowNodeId) {
      const id = selectedFlowNodeId;
      mutateFlow(flow => {
        const nodes = (flow.nodes||[]).filter(n => n.id !== id);
        const edges = (flow.edges||[]).filter(e => e.from !== id && e.to !== id);
        return { lanes: flow.lanes, nodes, edges };
      });
      setSelectedFlowNodeId(null); setSelectedFlowEdgeIndex(null);
      return;
    }
    if (selectedFlowEdgeIndex !== null) {
      const idx = selectedFlowEdgeIndex;
      mutateFlow(flow => {
        const edges = (flow.edges||[]).slice();
        if (idx >=0 && idx < edges.length) edges.splice(idx,1);
        return { lanes: flow.lanes, nodes: flow.nodes, edges };
      });
      setSelectedFlowEdgeIndex(null);
    }
  };

  const renameSelectedNode = (label: string) => {
    if (!selectedFlowNodeId) return;
    mutateFlow(flow => ({ ...flow, nodes: (flow.nodes||[]).map(n => n.id === selectedFlowNodeId ? { ...n, label } : n) }));
  };

  const confirmConnectFromSelection = () => {
    if (!selectedFlowNodeId) return;
    setConnectFrom(selectedFlowNodeId);
  };

  // Journey editors
  const addJourneyStage = (personaIndex: number) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = (prev as any);
      const rd: any = base.roadmap_data || base;
      const personas = Array.isArray(rd?.journey_maps?.personas) ? rd.journey_maps.personas.slice() : [];
      if (!personas[personaIndex]) return prev;
      const stages = Array.isArray(personas[personaIndex].journey_stages) ? personas[personaIndex].journey_stages.slice() : [];
      stages.push({ stage: `New Stage ${stages.length + 1}`, description: '' });
      personas[personaIndex] = { ...personas[personaIndex], journey_stages: stages };
      const newRd = { ...rd, journey_maps: { ...(rd.journey_maps || {}), personas } };
      if (base.roadmap_data) return { ...base, roadmap_data: newRd };
      return newRd;
    });
  };
  const updateJourneyStage = (personaIndex: number, stageIndex: number, patch: any) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = (prev as any);
      const rd: any = base.roadmap_data || base;
      const personas = Array.isArray(rd?.journey_maps?.personas) ? rd.journey_maps.personas.slice() : [];
      if (!personas[personaIndex]) return prev;
      const stages = Array.isArray(personas[personaIndex].journey_stages) ? personas[personaIndex].journey_stages.slice() : [];
      if (!stages[stageIndex]) return prev;
      stages[stageIndex] = { ...(stages[stageIndex] || {}), ...patch };
      personas[personaIndex] = { ...personas[personaIndex], journey_stages: stages };
      const newRd = { ...rd, journey_maps: { ...(rd.journey_maps || {}), personas } };
      if (base.roadmap_data) return { ...base, roadmap_data: newRd };
      return newRd;
    });
  };
  const updateJourneyStageList = (personaIndex: number, stageIndex: number, key: 'activities'|'touchpoints'|'emotions'|'pain_points'|'opportunities', items: string[]) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = (prev as any);
      const rd: any = base.roadmap_data || base;
      const personas = Array.isArray(rd?.journey_maps?.personas) ? rd.journey_maps.personas.slice() : [];
      if (!personas[personaIndex]) return prev;
      const stages = Array.isArray(personas[personaIndex].journey_stages) ? personas[personaIndex].journey_stages.slice() : [];
      if (!stages[stageIndex]) return prev;
      stages[stageIndex] = { ...(stages[stageIndex] || {}), [key]: items };
      personas[personaIndex] = { ...personas[personaIndex], journey_stages: stages };
      const newRd = { ...rd, journey_maps: { ...(rd.journey_maps || {}), personas } };
      if (base.roadmap_data) return { ...base, roadmap_data: newRd };
      return newRd;
    });
  };

  // Timeline editors
  const addTimelinePhase = () => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const tl = { ...(rd.timeline || {}), phases: Array.isArray(rd?.timeline?.phases) ? rd.timeline.phases.slice() : [] };
      tl.phases.push({ phase: `Phase ${tl.phases.length + 1}`, duration: '', activities: [] });
      const newRd = { ...rd, timeline: tl };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updateTimelinePhase = (index: number, patch: any) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const tl = { ...(rd.timeline || {}), phases: Array.isArray(rd?.timeline?.phases) ? rd.timeline.phases.slice() : [] };
      if (!tl.phases[index]) return prev;
      tl.phases[index] = { ...(tl.phases[index] || {}), ...patch };
      const newRd = { ...rd, timeline: tl };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updateTimelinePhaseList = (index: number, key: 'activities'|'deliverables'|'resources', items: string[]) => {
    updateTimelinePhase(index, { [key]: items });
  };

  // Milestones editors
  const addMilestone = () => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const ms = Array.isArray(rd?.milestones) ? rd.milestones.slice() : [];
      ms.push({ title: `Milestone ${ms.length + 1}`, date: '', description: '', success_criteria: [] });
      const newRd = { ...rd, milestones: ms };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updateMilestone = (index: number, patch: any) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const ms = Array.isArray(rd?.milestones) ? rd.milestones.slice() : [];
      if (!ms[index]) return prev;
      ms[index] = { ...(ms[index] || {}), ...patch };
      const newRd = { ...rd, milestones: ms };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updateMilestoneList = (index: number, key: 'success_criteria', items: string[]) => {
    updateMilestone(index, { [key]: items });
  };

  // Detailed phases editors
  const addPhase = () => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const phs = Array.isArray(rd?.phases) ? rd.phases.slice() : [];
      phs.push({ name: `Phase ${phs.length + 1}`, duration: '', activities: [], deliverables: [], resources: [] });
      const newRd = { ...rd, phases: phs };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updatePhase = (index: number, patch: any) => {
    setServiceDoc(prev => {
      if (!prev) return prev;
      const base: any = prev as any;
      const rd: any = base.roadmap_data || base;
      const phs = Array.isArray(rd?.phases) ? rd.phases.slice() : [];
      if (!phs[index]) return prev;
      phs[index] = { ...(phs[index] || {}), ...patch };
      const newRd = { ...rd, phases: phs };
      return base.roadmap_data ? { ...base, roadmap_data: newRd } : newRd;
    });
  };
  const updatePhaseList = (index: number, key: 'activities'|'deliverables'|'resources', items: string[]) => {
    updatePhase(index, { [key]: items });
  };
  const [serviceAutoLoaded, setServiceAutoLoaded] = useState<boolean>(false);
  const [hasV0Chat, setHasV0Chat] = useState<boolean>(() => {
    try { return !!localStorage.getItem(scopedKey('xfactoryV0ChatId')); } catch { return false; }
  });

  // Prefer opening v0 demo in a new tab for hosts that often break iframing
  const canEmbedDemo = (u?: string | null) => {
    if (!u) return false;
    try {
      const host = new URL(u).host.toLowerCase();
      if (host.endsWith('v0.app') || host.endsWith('vusercontent.net')) return false;
      return true;
    } catch { return false; }
  };

  useEffect(() => {
    (async () => {
      try {
        let teamId: number | null = null;
        try {
          const status = await apiClient.get('/team-formation/status/');
          teamId = (status as any)?.data?.current_team?.id || null;
        } catch {}
        if (!teamId) return;
        const existing = await apiClient.getSoftwareMockupTeam(teamId);
        const st = (existing as any)?.status as number | undefined;
        if (st === 404) {
          // Nothing exists yet; stay on menu until user chooses to generate
          return;
        }
        const cid = (existing as any)?.data?.v0_chat_id
          || ((existing as any)?.data?.mockups || []).find((m: any) => m?.v0_chat_id)?.v0_chat_id;
        const latestVid = (existing as any)?.data?.v0_latest_version_id;
        // Prefer top-level saved demo first regardless of chat id
        try {
          const topLevelDemo = (existing as any)?.data?.v0_demo_url as string | undefined;
          if (topLevelDemo) {
            const raw = stripTs(topLevelDemo);
            setV0LiveUrl(raw);
            setV0DemoUrl(cacheBust(raw));
            setV0Phase('preview');
            return;
          }
          const mocks: any[] = Array.isArray((existing as any)?.data?.mockups) ? (existing as any).data.mockups : [];
          const withDemo = mocks.find((m: any) => m?.v0_demo_url);
          const withDemoAlt = mocks.find((m: any) => typeof m?.demo_url === 'string' && m.demo_url);
          const chosen = withDemo?.v0_demo_url || withDemoAlt?.demo_url;
          if (chosen) {
            const raw = stripTs(chosen);
            setV0LiveUrl(raw);
            setV0DemoUrl(cacheBust(raw));
            setV0Phase('preview');
            return;
          }
        } catch {}
        // If chat id exists, attempt latest version fetch and open
        if (cid) {
          try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), String(cid)); } catch {}
          try { setHasV0Chat(true); } catch {}
          try {
            if (latestVid) {
              const v = await (v0 as any).chats.getVersion({ chatId: cid, versionId: latestVid });
              const demo = (v?.demoUrl || v?.webUrl || v?.demo || null) as string | null;
              if (demo) {
                const raw = stripTs(demo);
                setV0LiveUrl(raw);
                setV0DemoUrl(cacheBust(raw));
                setV0Phase('preview');
                return;
              }
            }
          } catch {}
        }
      } catch {}
    })();
  }, []);
  const getMockupType = () => {
    const productType = ideaCard.productType || ideaCard.businessType || ideaCard.business_type || "";
    const pt = String(productType).toLowerCase();
    if (pt.includes("app") || pt.includes("saas") || pt.includes("platform")) {
      return "app";
    } else if (pt.includes("hardware") || pt.includes("iot") || pt.includes("embedded")) {
      return "physical";
    } else {
      return "service";
    }
  };

  const isSoftwareIdea = () => getMockupType() === "app";

  const stripTs = (u?: string | null): string => {
    if (!u) return '';
    try {
      const url = new URL(u);
      url.searchParams.delete('ts');
      const qs = url.searchParams.toString();
      return qs ? url.toString() : `${url.origin}${url.pathname}`;
    } catch {
      return String(u).replace(/([?&])ts=\d+(&|$)/g, (m, p1, p2) => (p2 && p2 !== '&' ? p2 : '')).replace(/[?&]$/, '');
    }
  };

  // Inline SVG flow renderers for service roadmap (flowchart-style)
  const JourneyFlowSVG = ({ stages, zoom = 1 }: { stages: Array<{ stage?: string; activities?: any[]; touchpoints?: any[] }>, zoom?: number }) => {
    const items = Array.isArray(stages) ? stages : [];
    if (!items.length) return null as any;
    const nodeWBase = 220, nodeHBase = 90, gapBase = 40; const padBase = 16;
    const nodeW = nodeWBase; const nodeH = nodeHBase; const gap = gapBase; const pad = padBase;
    const width = items.length * nodeW + (items.length - 1) * gap + pad * 2;
    const height = nodeH + pad * 2 + 8;
    return (
      <div className="w-full overflow-x-auto">
        <div style={{ width: `${Math.max(width * zoom, width)}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }}>
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="#6366f1" />
            </marker>
          </defs>
          {/* Backbone line */}
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" strokeWidth={2} />
          {items.map((s: any, i: number) => {
            const label = String(s?.stage || `Stage ${i + 1}`);
            const x = pad + i * (nodeW + gap); const y = pad;
            const cx = x + nodeW; const cy = y + nodeH / 2; const nx = x + nodeW + gap; const ny = cy;
            const acts = Array.isArray(s?.activities) ? s.activities.slice(0, 2) : [];
            const tps = Array.isArray(s?.touchpoints) ? s.touchpoints.slice(0, 2) : [];
            return (
              <g key={i}>
                <rect x={x} y={y} width={nodeW} height={nodeH} rx={12} ry={12} fill="#ffffff" stroke="#e5e7eb" />
                <rect x={x} y={y} width={nodeW} height={24} rx={12} ry={12} fill="#eef2ff" stroke="#e5e7eb" />
                <text x={x + 10} y={y + 16} fill="#3730a3" fontSize="12" fontWeight={700}>{label}</text>
                {/* quick details */}
                {acts.length > 0 && (
                  <text x={x + 12} y={y + 42} fill="#374151" fontSize="11">â€¢ {String(acts[0])}</text>
                )}
                {tps.length > 0 && (
                  <text x={x + 12} y={y + 58} fill="#6b7280" fontSize="11">@ {String(tps[0])}</text>
                )}
                {/* node connector */}
                <circle cx={x + nodeW / 2} cy={height - pad} r={4} fill="#6366f1" />
                {i < items.length - 1 && (
                  <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#6366f1" strokeWidth={2} markerEnd="url(#arrowHead)" />
                )}
              </g>
            );
          })}
        </svg>
        </div>
      </div>
    );
  };

  const TimelineFlowSVG = ({ phases, milestones }: { phases: Array<{ phase?: string; name?: string }>, milestones?: Array<any> }) => {
    const labels = Array.isArray(phases) ? phases.map((p: any, i: number) => String(p?.phase || p?.name || `Phase ${i + 1}`)) : [];
    if (!labels.length) return null as any;
    const nodeW = 180, nodeH = 64, gap = 36; const pad = 16;
    const width = labels.length * nodeW + (labels.length - 1) * gap + pad * 2;
    const height = nodeH + pad * 2 + 40; // space for milestones
    const ms = Array.isArray(milestones) ? milestones : [];
    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" style={{ maxWidth: '100%' }}>
          <defs>
            <marker id="arrowHead2" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="#0ea5e9" />
            </marker>
          </defs>
          {labels.map((label, i) => {
            const x = pad + i * (nodeW + gap); const y = pad;
            const cx = x + nodeW; const cy = y + nodeH / 2; const nx = x + nodeW + gap; const ny = cy;
            return (
              <g key={i}>
                <rect x={x} y={y} width={nodeW} height={nodeH} rx={10} ry={10} fill="#ffffff" stroke="#e5e7eb" />
                <text x={x + nodeW / 2} y={y + nodeH / 2} dominantBaseline="middle" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight={700}>
                  {label}
                </text>
                {i < labels.length - 1 && (
                  <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0ea5e9" strokeWidth={2} markerEnd="url(#arrowHead2)" />
                )}
              </g>
            );
          })}
          {/* Milestones overlay as diamonds aligned to phase centers */}
          {ms.slice(0, labels.length).map((m: any, i: number) => {
            const x = pad + i * (nodeW + gap) + nodeW / 2; const y = pad + nodeH + 14;
            const size = 10;
            return (
              <g key={`ms-${i}`}>
                <polygon points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`} fill="#10b981" />
                <text x={x} y={y + size + 12} textAnchor="middle" fill="#065f46" fontSize="10">{String(m?.title || m?.name || `M${i + 1}`)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Generic flowchart renderer with swimlanes, nodes, and edges
  type FlowNode = { id: string; label: string; lane?: string; type?: 'start'|'end'|'process'|'decision'|'system'|'subprocess'|'feedback'; x?: number; y?: number };
  type FlowEdge = { from: string; to: string; label?: string };
  const FlowchartSVG = ({ 
    flow, 
    zoom = 1,
    editMode = false,
    selectedNodeId,
    selectedEdgeIndex,
    onSelectNode,
    onSelectEdge,
    onChange,
  }: { 
    flow: { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] }, 
    zoom?: number,
    editMode?: boolean,
    selectedNodeId?: string | null,
    selectedEdgeIndex?: number | null,
    onSelectNode?: (id?: string) => void,
    onSelectEdge?: (index?: number) => void,
    onChange?: (next: { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] }) => void,
  }) => {
    const lanes = (Array.isArray(flow?.lanes) && flow.lanes.length)
      ? flow.lanes
      : Array.from(new Set((flow?.nodes || []).map(n => n.lane || 'Flow')));
    const laneIndex: Record<string, number> = {};
    lanes.forEach((l, i) => laneIndex[l] = i);

    const approxTextWidth = (s: string, size = 12) => Math.max(8, Math.min(280, Math.round(s.length * (size * 0.6))));
    const measureNode = (label: string) => {
      const base = 140;
      const max = 240;
      const w = Math.min(max, Math.max(base, approxTextWidth(label, 12) + 24));
      const h = 54; // a bit taller for readability
      return { w, h };
    };
    const wrapLabel = (label: string, maxChars = 18): string[] => {
      const words = String(label || '').split(/\s+/);
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) {
          if (cur) lines.push(cur);
          cur = w;
        } else {
          cur = (cur ? cur + ' ' : '') + w;
        }
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [label];
    };

    // Drag hooks must be declared before usage below
    const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number; pointerId?: number } | null>(null);
    const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Assign columns by a simple longest-path layering over edges
    const nodes = flow?.nodes || [];
    const edges = flow?.edges || [];
    const idToNode: Record<string, FlowNode> = {};
    nodes.forEach(n => { idToNode[n.id] = n; });
    const incoming: Record<string, number> = {};
    nodes.forEach(n => incoming[n.id] = 0);
    edges.forEach(e => { if (incoming[e.to] !== undefined) incoming[e.to]++; });
    const col: Record<string, number> = {};
    // Start with nodes with no incoming
    const q: string[] = nodes.filter(n => (incoming[n.id] || 0) === 0).map(n => n.id);
    q.forEach(id => { col[id] = 0; });
    // Relax edges a few times (ignore backward/"No" edges to avoid pushing early nodes too far right)
    for (let iter = 0; iter < nodes.length + edges.length; iter++) {
      let changed = false;
      for (const e of edges) {
        const cf = (col[e.from] ?? 0);
        const ct = (col[e.to] ?? 0);
        const lbl = String(e.label || '').toLowerCase();
        const isBackward = ct <= cf; // target not to the right yet
        const isNoLoop = lbl === 'no' || lbl.includes('retry') || lbl.includes('back');
        if (isBackward && (isNoLoop || lbl)) continue; // don't let backward-labelled edges affect layering
        if (ct < cf + 1) { col[e.to] = cf + 1; changed = true; }
      }
      if (!changed) break;
    }
    // Any unassigned nodes get a column after the max
    const maxCol = Math.max(0, ...Object.values(col));
    nodes.forEach(n => { if (col[n.id] === undefined) col[n.id] = maxCol + 1; });

    // Layout constants (more vertical room for readability)
    const laneH = 140; const lanePad = 40; const colW = 180; const gPad = 20;
    const width = (Math.max(...Object.values(col)) + 1) * colW + gPad * 2 + 60;
    const height = lanes.length * laneH + lanePad * 2;

    const xy: Record<string, {x:number,y:number}> = {};
    nodes.forEach(n => {
      // Prefer persisted manual coordinates when present
      const li = laneIndex[n.lane || lanes[0]] || 0;
      const autoX = gPad + 60 + col[n.id] * colW + colW/2;
      const autoY = lanePad + li * laneH + laneH/2;
      // If dragging this node, prefer live drag position
      const x = (dragPos && dragPos.id === n.id) ? dragPos.x : (typeof n.x === 'number' ? n.x : autoX);
      const y = (dragPos && dragPos.id === n.id) ? dragPos.y : (typeof n.y === 'number' ? n.y : autoY);
      xy[n.id] = { x, y };
    });

    const shapeFor = (n: FlowNode, isSelected?: boolean, handlers?: any) => {
      const { x, y } = xy[n.id];
      const { w, h } = measureNode(n.label);
      const type = n.type || 'process';
      const selStroke = isSelected ? '#6366f1' : undefined;
      if (type === 'start' || type === 'end') {
        return <g key={n.id} {...(handlers||{})} style={{ cursor: editMode ? 'move' : 'default' }}>
          <ellipse cx={x} cy={y} rx={w/2} ry={h/2} fill="#fff" stroke="#e5e7eb" />
          {isSelected && <ellipse cx={x} cy={y} rx={w/2+4} ry={h/2+4} fill="none" stroke={selStroke} strokeDasharray="4 3" />}
          {wrapLabel(n.label).map((line, i) => (
            <text key={i} x={x} y={y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="13" fontWeight={700}>{line}</text>
          ))}
        </g>;
      }
      if (type === 'decision') {
        const s = 40;
        return <g key={n.id} {...(handlers||{})} style={{ cursor: editMode ? 'move' : 'default' }}>
          <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`} fill="#fff" stroke="#f59e0b" />
          {isSelected && <polygon points={`${x},${y - (s+4)} ${x + (s+4)},${y} ${x},${y + (s+4)} ${x - (s+4)},${y}`} fill="none" stroke={selStroke} strokeDasharray="4 3" />}
          {wrapLabel(n.label, 16).map((line, i) => (
            <text key={i} x={x} y={y + (i - (wrapLabel(n.label,16).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight={700}>{line}</text>
          ))}
        </g>;
      }
      if (type === 'system' || type === 'subprocess') {
        const skew = 16;
        return <g key={n.id} {...(handlers||{})} style={{ cursor: editMode ? 'move' : 'default' }}>
          <polygon points={`${x - w/2 + skew},${y - h/2} ${x + w/2 + skew},${y - h/2} ${x + w/2 - skew},${y + h/2} ${x - w/2 - skew},${y + h/2}`} fill="#ecfeff" stroke="#06b6d4" />
          {isSelected && <rect x={x - w/2 - 4} y={y - h/2 - 4} width={w + 8} height={h + 8} fill="none" stroke={selStroke} strokeDasharray="4 3" />}
          {wrapLabel(n.label).map((line, i) => (
            <text key={i} x={x} y={y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#0e7490" fontSize="13" fontWeight={700}>{line}</text>
          ))}
        </g>;
      }
      // default: process rectangle
      return <g key={n.id} {...(handlers||{})} style={{ cursor: editMode ? 'move' : 'default' }}>
        <rect x={x - w/2} y={y - h/2} width={w} height={h} rx={8} ry={8} fill="#fff" stroke="#e5e7eb" />
        {isSelected && <rect x={x - w/2 - 4} y={y - h/2 - 4} width={w + 8} height={h + 8} rx={10} ry={10} fill="none" stroke={selStroke} strokeDasharray="4 3" />}
        {wrapLabel(n.label).map((line, i) => (
          <text key={i} x={x} y={y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="13" fontWeight={700}>{line}</text>
        ))}
      </g>;
    };

    // Drag handling (declared earlier above)
    const getPoint = (evt: any) => {
      try {
        const svgEl = svgRef.current as any;
        if (!svgEl) return { x: 0, y: 0 };
        // Prefer precise transform via SVGPoint + getScreenCTM inverse
        const pt = (svgEl as any).createSVGPoint ? (svgEl as any).createSVGPoint() : null;
        if (pt) {
          pt.x = evt.clientX; pt.y = evt.clientY;
          const ctm = svgEl.getScreenCTM();
          if (ctm && typeof ctm.inverse === 'function') {
            const inv = ctm.inverse();
            const sp = pt.matrixTransform(inv);
            return { x: sp.x, y: sp.y };
          }
        }
        // Fallback to DOMMatrix if available
        const rect = svgEl.getBoundingClientRect();
        return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      } catch { return { x: 0, y: 0 }; }
    };

    const handleNodePointerDown = (e: any, n: FlowNode) => {
      e.stopPropagation();
      try { e.preventDefault(); } catch {}
      onSelectEdge?.(undefined);
      onSelectNode?.(n.id);
      if (!editMode) return;
      try { svgRef.current?.setPointerCapture?.(e.pointerId); } catch {}
      const p = getPoint(e);
      const cur = xy[n.id] || { x: n.x || 0, y: n.y || 0 };
      setDragging({ id: n.id, dx: p.x - cur.x, dy: p.y - cur.y, pointerId: e.pointerId });
      setDragPos({ id: n.id, x: cur.x, y: cur.y });
    };

    const handlePointerMove = (e: any) => {
      try { e.preventDefault(); } catch {}
      if (!dragging || !editMode) return;
      const p = getPoint(e);
      const newX = p.x - dragging.dx;
      const newY = p.y - dragging.dy;
      setDragPos({ id: dragging.id, x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (dragging) {
        try { if (dragging.pointerId && svgRef.current?.releasePointerCapture) { svgRef.current.releasePointerCapture(dragging.pointerId); } } catch {}
        if (dragPos && dragPos.id === dragging.id) {
          const next = { ...flow, nodes: (flow.nodes || []).map(n => n.id === dragging.id ? { ...n, x: dragPos.x, y: dragPos.y } : n) };
          onChange?.(next);
        }
        setDragging(null);
        setDragPos(null);
      }
    };

    // Capture dragging even when cursor leaves the SVG
    useEffect(() => {
      if (!dragging) return;
      const mm = (ev: any) => handlePointerMove(ev);
      const mu = () => handlePointerUp();
      window.addEventListener('pointermove', mm);
      window.addEventListener('pointerup', mu);
      return () => {
        window.removeEventListener('pointermove', mm);
        window.removeEventListener('pointerup', mu);
      };
    }, [dragging, editMode]);

    return (
      <div className="w-full overflow-x-auto">
        <div style={{ width: `${Math.max(width * zoom, width)}px` }}>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={() => { onSelectNode?.(undefined); onSelectEdge?.(undefined); }}>
          {/* Swimlanes */}
          {lanes.map((l, i) => (
            <g key={l}>
              <rect x={0} y={lanePad + i * laneH - laneH/2 + laneH/2} width={width} height={laneH} fill={i % 2 === 0 ? '#fafafa' : '#ffffff'} stroke="#f3f4f6" />
              <text x={12} y={lanePad + i * laneH + 18} fill="#6b7280" fontSize="12" fontWeight={700}>{l}</text>
            </g>
          ))}
          {/* Edges */}
          <defs>
            <marker id="arrowFlow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="#9ca3af" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = xy[e.from]; const b = xy[e.to]; if (!a || !b) return null;
            // orthogonal elbow routing for clarity
            const midX = (a.x + b.x) / 2;
            const path = `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
            const isSel = selectedEdgeIndex === i;
            return <g key={`e-${i}`} onClick={(evt) => { evt.stopPropagation(); onSelectNode?.(undefined); onSelectEdge?.(i); }} style={{ cursor: editMode ? 'pointer' : 'default' }}>
              <path d={path} fill="none" stroke={isSel ? '#6366f1' : '#9ca3af'} strokeWidth={isSel ? 3 : 2} markerEnd="url(#arrowFlow)" />
              {e.label && (() => {
                const tx = midX; const ty = (a.y + b.y) / 2 - 6;
                const tw = approxTextWidth(String(e.label), 11) + 8; const th = 14;
                return (
                  <g>
                    <rect x={tx - tw/2} y={ty - th + 4} width={tw} height={th} rx={3} ry={3} fill="#ffffff" opacity={0.9} />
                    <text x={tx} y={ty} textAnchor="middle" fill="#6b7280" fontSize="11">{e.label}</text>
                  </g>
                );
              })()}
            </g>;
          })}
          {/* Nodes */}
          {nodes.map(n => shapeFor(n, selectedNodeId === n.id, { onPointerDown: (e: any) => handleNodePointerDown(e, n), onClick: (e: any) => { e.stopPropagation(); onSelectNode?.(n.id); onSelectEdge?.(undefined); } }))}
        </svg>
        </div>
      </div>
    );
  };

  // Fallback: synthesize a clean swimlane flowchart from roadmap data
  const buildServiceFlowFrom = (rd: any): { lanes: string[]; nodes: FlowNode[]; edges: FlowEdge[] } => {
    const lanes = [
      'Customer',
      'Frontstage UI',
      'Backstage System',
      'External Integrations',
    ];
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    const addNode = (n: FlowNode) => { if (!nodes.find(x => x.id === n.id)) nodes.push(n); };
    const link = (from?: string, to?: string, label?: string) => { if (from && to) edges.push({ from, to, label }); };

    // Entry
    addNode({ id: 'start', type: 'start', lane: 'Customer', label: 'User visits landing page' });
    let last: string | undefined = 'start';

    // Customer/frontstage steps from journey stages (first persona preferred)
    const personas = Array.isArray(rd?.journey_maps?.personas) ? rd.journey_maps.personas : [];
    const stages = personas.length ? (Array.isArray(personas[0]?.journey_stages) ? personas[0].journey_stages : []) : [];
    const stepIds: string[] = [];
    stages.slice(0, 3).forEach((s: any, i: number) => {
      const id = `cust_${i}`;
      addNode({ id, type: 'process', lane: 'Customer', label: String(s?.stage || `Step ${i + 1}`) });
      link(last, id);
      last = id; stepIds.push(id);
    });
    // Decision point after first step (simple validation example)
    if (stepIds.length) {
      addNode({ id: 'decision_valid', type: 'decision', lane: 'Frontstage UI', label: 'Valid input?' });
      link(last, 'decision_valid');
      // Yes path continues; No path loops to first step
      if (stepIds[0]) link('decision_valid', stepIds[0], 'No');
      last = 'decision_valid';
    }

    // Backstage processes from timeline phases activities
    const phases = Array.isArray(rd?.timeline?.phases) ? rd.timeline.phases : [];
    const sysIds: string[] = [];
    phases.slice(0, 2).forEach((ph: any, i: number) => {
      const acts = Array.isArray(ph?.activities) ? ph.activities : [];
      const label = String(acts[0]?.name || acts[0] || ph?.phase || ph?.name || `Phase ${i + 1}`);
      const id = `sys_${i}`;
      addNode({ id, type: 'system', lane: 'Backstage System', label });
      link(last, id, 'Yes');
      last = id; sysIds.push(id);
    });

    // External integrations from milestones/resources/deliverables heuristic
    const integrations: string[] = [];
    const mils = Array.isArray(rd?.milestones) ? rd.milestones : [];
    const pushIfMatch = (s?: string) => {
      const t = (s || '').toLowerCase();
      if (!t) return;
      if (t.includes('email')) integrations.push('Send confirmation email');
      if (t.includes('stripe') || t.includes('payment')) integrations.push('Process payment');
      if (t.includes('crm')) integrations.push('Push to CRM');
      if (t.includes('api') || t.includes('inventory')) integrations.push('Check inventory API');
      if (t.includes('analytics') || t.includes('event')) integrations.push('Log analytics event');
    };
    mils.slice(0, 2).forEach((m: any) => pushIfMatch(m?.title || m?.description));
    phases.slice(0, 2).forEach((ph: any) => {
      (Array.isArray(ph?.resources) ? ph.resources : []).forEach((r: any) => pushIfMatch(String(r)));
      (Array.isArray(ph?.deliverables) ? ph.deliverables : []).forEach((d: any) => pushIfMatch(String(d)));
    });
    const extSet = Array.from(new Set(integrations)).slice(0, 3);
    extSet.forEach((label, i) => {
      const id = `ext_${i}`;
      addNode({ id, type: 'subprocess', lane: 'External Integrations', label });
      link(last, id);
      last = id;
    });

    // Feedback and end
    addNode({ id: 'feedback', type: 'feedback', lane: 'Frontstage UI', label: 'Display order confirmation' });
    link(last, 'feedback');
    addNode({ id: 'end', type: 'end', lane: 'Customer', label: 'Service delivered' });
    link('feedback', 'end');

    return { lanes, nodes, edges };
  };
  const cacheBust = (u?: string | null): string => {
    const raw = stripTs(u || '');
    if (!raw) return '';
    return raw + (raw.includes('?') ? '&' : '?') + 'ts=' + Date.now();
  };

  const getIdeaId = (): number | null => {
    try {
      const teamIdScoped = localStorage.getItem('xfactoryTeamId');
      const scopedKey = teamIdScoped ? `xfactoryIdeaId_${teamIdScoped}` : 'xfactoryIdeaId';
      const scopedIdStr = localStorage.getItem(scopedKey);
      return scopedIdStr ? Number(scopedIdStr) : null;
    } catch { return null; }
  };

  const resolveTeamIdeaId = async (): Promise<number | null> => {
    try {
      const { apiClient } = await import("@/lib/api");
      // Ensure we have a current team id
      let teamIdStr = localStorage.getItem('xfactoryTeamId');
      if (!teamIdStr) {
        const status = await apiClient.get('/team-formation/status/');
        const tid = (status as any)?.data?.current_team?.id;
        if (!tid) return null;
        teamIdStr = String(tid);
        try { localStorage.setItem('xfactoryTeamId', teamIdStr); } catch {}
      }
      const teamId = Number(teamIdStr);
      // Try to fetch latest idea id for this team without generating
      let ideaId: number | undefined = undefined;
      try {
        const latest = await apiClient.getTeamLatestIdeaId(teamId);
        ideaId = (latest as any)?.data?.id;
      } catch {}
      // If none exists, as a fallback create via PST upsert
      if (!ideaId) {
        const pstRes = await apiClient.upsertTeamProblemSolution(teamId);
        ideaId = (pstRes as any)?.data?.id as number | undefined;
      }
      if (ideaId) {
        try {
          const key = teamId ? `xfactoryIdeaId_${teamId}` : 'xfactoryIdeaId';
          localStorage.setItem(key, String(ideaId));
        } catch {}
        return ideaId;
      }
      return null;
    } catch { return null; }
  };

  const v0ApiKey = (import.meta as any).env?.VITE_V0_API_KEY as string | undefined;
  const v0ProjectId = (import.meta as any).env?.VITE_V0_PROJECT_ID as string | undefined;
  const v0ApiKeyFallback = (import.meta as any).env?.V0_API_KEY as string | undefined;
  const v0ProjectIdFallback = (import.meta as any).env?.V0_PROJECT_ID as string | undefined;
  const effectiveV0ApiKey = v0ApiKey || v0ApiKeyFallback;
  const effectiveV0ProjectId = v0ProjectId || v0ProjectIdFallback;

  const createOrResumeV0Chat = async (forceNew = false) => {
    log.info("createOrResumeV0Chat:start", { forceNew });
    let ideaId = getIdeaId();
    if ((!ideaId) && effectiveV0ProjectId) {
      ideaId = await resolveTeamIdeaId();
    }
    if (!ideaId || !effectiveV0ProjectId) return null;
    // Try to load existing chat metadata from backend and reuse v0 project id if present
    let projectIdToUse: string | undefined = effectiveV0ProjectId;
    if (!forceNew) {
      // First, try localStorage chat id and verify with v0
      try {
        const lsChatId = localStorage.getItem(scopedKey('xfactoryV0ChatId'));
        const lsProjectId = localStorage.getItem(scopedKey('xfactoryV0ProjectId')) || undefined;
        if (lsChatId) {
          try {
            const chat = await v0.chats.getById({ chatId: lsChatId });
            const verifiedProject = (chat as any)?.projectId || lsProjectId || projectIdToUse;
            projectIdToUse = typeof verifiedProject === 'string' ? verifiedProject : projectIdToUse;
            // Persist verified chat to backend metadata for durability
            try {
              // Prefer team-scoped save
              let teamIdForSave: number | null = null;
              try { const status = await apiClient.get('/team-formation/status/'); teamIdForSave = (status as any)?.data?.current_team?.id || null; } catch {}
              if (teamIdForSave) {
                await apiClient.createSoftwareMockupTeam(teamIdForSave, {
                v0_project_id: projectIdToUse,
                v0_chat_id: lsChatId,
                v0_latest_version_id: (chat as any)?.latestVersion?.id,
                status: 'draft'
                });
              } else {
                log.warn('createOrResumeV0Chat: no team; skip persisting chat metadata');
              }
              log.info('createOrResumeV0Chat:ls-chat-resumed', { chatId: lsChatId });
            } catch (e) { log.warn('createOrResumeV0Chat:ls-chat-save-failed', e); }
            try { setHasV0Chat(true); } catch {}
            return { chatId: lsChatId, existing: true, projectId: projectIdToUse } as any;
          } catch (e) {
            log.warn('createOrResumeV0Chat:ls-chat-invalid', e);
          }
        }
      } catch {}
    }
    if (!forceNew) {
      try {
        const { apiClient } = await import("@/lib/api");
        let existing: any = null;
        try {
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id as number | undefined;
          if (teamId) {
            existing = await apiClient.getSoftwareMockupTeam(teamId);
          }
        } catch {}
        // No fallback to idea-scoped fetch; software mockups are team-scoped
        const existingChatId = existing?.data?.mockups?.find((m: any) => m.v0_chat_id)?.v0_chat_id || existing?.data?.mockups?.[0]?.v0_chat_id;
        const existingProjectId = existing?.data?.mockups?.find((m: any) => m.v0_project_id)?.v0_project_id || existing?.data?.v0_project_id;
        if (existingProjectId && typeof existingProjectId === 'string') {
          projectIdToUse = existingProjectId;
        }
        log.debug("createOrResumeV0Chat:existing", { existingChatId, existingProjectId: projectIdToUse });
        if (existingChatId) {
          try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), existingChatId); } catch {}
          try { localStorage.setItem(scopedKey('xfactoryV0ProjectId'), String(projectIdToUse || '')); } catch {}
          return { chatId: existingChatId, existing: true, projectId: projectIdToUse } as any;
        }
      } catch (e) { log.warn("createOrResumeV0Chat:load-existing-failed", e); }
    }

    // Build prompt from idea data
    let problem = '', solution = '', target = '', name = ideaCard?.title || 'Landing Page';
    let opps: string[] = [];
    let probs: string[] = [];
    try {
      const { apiClient } = await import("@/lib/api");
      const ideaIdNum = ideaId as number;
      // Prefer team-scoped brainstorming first
      try {
        const status = await apiClient.get('/team-formation/status/');
        const teamId = (status as any)?.data?.current_team?.id as number | undefined;
        if (teamId) {
          let teamBs = await apiClient.getTeamBrainstorming(teamId);
          if (!(teamBs?.status >= 200 && teamBs.status < 300 && (teamBs as any).data)) {
            try { await apiClient.generateTeamBrainstorming(teamId); } catch {}
            try { teamBs = await apiClient.getTeamBrainstorming(teamId); } catch {}
          }
          const tbd: any = teamBs?.data;
          if (Array.isArray(tbd?.opportunity_statements)) {
            opps = tbd.opportunity_statements.map((s: any) => String(s)).filter(Boolean);
          }
          if (Array.isArray(tbd?.user_problems)) {
            probs = tbd.user_problems.map((s: any) => String(s)).filter(Boolean);
          }
          log.debug("createOrResumeV0Chat:team-brainstorm", { oppsLen: opps.length, probsLen: probs.length });
        }
      } catch (e) { log.warn("createOrResumeV0Chat:team-brainstorm-failed", e); }

      // Prefer team-scoped concept card for core fields
      try {
        const statusCC = await apiClient.get('/team-formation/status/');
        const teamIdCC = (statusCC as any)?.data?.current_team?.id as number | undefined;
        if (teamIdCC) {
          try {
            const cc = await apiClient.getTeamConceptCard(teamIdCC);
            const ccd: any = cc?.data || {};
            if (!problem) problem = ccd.ai_problem || ccd.problem || ccd.problem_statement || '';
            if (!solution) solution = ccd.ai_solution || ccd.solution || ccd.solution_overview || '';
            if (!target) target = ccd.ai_target_audience || ccd.target_audience || '';
            if (ccd.title || ccd.output_name) name = ccd.title || ccd.output_name || name;
          } catch {}
        }
      } catch {}

      // Fallback to team-scoped Problem/Solution/Target if still missing
      if (!problem || !solution || !target) {
        try {
          const statusPS = await apiClient.get('/team-formation/status/');
          const teamIdPS = (statusPS as any)?.data?.current_team?.id as number | undefined;
          if (teamIdPS) {
            try {
              let pst = await apiClient.getTeamProblemSolution(teamIdPS);
              let psd: any = pst?.data || {};
              log.debug("PST fallback: initial", { hasData: !!pst?.data, psd });
              // If missing core fields, try to upsert/seed PST and refetch
              const missingCore = !(psd?.problem || psd?.input_problem || psd?.ai_problem) || !(psd?.solution || psd?.input_solution || psd?.ai_solution) || !(psd?.target || psd?.input_target_audience || psd?.ai_target_audience);
              if (missingCore) {
                try {
                  await apiClient.upsertTeamProblemSolution(teamIdPS);
                  pst = await apiClient.getTeamProblemSolution(teamIdPS);
                  psd = pst?.data || {};
                  log.debug("PST fallback: after upsert", { psd });
                } catch {}
              }
              // Prefer backend PST keys first
              if (!problem) problem = psd.problem || psd.input_problem || psd.ai_problem || '';
              if (!solution) solution = psd.solution || psd.input_solution || psd.ai_solution || '';
              if (!target) target = psd.target || psd.input_target_audience || psd.ai_target_audience || '';
              if (!name && (psd.output_name || psd.title || psd.product_name)) name = psd.output_name || psd.title || psd.product_name;
            } catch {}
          }
        } catch {}
      }

      // Final fallback to passed-in ideaCard/PST
      try {
        if (!problem) problem = ideaCard?.problem || ideaCard?.problem_statement || '';
        if (!solution) solution = ideaCard?.solution || ideaCard?.solution_overview || '';
        if (!target) target = ideaCard?.target || ideaCard?.target_audience || '';
        if (!name && (ideaCard?.productName || ideaCard?.title)) name = ideaCard?.productName || ideaCard?.title;
      } catch {}
      // Use local brainstorming next
      try {
        const rawOpps = localStorage.getItem('xfactoryBrainstormOpportunities');
        if (rawOpps && opps.length === 0) {
          const arr = JSON.parse(rawOpps);
          if (Array.isArray(arr)) opps = arr.map((x: any) => (typeof x === 'string' ? x : (x?.title || '')).trim()).filter(Boolean);
        }
        const rawProbs = localStorage.getItem('xfactoryBrainstormUserProblems');
        if (rawProbs && probs.length === 0) {
          const arr = JSON.parse(rawProbs);
          if (Array.isArray(arr)) probs = arr.map((x: any) => (typeof x === 'string' ? x : (x?.title || '')).trim()).filter(Boolean);
        }
        log.debug("createOrResumeV0Chat:local-brainstorm", { oppsLen: opps.length, probsLen: probs.length });
      } catch (e) { log.warn("createOrResumeV0Chat:local-brainstorm-failed", e); }
      // Fallback to idea-id brainstorming only if still missing
      if (opps.length === 0 || probs.length === 0) {
        try {
          const bs = await apiClient.getBrainstormingAssistant(ideaIdNum);
          const bo = bs?.data?.opportunity_statements || [
            bs?.data?.opportunity_statement_1,
            bs?.data?.opportunity_statement_2,
            bs?.data?.opportunity_statement_3,
            bs?.data?.opportunity_statement_4,
            bs?.data?.opportunity_statement_5,
          ].filter(Boolean);
          const bp = bs?.data?.user_problems || [
            bs?.data?.user_problem_1,
            bs?.data?.user_problem_2,
            bs?.data?.user_problem_3,
            bs?.data?.user_problem_4,
            bs?.data?.user_problem_5,
          ].filter(Boolean);
          if (Array.isArray(bo) && opps.length === 0) opps = bo.map((s: any) => String(s)).filter(Boolean);
          if (Array.isArray(bp) && probs.length === 0) probs = bp.map((s: any) => String(s)).filter(Boolean);
          log.debug("createOrResumeV0Chat:idea-brainstorm", { oppsLen: opps.length, probsLen: probs.length });
        } catch (e) { log.warn("createOrResumeV0Chat:idea-brainstorm-failed", e); }
      }
    } catch (e) { log.warn("createOrResumeV0Chat:ai-fetch-failed", e); }

    const oppsLine = opps.length ? opps.join('; ') : '';
    const probsLine = probs.length ? probs.join('; ') : '';

    // Final safety defaults so prompt always has core fields
    if (!problem && probs.length) problem = String(probs[0]);
    if (!solution && problem) solution = `An AI-powered solution to address: ${problem}`;
    if (!target) target = 'Early adopters in the target audience';

    // Enrich prompt with concept card references including current solutions, business model, and assumptions if available
    let currentSolutions = '';
    let assumptionsLine = '';
    let businessModel = String(ideaCard?.ai_business_model || ideaCard?.businessModel || ideaCard?.business_model || '').trim();
    try {
      const teamStatus = await apiClient.get('/team-formation/status/');
      const teamId = (teamStatus as any)?.data?.current_team?.id as number | undefined;
      if (teamId) {
        try {
          const cc = await apiClient.getTeamConceptCard(teamId);
          const ccd: any = cc?.data || {};
          currentSolutions = ccd.current_solutions || '';
          if (!businessModel) businessModel = String(ccd.business_model || '').trim();
          const assumptionsArr = Array.isArray(ccd.assumptions) ? ccd.assumptions : [];
          if (assumptionsArr.length) {
            assumptionsLine = assumptionsArr.map((a: any) => (a?.text || a)).filter(Boolean).slice(0,3).join('; ');
          }
        } catch {}
      }
    } catch {}
    const message = `make a landing page for the following website:
name: ${name}
problem: ${problem}
solution: ${solution}
target audience: ${target}
business model: ${businessModel}
current solutions: ${currentSolutions}
key assumptions: ${assumptionsLine}
market opportunities: ${oppsLine}
user problems: ${probsLine}`;
    log.info("createOrResumeV0Chat:prompt-ready", { name, hasProblem: !!problem, hasSolution: !!solution, hasTarget: !!target, opps: opps.length, probs: probs.length });
    try { setV0InitialPrompt(message); } catch {}

    // Create chat using v0 SDK
    if (!effectiveV0ApiKey) throw new Error('Missing V0 API key');
    log.debug("createOrResumeV0Chat:v0-create", { projectIdToUse });
    const chat = await v0.chats.create({
      system: 'You are a helpful assistant that builds production-quality landing pages with React/Next and Tailwind. Output assets and structure as needed.',
      message,
      projectId: projectIdToUse
    });
    log.info("createOrResumeV0Chat:v0-created", { chatId: chat?.id });
    try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), chat?.id || ''); } catch {}
    try { localStorage.setItem(scopedKey('xfactoryV0ProjectId'), String(projectIdToUse || '')); } catch {}

    // Save chat metadata in backend
    try {
      const { apiClient } = await import("@/lib/api");
      log.debug("createOrResumeV0Chat:save-metadata");
      // Prefer team-scoped save
      let teamIdForSave: number | null = null;
      try { const status = await apiClient.get('/team-formation/status/'); teamIdForSave = (status as any)?.data?.current_team?.id || null; } catch {}
      if (teamIdForSave) {
        await apiClient.createSoftwareMockupTeam(teamIdForSave, {
          v0_prompt: message,
          v0_project_id: projectIdToUse,
          v0_chat_id: chat.id,
          v0_latest_version_id: (chat as any)?.latestVersion?.id,
          status: 'draft'
        });
      } else {
        log.warn('createOrResumeV0Chat: no team for save; skipping');
      }
      try { setHasV0Chat(true); } catch {}
      log.info("createOrResumeV0Chat:saved");
    } catch (e) { log.warn("createOrResumeV0Chat:save-metadata-failed", e); }

    return { chatId: chat.id, existing: false, projectId: projectIdToUse } as any;
  };

  // When user switches to Service view, try to fetch existing; on 404 or empty, generate.
  useEffect(() => {
    (async () => {
      if (selectionMode !== 'service') return;
      if (serviceDoc || isGenerating || serviceAutoLoaded) return;
      setServiceAutoLoaded(true);
      setIsGenerating(true);
      try {
        // Team-scoped only for service roadmap
        let teamId: number | null = null;
        try {
          const cached = localStorage.getItem('xfactoryTeamId');
          teamId = cached ? Number(cached) : null;
          if (!teamId) {
            const status = await apiClient.get('/team-formation/status/');
            teamId = (status as any)?.data?.current_team?.id || null;
            if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
          }
        } catch {}
        if (!teamId) return;
        // Fetch existing first
        let chosen: any = null;
        try {
          const existing = await apiClient.getServiceRoadmapTeam(teamId);
          const data = (existing as any)?.data || {};
          const list: any[] = Array.isArray(data?.roadmaps) ? data.roadmaps : [];
          if (list.length > 0) {
            chosen = list.slice().sort((a: any, b: any) => {
              const au = new Date(a?.updated_at || a?.created_at || 0).getTime();
              const bu = new Date(b?.updated_at || b?.created_at || 0).getTime();
              return bu - au;
            })[0];
          }
        } catch {}
        if (chosen) {
          setServiceDoc(chosen);
          setStep(2);
        } else {
          const res = await apiClient.generateServiceRoadmapTeam(teamId);
          const data = (res.data as any);
          setServiceDoc(data?.roadmap_data || data?.roadmap || data);
          setStep(2);
        }
      } catch (e) { log.error('service auto-fetch/generate failed', e); }
      finally { setIsGenerating(false); }
    })();
  }, [selectionMode]);

  const sendV0Message = async (chatId: string, followup: string) => {
    log.debug("sendV0Message", { chatId, followupLen: followup?.length });
    return v0.chats.sendMessage({
      chatId,
      message: followup
    });
  };

  const pollV0ForDemo = async (chatId: string, maxWaitMs = 20000) => {
    log.info("pollV0ForDemo:start", { chatId, maxWaitMs });
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        const chat = await v0.chats.getById({ chatId });
        const demo = chat?.latestVersion?.demoUrl || chat?.webUrl || chat?.demo;
        if (demo) {
          log.info("pollV0ForDemo:found", { demo });
          return demo;
        }
      } catch (e) { log.warn("pollV0ForDemo:error", e); }
      await new Promise(r => setTimeout(r, 1200));
    }
    log.warn("pollV0ForDemo:timeout");
    return null;
  };

  const handleSendV0Instruction = async () => {
    if (!v0UserMessage.trim()) return;
    setIsSendingV0(true);
    try {
      let chatId: string | null = null;
      try { chatId = localStorage.getItem(scopedKey('xfactoryV0ChatId')); } catch {}
      if (!chatId) {
        log.error('handleSendV0Instruction:no-chat-id');
        setIsSendingV0(false);
        return;
      }
      // Per v0 API: send edit message, wait until latest version completes, then use the NEW demoUrl
      let versionId: string | undefined;
      try {
        const chat = await v0.chats.sendMessage({ chatId, message: v0UserMessage.trim() });
        versionId = (chat as any)?.latestVersion?.id;
      } catch (e) { log.warn('handleSendV0Instruction:sendMessage-failed', e as any); }
      // Poll version if available; otherwise fall back to getById polling
      if (versionId) {
        const start = Date.now();
        while (Date.now() - start < 30000) {
          try {
            const v = await (v0 as any).chats.getVersion({ chatId, versionId });
            if (v?.status === 'completed') break;
            if (v?.status === 'failed') { log.warn('v0 version failed'); break; }
          } catch (e) { /* ignore and continue polling */ }
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      // Get latest chat and pick latest demoUrl
      let demoUrl: string | null = null;
      try {
        const latest = await v0.chats.getById({ chatId });
        demoUrl = (latest as any)?.latestVersion?.demoUrl || (latest as any)?.webUrl || (latest as any)?.demo || null;
      } catch (e) { log.warn('handleSendV0Instruction:getById-failed', e as any); }
      // If still not available, fallback to existing polling helper
      if (!demoUrl) demoUrl = await pollV0ForDemo(chatId, 30000);
      if (demoUrl) {
        setV0LiveUrl(stripTs(demoUrl));
        setV0DemoUrl(cacheBust(demoUrl));
        try {
          const ideaId = getIdeaId();
          // Prefer team-scoped persistence only
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id as number | undefined;
            if (teamId) {
              await apiClient.createSoftwareMockupTeam(teamId, {
                v0_demo_url: stripTs(demoUrl || ''),
                v0_project_id: localStorage.getItem(scopedKey('xfactoryV0ProjectId')) || undefined,
                v0_chat_id: chatId,
                v0_latest_version_id: (versionId || (await (async () => { try { const latest = await v0.chats.getById({ chatId }); return (latest as any)?.latestVersion?.id; } catch { return undefined; } })())),
                status: 'completed'
              });
            } else {
              log.warn('handleSendV0Instruction: no team; skipping demo save');
            }
          } catch {}
        } catch (e) { log.warn('handleSendV0Instruction:save-demo-failed', e as any); }
      }
      setV0UserMessage('');
    } catch (e) {
      log.error('handleSendV0Instruction:error', e);
    } finally {
      setIsSendingV0(false);
    }
  };

  const generateV0Landing = async (forceNew = false): Promise<any|null> => {
    try {
      // Allow landing generation for any idea type if v0 is configured
      if (!effectiveV0ApiKey || !effectiveV0ProjectId) { log.error("generateV0Landing:missing-config"); return null; }
      log.info("generateV0Landing:start", { forceNew });
      // Try team-scoped backend chat id first and existing demo
      let preExistingChatId: string | null = null;
      let preExistingProjectId: string | null = null;
      try {
        const ideaId = getIdeaId();
        let existing: any = null;
        // Prefer team-scoped fetch
        try {
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id as number | undefined;
          if (teamId) {
            existing = await apiClient.getSoftwareMockupTeam(teamId);
          }
        } catch {}
        // No fallback to idea-scoped fetch; software mockups are team-scoped
        if (existing) {
          const cid = (existing as any)?.data?.v0_chat_id;
          const latestVid = (existing as any)?.data?.v0_latest_version_id;
          const pid = (existing as any)?.data?.v0_project_id;
          if (cid && typeof cid === 'string') preExistingChatId = cid;
          if (pid && typeof pid === 'string') preExistingProjectId = pid;
          // Prefer explicitly saved latest version id first
          if (cid && latestVid) {
            try {
              const v = await (v0 as any).chats.getVersion({ chatId: cid, versionId: latestVid });
              const vDemo = v?.demoUrl || v?.webUrl || v?.demo;
              if (vDemo) {
                try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), preExistingChatId || ''); } catch {}
                try { localStorage.setItem(scopedKey('xfactoryV0ProjectId'), preExistingProjectId || effectiveV0ProjectId || ''); } catch {}
                const clean = stripTs(vDemo);
                setV0LiveUrl(clean);
                setV0DemoUrl(cacheBust(clean));
                setV0Phase('preview');
                return {
                  id: `v0_landing_${Date.now()}`,
                  type: "Landing Page (v0)",
                  title: `${ideaCard.productName || ideaCard.title || 'Landing Page'} (v0)` ,
                  url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
                  liveUrl: vDemo,
                  description: "Live demo from saved version"
                };
              }
            } catch {}
          }
          // If any mockup has a demo url, reuse it immediately
          const mocks: any[] = Array.isArray((existing as any)?.data?.mockups) ? (existing as any).data.mockups : [];
          const topLevelDemo = (existing as any)?.data?.v0_demo_url as string | undefined;
          if (topLevelDemo) {
            try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), preExistingChatId || ''); } catch {}
            try { localStorage.setItem(scopedKey('xfactoryV0ProjectId'), preExistingProjectId || effectiveV0ProjectId || ''); } catch {}
            {
              const raw = stripTs(topLevelDemo);
              setV0LiveUrl(raw);
              setV0DemoUrl(cacheBust(raw));
            }
            setV0Phase('preview');
            return {
              id: `v0_landing_${Date.now()}`,
              type: "Landing Page (v0)",
              title: `${ideaCard.productName || ideaCard.title || 'Landing Page'} (v0)`,
              url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
              liveUrl: topLevelDemo,
              description: "Live demo loaded from existing software mockup"
            } as any;
          }
          const withDemo = mocks.find((m: any) => m?.v0_demo_url);
          if (withDemo?.v0_demo_url) {
            try { localStorage.setItem(scopedKey('xfactoryV0ChatId'), preExistingChatId || ''); } catch {}
            try { localStorage.setItem(scopedKey('xfactoryV0ProjectId'), preExistingProjectId || effectiveV0ProjectId || ''); } catch {}
            {
              const raw = stripTs(withDemo.v0_demo_url);
              setV0LiveUrl(raw);
              setV0DemoUrl(cacheBust(raw));
            }
            setV0Phase('preview');
            return {
              id: `v0_landing_${Date.now()}`,
              type: "Landing Page (v0)",
              title: `${ideaCard.productName || ideaCard.title || 'Landing Page'} (v0)`,
              url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
              liveUrl: withDemo.v0_demo_url,
              description: "Live demo loaded from existing software mockup"
            };
          }
        }
      } catch {}

      const session: any = preExistingChatId
        ? { chatId: preExistingChatId, existing: true, projectId: localStorage.getItem(scopedKey('xfactoryV0ProjectId')) || preExistingProjectId || effectiveV0ProjectId }
        : await createOrResumeV0Chat(forceNew);
      if (!session?.chatId) { log.error("generateV0Landing:no-chat"); return null; }
      // If we resumed an existing chat, try to show its demo immediately
      let demoUrl: string | null = null;
      if (session?.existing) {
        try {
          const chat = await v0.chats.getById({ chatId: session.chatId });
          demoUrl = chat?.latestVersion?.demoUrl || chat?.webUrl || chat?.demo || null;
        } catch (e) { log.warn('generateV0Landing:existing-getById-failed', e); }
      }
      if (!demoUrl) {
        // Optionally send a tiny nudge message to refine only when creating new or no demo found
        await sendV0Message(session.chatId, 'Ensure the landing page includes hero, features, pricing, and CTA.');
        demoUrl = await pollV0ForDemo(session.chatId);
      }

      // Save demo URL back to backend
      try {
        const { apiClient } = await import("@/lib/api");
        const ideaId = getIdeaId();
        if (demoUrl) {
          log.debug("generateV0Landing:save-demo", { ideaId, demoUrl });
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id as number | undefined;
            if (teamId) {
              await apiClient.createSoftwareMockupTeam(teamId, {
                v0_demo_url: stripTs(demoUrl || ''),
                v0_project_id: preExistingProjectId || effectiveV0ProjectId,
                v0_chat_id: session.chatId,
                v0_latest_version_id: (await (async () => { try { const latest = await v0.chats.getById({ chatId: session.chatId }); return (latest as any)?.latestVersion?.id; } catch { return undefined; } })()),
                status: 'completed'
              });
            } else {
              log.warn('generateV0Landing: no team; skipping demo save');
            }
            log.info("generateV0Landing:saved-demo");
          } catch (e) { log.warn("generateV0Landing:save-team-demo-failed", e); }
        }
      } catch (e) { log.warn("generateV0Landing:save-demo-failed", e); }

      if (demoUrl) {
        log.info("generateV0Landing:success", { demoUrl });
        try { localStorage.setItem(scopedKey('xfactoryStationCompleted_2'), 'true'); } catch {}
        return {
          id: `v0_landing_${Date.now()}`,
          type: "Landing Page (v0)",
          title: `${ideaCard.productName || ideaCard.title || 'Landing Page'} (v0)` ,
          url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
          liveUrl: demoUrl,
          description: "Live demo generated by v0"
        };
      }
      log.warn("generateV0Landing:no-demo-url");
      return null;
    } catch (e) { log.error("generateV0Landing:error", e); return null; }
  };

  // Try to open an existing landing first; if missing, generate it
  const openOrGenerateLanding = async (forceNew = false) => {
    try {
      setShowV0LandingScreen(true);
      setV0Phase('generating');
      // Prefer team-scoped retrieval
      let teamId: number | null = null;
      try {
        const status = await apiClient.get('/team-formation/status/');
        teamId = (status as any)?.data?.current_team?.id || null;
      } catch {}
      if (teamId) {
        try {
          const existing = await apiClient.getSoftwareMockupTeam(teamId);
          const ok = (existing as any)?.status >= 200 && (existing as any)?.status < 300;
          const notFound = (existing as any)?.status === 404;
          const data: any = ok ? (existing as any)?.data || {} : {};
          const topLevelDemo = typeof data?.v0_demo_url === 'string' && data.v0_demo_url ? data.v0_demo_url : undefined;
          const mocks: any[] = Array.isArray(data?.mockups) ? data.mockups : [];
          const withDemo = mocks.find((m: any) => m?.v0_demo_url);
          const withDemoAlt = mocks.find((m: any) => typeof m?.demo_url === 'string' && m.demo_url);
          // If we have a chat id, prefer the latest version from V0 API
          const cid: string | undefined = (data?.v0_chat_id as string | undefined)
            || (mocks.find((m: any) => m?.v0_chat_id)?.v0_chat_id as string | undefined);
          const latestVid: string | undefined = data?.v0_latest_version_id as string | undefined;
          if (cid && latestVid) {
            try {
              const v = await (v0 as any).chats.getVersion({ chatId: cid, versionId: latestVid });
              const vDemo = v?.demoUrl || v?.webUrl || v?.demo;
              if (vDemo) {
                const raw = stripTs(vDemo);
                setV0LiveUrl(raw);
                setV0DemoUrl(cacheBust(raw));
                setV0Phase('preview');
                return;
              }
            } catch {}
          }
          if (cid && !latestVid) {
            try {
              const latest = await (v0 as any).chats.getById({ chatId: cid });
              const vDemo = latest?.latestVersion?.demoUrl || latest?.webUrl || latest?.demo;
              if (vDemo) {
                const raw = stripTs(vDemo);
                setV0LiveUrl(raw);
                setV0DemoUrl(cacheBust(raw));
                setV0Phase('preview');
                return;
              }
            } catch {}
          }
          const demo = topLevelDemo || withDemo?.v0_demo_url || withDemoAlt?.demo_url || null;
          if (demo) {
            const raw = stripTs(demo);
            setV0LiveUrl(raw);
            setV0DemoUrl(cacheBust(raw));
            setV0Phase('preview');
            return;
          }
          if (notFound) {
            // Generate a fresh landing using team-scoped concept card
            const landing = await generateV0Landing(forceNew);
            if (landing?.liveUrl) {
              const raw = stripTs(landing.liveUrl);
              setV0LiveUrl(raw);
            setV0DemoUrl(cacheBust(raw));
              setV0Phase('preview');
              return;
            }
          }
        } catch {}
      }
      // If nothing found, generate team-scoped landing
      const landing = await generateV0Landing(forceNew);
      if (landing?.liveUrl) {
        const raw = stripTs(landing.liveUrl);
        setV0LiveUrl(raw);
        setV0DemoUrl(cacheBust(raw));
        setV0Phase('preview');
        return;
      }
    } catch {
      setV0Phase('intro');
    }
  };

  // New software flow: dashboard-focused prompt and preview embed
  const generateV0Dashboard = async (forceNew = false) => {
    log.info("generateV0Dashboard:start", { forceNew });
    setV0Phase('generating');
    try {
      if (!isSoftwareIdea() || !effectiveV0ApiKey || !effectiveV0ProjectId) {
        log.error("generateV0Dashboard:invalid-state", { isSoftware: isSoftwareIdea(), hasKey: !!effectiveV0ApiKey, hasProject: !!effectiveV0ProjectId });
        setV0Phase('intro');
        return;
      }
      const session = await createOrResumeV0Chat(forceNew);
      if (!session?.chatId) {
        log.error("generateV0Dashboard:no-chat");
        setV0Phase('intro');
        return;
      }

      // Stronger dashboard prompt (uses idea fields prepared earlier by createOrResumeV0Chat)
      await sendV0Message(session.chatId, 'Create a complete SaaS-style dashboard in Next.js/React/Tailwind with navigation, overview KPIs, feature modules, and a clear CTA.');
      const demoUrl = await pollV0ForDemo(session.chatId, 30000);

      // Save demo URL back to backend and update UI
      try {
        const { apiClient } = await import("@/lib/api");
        const ideaId = getIdeaId();
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (demoUrl) {
          log.debug("generateV0Dashboard:save-demo", { ideaId, teamId, demoUrl });
          const payload = {
            title: 'V0 Dashboard',
            description: 'Generated via V0 platform',
            v0_prompt: 'Dashboard generation',
            v0_project_id: effectiveV0ProjectId,
            v0_chat_id: session.chatId,
            v0_demo_url: demoUrl,
            status: 'completed'
          };
          if (teamId) {
            await apiClient.createSoftwareMockupTeam(teamId, payload);
          } else {
            log.warn('generateV0Dashboard: no team; skipping demo save');
          }
          log.info("generateV0Dashboard:saved-demo");
        }
      } catch (e) { log.warn("generateV0Dashboard:save-demo-failed", e); }

      if (demoUrl) {
        log.info("generateV0Dashboard:success", { demoUrl });
        {
          const raw = stripTs(demoUrl);
          setV0LiveUrl(raw);
          setV0DemoUrl(cacheBust(raw));
        }
        setV0Phase('preview');
        return;
      }
      log.warn("generateV0Dashboard:no-demo-url");
      setV0Phase('intro');
    } catch (e) {
      log.error("generateV0Dashboard:error", e);
      setV0Phase('intro');
    }
  };

  const generateMockups = async () => {
    log.info("generateMockups:start", { type: getMockupType() });
    setIsGenerating(true);

    const mockupType = getMockupType();
    
    // For software ideas, redirect to v0 flow instead of static mockups
    if (mockupType === "app") {
      log.info("generateMockups:software-idea-redirect-to-v0");
      setIsGenerating(false);
      setV0Phase('intro');
      return;
    }

    // Simulate AI mockup generation (fallbacks)
    await new Promise(resolve => setTimeout(resolve, 1500));
    let mockups: any[] = [];

    // Landing page mockup (static fallback)
    const landingPageMockup = {
      id: "landing_page_1",
      type: "Landing Page",
      title: `${ideaCard.productName || ideaCard.productType || ideaCard.title || 'Concept'} Landing Page`,
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      description: `Hero section, features, pricing, and CTA`
    };

    if (mockupType === "physical") {
      log.debug("generateMockups:physical");
      mockups = [landingPageMockup, {
        id: "product_render_1",
        type: "3D Render",
        title: "Product Design Concept",
        url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop",
        description: "Initial product form factor and design language"
      }, {
        id: "usage_scenario_1",
        type: "Usage Context",
        title: "In-Use Visualization",
        url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop",
        description: "Product being used in target environment"
      }];
    } else {
      log.debug("generateMockups:service-like");
      // Service/Consulting/Education ideas get more appropriate mockups
      mockups = [landingPageMockup, {
        id: "process_flow_1",
        type: "Process Flow",
        title: "Service Delivery Process",
        url: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=600&fit=crop",
        description: "Step-by-step service workflow and touchpoints"
      }, {
        id: "brand_concept_1",
        type: "Brand Identity",
        title: "Professional Brand Direction",
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop",
        description: "Logo concepts, color palette, and professional branding"
      }, {
        id: "customer_journey_1",
        type: "Customer Journey",
        title: "Client Experience Map",
        url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
        description: "End-to-end client interaction and satisfaction points"
      }];
    }

    setGeneratedMockups(mockups);
    setIsGenerating(false);
    log.info("generateMockups:done", { count: mockups.length });
    setStep(2);
  };
  const handleMockupSelect = (mockupId: string) => {
    log.info("handleMockupSelect", { mockupId });
    const mock = generatedMockups.find(m => m.id === mockupId);
    const isLanding = mock && (String(mock.type).toLowerCase().includes('landing') || String(mock.title).toLowerCase().includes('landing'));
    if (isLanding) {
      log.info("handleMockupSelect:landing-selected");
      // Trigger v0 landing generation regardless of idea type
      // Open the dedicated V0 landing screen and show loading until ready
      setShowV0LandingScreen(true);
      setV0Phase('generating');
      openOrGenerateLanding(forceNewV0).catch((e) => { log.error("handleMockupSelect:error", e); setV0Phase('intro'); });
      return;
    }
    setSelectedMockups(prev => prev.includes(mockupId) ? prev.filter(id => id !== mockupId) : [...prev, mockupId]);
  };
  const completeMockupStation = () => {
    // Require a generated landing page before allowing completion
    if (!v0DemoUrl) {
      return;
    }
    const selectedMockupData = generatedMockups.length && selectedMockups.length === 0
      ? generatedMockups
      : generatedMockups.filter(m => selectedMockups.includes(m.id));
    onComplete({
      mockups: selectedMockupData,
      productType: ideaCard.productType,
      generatedAt: new Date().toISOString()
    });
    try { localStorage.setItem(scopedKey('xfactoryStationCompleted_2'), 'true'); } catch {}
  };

  const returnToMainMenu = () => {
    // Individual mockup completions just return to main menu, don't complete station
    setSelectionMode('menu');
    setStep(1);
  };
  const mockupType = getMockupType();

  // Auto-run generation when requested by preflight from dashboard
  useEffect(() => {
    // Show menu first; generation is triggered explicitly by user actions
  }, [autoGenerate, step, v0Phase]);

  if (showV0LandingScreen) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="border-b border-border bg-gradient-warning/60">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowV0LandingScreen(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <span className="text-sm text-muted-foreground">V0 Landing</span>
            </div>
            {(v0LiveUrl || v0DemoUrl) && (
              <a href={(v0LiveUrl || v0DemoUrl)!} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border">
                <ExternalLink className="h-4 w-4" /> Open Live
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
          {v0Phase === 'generating' && (
            <Card className="shadow-machinery">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Generating your landingâ€¦</CardTitle>
                <CardDescription>We're creating a v0 chat and building your landing page. This can take a few moments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-2 bg-muted rounded">
                  <div className="h-2 bg-primary rounded animate-pulse" style={{ width: '66%' }} />
                </div>
              </CardContent>
            </Card>
          )}

          {v0Phase === 'preview' && (
            <Card className="shadow-machinery">
              <CardHeader>
                <CardTitle>Landing Preview (v0)</CardTitle>
                <CardDescription>Interact with the live preview below or open it in a new tab.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {v0InitialPrompt && (
                  <div className="p-3 bg-muted/50 rounded border text-xs">
                    <div className="font-semibold mb-1">Initial Prompt</div>
                    <div className="whitespace-pre-wrap break-words">{v0InitialPrompt}</div>
                  </div>
                )}
                {v0DemoUrl ? (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <iframe src={v0DemoUrl!} width="100%" height="100%" style={{ minHeight: 520 }} />
                    </div>
                    {/* Send follow-up instruction to v0 */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={v0UserMessage}
                        onChange={(e) => setV0UserMessage(e.target.value)}
                        placeholder="Type an instruction for v0 (e.g., Add dark mode)"
                        className="flex-1 px-3 py-2 border rounded bg-background text-foreground"
                      />
                      <Button variant="warning" onClick={handleSendV0Instruction} disabled={isSendingV0}>
                        {isSendingV0 ? 'Applyingâ€¦' : 'Apply Change'}
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <a href={(v0LiveUrl || v0DemoUrl)!} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border">
                        <ExternalLink className="h-4 w-4" /> Open Live
                      </a>
                      <Button variant="warning" onClick={() => { setShowV0LandingScreen(false); setSelectionMode('menu'); setV0Phase('intro'); }}>
                        Back to Menu
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No demo URL available yet. Try regenerating.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-warning">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Image className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-accent-foreground">Auto Mockup Station</h1>
                <p className="text-sm text-accent-foreground/80">Visual assets to validate and showcase your idea</p>
              </div>
            </div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Factory
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Mockup Generation</h2>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Factory
            </Button>
          </div>
          <Progress value={isSoftwareIdea() ? (v0Phase === 'preview' ? 100 : (v0Phase === 'generating' ? 66 : 33)) : (step / 2 * 100)} className="h-2" />
        </div>

        {/* Menu: Choose what to generate */}
        {selectionMode === 'menu' && (
          <Card className="shadow-machinery">
            <CardHeader>
              <CardTitle>Mockups we can generate</CardTitle>
              <CardDescription>Select one to continue. You can come back and generate others.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 h-96">
                {/* Landing Page - Top Half */}
                <Card className="col-span-2 p-6 border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex flex-col h-full justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">Landing Page</Badge>
                        <Badge variant="secondary">Mandatory</Badge>
                      </div>
                      <div className="text-lg font-semibold">Interactive Demo Powered by v0</div>
                      <div className="text-sm text-muted-foreground">
                        Create a professional landing page with hero section, features, pricing, and clear call-to-action.
                      </div>
                    </div>
                    <Button
                      variant="warning"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setShowV0LandingScreen(true);
                        setV0Phase('generating');
                        openOrGenerateLanding(forceNewV0).catch(() => setV0Phase('intro'));
                      }}
                    >
                      Generate Landing Page
                    </Button>
                  </div>
                </Card>
                <Card className="p-4 border-dashed">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Product Images</Badge>
                      <Badge variant="secondary">Optional</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Highâ€‘quality visuals for your product</div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={async () => {
                        setSelectionMode('images');
                        setIsGenerating(true);
                        try {
                          // Prefer team-scoped endpoints
                          let teamId: number | null = null;
                          try {
                            const cached = localStorage.getItem('xfactoryTeamId');
                            teamId = cached ? Number(cached) : null;
                            if (!teamId) {
                              const status = await apiClient.get('/team-formation/status/');
                              teamId = (status as any)?.data?.current_team?.id || null;
                              if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
                            }
                          } catch {}
                          if (teamId) {
                            // Load existing saved physical mockups (team-scoped)
                            try {
                              const existing = await apiClient.getPhysicalMockupsTeam(teamId);
                              const savedRaw = (existing?.data?.mockups || []).map((m: any, idx: number) => ({ 
                                id: `phys_${m.id || idx}`, 
                                type: 'Product Mockup', 
                                title: m.title, 
                                url: getBackendMediaUrl(m.image_url || m.url), // Normalize to absolute URL
                                description: m.description, 
                                prompt: m.image_prompt 
                              }));
                              const saved = dedupeMockups(savedRaw);
                              if (saved.length > 0) {
                                setGeneratedMockups(saved);
                                setStep(2);
                                return;
                              }
                            } catch {}
                            // 1) Create prompts (team)
                            const p = await apiClient.generatePhysicalPromptsTeam(teamId);
                            const prompts = (p.data as any)?.prompts || [];
                            const initialPrompt = (p.data as any)?.prompt || '';
                            // 2) Generate images in parallel (team)
                            const tasks = prompts.slice(0,3).map((pr: any, i: number) => apiClient.generateDalleMockupTeam(teamId!, {
                              image_prompt: pr?.image_prompt || '',
                              title: pr?.title || `Product Image ${i+1}`,
                              description: pr?.description || 'Generated product concept image',
                              size: '1024x1024'
                            }));
                            const results = await Promise.allSettled(tasks);
                            const items = dedupeMockups(results
                              .map((r, i) => r.status === 'fulfilled' ? (r.value.data as any)?.mockup : null)
                              .filter(Boolean)
                              .map((m: any, idx: number) => ({ 
                                id: `phys_${m.id || idx}`, 
                                type: 'Product Mockup', 
                                title: m.title, 
                                url: getBackendMediaUrl(m.image_url || m.url), // Normalize to absolute URL
                                description: m.description, 
                                prompt: m.image_prompt 
                              }))
                            );
                            setGeneratedMockups(items);
                            if (initialPrompt) {
                              try { localStorage.setItem('xfactoryPhysicalInitialPrompt', initialPrompt); } catch {}
                            }
                            setStep(2);
                            return;
                          }
                          // Fallback: if team ID is not available, wait until team exists rather than using idea-scoped endpoints
                          log.warn('No team available; skipping idea-scoped physical mockup flow');
                        } catch (e) { log.error('image generation failed', e); }
                        finally { setIsGenerating(false); }
                      }}
                    >
                      Generate Images
                    </Button>
                  </div>
                </Card>
                <Card className="p-4 border-dashed">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Service Flowchart</Badge>
                      <Badge variant="secondary">Optional</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-1" onClick={() => setShowServiceFlowIntro(true)}>
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">Customer experience & delivery map</div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        // Switch to service flow view and ensure v0 screen is hidden
                        setSelectionMode('service');
                        try { setShowV0LandingScreen(false); } catch {}
                        try { setServiceDoc(null); } catch {}
                        setIsGenerating(true);
                        try {
                          // Team-scoped only for service roadmap
                          let teamId: number | null = null;
                          try {
                            const cached = localStorage.getItem('xfactoryTeamId');
                            teamId = cached ? Number(cached) : null;
                            if (!teamId) {
                              const status = await apiClient.get('/team-formation/status/');
                              teamId = (status as any)?.data?.current_team?.id || null;
                              if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
                            }
                          } catch {}
                          if (!teamId) { log.warn('No team available; skipping service roadmap'); return; }
                          // Try to fetch existing first (team-scoped GET returns { success, roadmaps: [...] })
                          let chosen: any = null;
                          try {
                            const existing = await apiClient.getServiceRoadmapTeam(teamId);
                            const data = (existing as any)?.data || {};
                            const list: any[] = Array.isArray(data?.roadmaps) ? data.roadmaps : [];
                            if (list.length > 0) {
                              // Pick latest by updated_at or created_at
                              chosen = list.slice().sort((a: any, b: any) => {
                                const au = new Date(a?.updated_at || a?.created_at || 0).getTime();
                                const bu = new Date(b?.updated_at || b?.created_at || 0).getTime();
                                return bu - au;
                              })[0];
                            }
                          } catch {}
                          if (chosen) {
                            setServiceDoc(chosen);
                            setStep(2);
                          } else {
                            const res = await apiClient.generateServiceRoadmapTeam(teamId);
                            const data = (res.data as any);
                            setServiceDoc(data?.roadmap_data || data?.roadmap || data);
                            setStep(2);
                          }
                        } catch (e) { log.error('service flow generation failed', e); }
                        finally { setIsGenerating(false); }
                      }}
                    >
                      Generate Flowchart
                    </Button>
                  </div>
                </Card>
              </div>
              <div className="mt-6">
                <SubmitGate
                  enabled={!!hasV0Chat || !!v0DemoUrl}
                  onSubmit={async () => {
                    try {
                      let teamId: number | null = null;
                      try {
                        const status = await apiClient.get('/team-formation/status/');
                        teamId = (status as any)?.data?.current_team?.id || null;
                      } catch {}
                      if (teamId) {
                        try {
                          const existing = await apiClient.getSoftwareMockupTeam(teamId);
                          const v0_chat_id = (existing as any)?.data?.v0_chat_id
                            || localStorage.getItem(scopedKey('xfactoryV0ChatId')) || undefined;
                          const v0_project_id = (existing as any)?.data?.v0_project_id
                            || localStorage.getItem(scopedKey('xfactoryV0ProjectId')) || undefined;
                          const demoUrl = ((existing as any)?.data?.mockups || []).find((m: any) => m?.v0_demo_url)?.v0_demo_url
                            || (existing as any)?.data?.v0_demo_url
                            || v0DemoUrl
                            || undefined;
                          await apiClient.createSoftwareMockupTeam(teamId, {
                            v0_project_id,
                            v0_chat_id,
                            v0_demo_url: demoUrl,
                            status: 'completed'
                          });
                        } catch {}
                        try { await apiClient.markMockupCompleted(teamId); } catch {}
                      }
                    } catch (e) { log.warn('submit mockups failed', e); }
                    completeMockupStation();
                  }}
                  label="Submit Mockups"
                />
              </div>
              
              {/* Important Message */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <div className="font-semibold text-lg">Important: Landing Page Required</div>
                </div>
                <p className="text-amber-700 mt-2 text-sm">
                  You must create a landing page before you can unlock the next section. The landing page is essential for validating your concept with potential users.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* v0 Flow (software ideas by default or when explicitly triggered by Landing Page click) */}
        {selectionMode === 'landing' && (
          <div className="space-y-6">
            {/* Intro/Plan */}
            {v0Phase === 'intro' && (
              <Card className="shadow-machinery overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-warning/10 px-6 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">What we'll build</div>
                    <div className="text-sm text-muted-foreground">A landing page powered by v0</div>
                  </div>
                </div>
                <CardContent className="space-y-5 pt-6">
                  <p className="text-sm text-muted-foreground">
                    We'll create a landing page with a hero, features, pricing and a clear CTA, reflecting your idea's name, problem, solution, target audience, market opportunities, and user problems.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Hero & CTA' },
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Features & benefits' },
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Pricing section' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-3 py-2">
                        {f.icon}
                        <span>{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Uses v0 to generate a live interactive preview
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setSelectionMode('menu')}>Back</Button>
                    <Button variant="warning" size="lg" onClick={() => {
                      setShowV0LandingScreen(true);
                      setV0Phase('generating');
                      openOrGenerateLanding(forceNewV0).catch(() => setV0Phase('intro'));
                    }} className="w-full sm:w-auto">
                      Generate Landing Page
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  </div>
                  {/* Submission happens only via main menu; remove duplicate button here */}
                </CardContent>
              </Card>
            )}

            {/* Generating */}
            {v0Phase === 'generating' && (
              <Card className="shadow-machinery">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">Generating your landingâ€¦</CardTitle>
                  <CardDescription>We're creating a v0 chat and building your landing page. This can take a few moments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded animate-pulse" style={{ width: '66%' }} />
                  </div>
                  <div className="pt-4 text-center">
                    <Button variant="outline" onClick={() => setSelectionMode('menu')}>Back</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {v0Phase === 'preview' && (
              <Card className="shadow-machinery">
                <CardHeader>
                  <CardTitle>Landing Preview (v0)</CardTitle>
                  <CardDescription>Interact with the live preview below or open it in a new tab.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {v0InitialPrompt && (
                    <div className="p-3 bg-muted/50 rounded border text-xs">
                      <div className="font-semibold mb-1">Initial Prompt</div>
                      <div className="whitespace-pre-wrap break-words">{v0InitialPrompt}</div>
                    </div>
                  )}
                  {v0DemoUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <iframe src={v0DemoUrl} width="100%" height="100%" style={{ minHeight: 420 }} />
                      </div>
                      {/* Send follow-up instruction to v0 */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={v0UserMessage}
                          onChange={(e) => setV0UserMessage(e.target.value)}
                          placeholder="Type an instruction for v0 (e.g., Add dark mode)"
                          className="flex-1 px-3 py-2 border rounded bg-background text-foreground"
                        />
                        <Button variant="warning" onClick={handleSendV0Instruction} disabled={isSendingV0}>
                          {isSendingV0 ? 'Applyingâ€¦' : 'Apply Change'}
                        </Button>
                      </div>
                      <div className="flex gap-3">
                        <a href={v0DemoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border">
                          <ExternalLink className="h-4 w-4" /> Open Live
                        </a>
                        <Button variant="warning" onClick={async () => {
                          try {
                            const ideaId = getIdeaId();
                            if (ideaId && v0DemoUrl) {
                              let v0ChatId: string | null = null;
                              try { v0ChatId = localStorage.getItem(scopedKey('xfactoryV0ChatId')); } catch {}
                              try {
                                const status = await apiClient.get('/team-formation/status/');
                                const teamId = (status as any)?.data?.current_team?.id as number | undefined;
                                if (teamId) {
                                  await apiClient.createSoftwareMockupTeam(teamId, {
                                    v0_demo_url: v0DemoUrl,
                                    v0_project_id: effectiveV0ProjectId,
                                    v0_chat_id: v0ChatId || undefined,
                                    status: 'completed'
                                  });
                                } else {
                                  log.warn('save software mockup: no team; skipping');
                                }
                              } catch {}
                              // Mark team MVP/mockup completion
                              try {
                                const status = await apiClient.get('/team-formation/status/');
                                const teamId = status.data?.current_team?.id;
                                if (teamId) await apiClient.markMockupCompleted(teamId);
                              } catch {}
                            }
                          } catch (e) { log.warn('save software mockup failed', e); }
                          returnToMainMenu();
                        }}>
                          Use this Mockup
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => setSelectionMode('menu')}>Back</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No demo URL available yet. Try regenerating.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Product Images Flow */}
        {selectionMode === 'images' && (
          <>
            {step === 2 && <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-warning/10 px-6 py-4 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Image className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-base font-semibold">What we'll generate</div>
                      <div className="text-xs text-muted-foreground">Three product image variations</div>
                      </div>
                      </div>
                  <div className="grid sm:grid-cols-3 gap-3 mt-3">
                    {[
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: '3 concept images' },
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Different angles/styles' },
                      { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Highâ€‘resolution previews' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-3 py-2">
                        {f.icon}
                        <span>{f.label}</span>
                      </div>
                    ))}
                    </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                    <CardDescription>
                      Three concept variations generated to showcase your product
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isGenerating && (
                      <div className="w-full p-12 flex flex-col items-center justify-center text-center">
                        <div className="relative w-24 h-24 mb-4">
                          <div className="absolute inset-0 rounded-full border-4 border-muted" />
                          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <div className="w-full h-2 bg-muted rounded overflow-hidden mb-3 max-w-md">
                          <div className="h-2 bg-primary rounded animate-pulse" style={{ width: '66%' }} />
                        </div>
                        <div className="text-sm text-muted-foreground">Generating imagesâ€¦ this can take a moment.</div>
                      </div>
                    )}
                    {!isGenerating && (
                      <div className="flex gap-6 overflow-x-auto py-1">
                        {generatedMockups.map(mockup => (
                          <Card key={mockup.id} className={`transition-all hover:shadow-machinery shrink-0`} style={{ width: 300 }} onClick={() => handleMockupSelect(mockup.id)}>
                            <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                              {mockup.url ? (
                                <img 
                                  src={mockup.url} 
                                  alt={mockup.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Image failed to load:', mockup.url, e);
                                    // Fallback to placeholder if image fails to load
                                    const imgElement = e.target as HTMLImageElement;
                                    imgElement.style.display = 'none';
                                    const parent = imgElement.parentElement;
                                    if (parent) {
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'w-full h-full flex items-center justify-center text-muted-foreground';
                                      placeholder.innerHTML = `
                                        <div class="text-center">
                                          <svg class="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                          </svg>
                                          <div class="text-sm">Image failed to load</div>
                                          <div class="text-xs">URL: ${mockup.url}</div>
                                        </div>
                                      `;
                                      parent.appendChild(placeholder);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <div className="text-center">
                                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <div className="text-sm">No image URL</div>
                                  </div>
                                </div>
                              )}
                              {mockup.liveUrl && (
                                <a href={mockup.liveUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                                    View Live <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="w-fit text-xs">{mockup.type}</Badge>
                                {mockup.regeneration_round > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Round {mockup.regeneration_round}
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg">{mockup.title}</CardTitle>
                            </CardHeader>
                            
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground">
                                {mockup.description}
                              </p>
                              {mockup.prompt && (
                                <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                  <div className="font-semibold mb-1 flex items-center justify-between">
                                    <span>Image Prompt</span>
                                    {editingPrompts && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          const newPrompts = { ...editedPrompts };
                                          delete newPrompts[mockup.id];
                                          setEditedPrompts(newPrompts);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                  {editingPrompts ? (
                                    <textarea
                                      className="w-full h-20 text-xs bg-background border rounded p-2 resize-none"
                                      value={editedPrompts[mockup.id] || mockup.prompt}
                                      onChange={(e) => {
                                        setEditedPrompts(prev => ({
                                          ...prev,
                                          [mockup.id]: e.target.value
                                        }));
                                      }}
                                      placeholder="Edit the image prompt..."
                                    />
                                  ) : (
                                    <div className="whitespace-pre-wrap break-words">{mockup.prompt}</div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 mt-8">
                      <Button variant="outline" onClick={() => setSelectionMode('menu')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      
                      {/* Prompt editing and regeneration controls */}
                      <div className="flex gap-2">
                        {!editingPrompts ? (
                          <Button 
                            variant="secondary" 
                            onClick={() => {
                              setEditingPrompts(true);
                              // Initialize edited prompts with current prompts
                              const initialPrompts: Record<string, string> = {};
                              generatedMockups.forEach(mockup => {
                                if (mockup.prompt) {
                                  initialPrompts[mockup.id] = mockup.prompt;
                                }
                              });
                              setEditedPrompts(initialPrompts);
                            }}
                          >
                            <Palette className="mr-2 h-4 w-4" />
                            Edit Prompts
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="secondary" 
                              onClick={async () => {
                                try {
                                  const teamId = localStorage.getItem('xfactoryTeamId');
                                  if (!teamId) return;
                                  
                                  const editedPromptsList = Object.entries(editedPrompts).map(([mockupId, prompt]) => ({
                                    mockup_id: mockupId,
                                    user_edited_prompt: prompt
                                  }));
                                  
                                  await apiClient.post(`/ideation/teams/${teamId}/physical-mockup/edit-prompts/`, {
                                    team_id: Number(teamId),
                                    edited_prompts: editedPromptsList
                                  });
                                  
                                  setEditingPrompts(false);
                                  // Update the mockups with edited prompts
                                  setGeneratedMockups(prev => prev.map(mockup => ({
                                    ...mockup,
                                    prompt: editedPrompts[mockup.id] || mockup.prompt
                                  })));
                                } catch (error) {
                                  console.error('Failed to save edited prompts:', error);
                                }
                              }}
                            >
                              Save Prompts
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setEditingPrompts(false);
                                setEditedPrompts({});
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        
                        {/* Regeneration button */}
                        <Button 
                          variant="warning" 
                          disabled={isRegenerating || maxRegenerationReached || regenerationRound >= 3}
                          onClick={async () => {
                            try {
                              setIsRegenerating(true);
                              const teamId = localStorage.getItem('xfactoryTeamId');
                              if (!teamId) return;
                              
                              // First save any edited prompts
                              if (editingPrompts && Object.keys(editedPrompts).length > 0) {
                                const editedPromptsList = Object.entries(editedPrompts).map(([mockupId, prompt]) => ({
                                  mockup_id: mockupId,
                                  user_edited_prompt: prompt
                                }));
                                
                                await apiClient.post(`/ideation/teams/${teamId}/physical-mockup/edit-prompts/`, {
                                  team_id: Number(teamId),
                                  edited_prompts: editedPromptsList
                                });
                              }
                              
                              // Regenerate images
                              const response = await apiClient.post(`/ideation/teams/${teamId}/physical-mockup/regenerate/`, {
                                team_id: Number(teamId)
                              });
                              
                              if (response.data?.success) {
                                const newMockups = response.data.new_mockups.map((m: any, idx: number) => ({
                                  id: `phys_${m.id || idx}`,
                                  type: 'Product Mockup',
                                  title: m.title,
                                  url: getBackendMediaUrl(m.image_url || m.url),
                                  description: m.description,
                                  prompt: m.image_prompt,
                                  regeneration_round: m.regeneration_round
                                }));
                                
                                setGeneratedMockups(newMockups);
                                setRegenerationRound(response.data.regeneration_round);
                                setEditingPrompts(false);
                                setEditedPrompts({});
                              } else if (response.data?.max_rounds_reached) {
                                setMaxRegenerationReached(true);
                              }
                            } catch (error) {
                              console.error('Failed to regenerate images:', error);
                            } finally {
                              setIsRegenerating(false);
                            }
                          }}
                        >
                          {isRegenerating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <Zap className="mr-2 h-4 w-4" />
                              Regenerate All ({regenerationRound}/3)
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <Button variant="warning" onClick={async () => {
                        // Save selected images as PhysicalMockup records
                        try {
                          // Prefer team-scoped save
                          let teamId: number | null = null;
                          try {
                            const cached = localStorage.getItem('xfactoryTeamId');
                            teamId = cached ? Number(cached) : null;
                          } catch {}
                          const selected = dedupeMockups(
                            (generatedMockups.length && selectedMockups.length === 0
                              ? generatedMockups
                              : generatedMockups.filter(m => selectedMockups.includes(m.id)))
                          );
                          if (teamId) {
                            for (const m of selected) {
                              if (m.url) {
                                await apiClient.savePhysicalMockupTeam(teamId, {
                                  image_url: m.url,
                                  image_prompt: m.prompt || '',
                                  title: m.title || 'Product Mockup',
                                  description: m.description || ''
                                });
                              }
                            }
                            try {
                              const status = await apiClient.get('/team-formation/status/');
                              const tid = status.data?.current_team?.id;
                              if (tid) await apiClient.markMockupCompleted(tid);
                            } catch {}
                          } else {
                            // Fallback: idea scope
                            const ideaId = getIdeaId();
                            if (ideaId) {
                              for (const m of selected) {
                                if (m.url) {
                                  await apiClient.post('/ideation/physical-mockup/save/', {
                                    idea_id: ideaId,
                                    image_url: m.url,
                                    image_prompt: m.prompt || '',
                                    title: m.title || 'Product Mockup',
                                    description: m.description || ''
                                  });
                                }
                              }
                              try {
                                const status = await apiClient.get('/team-formation/status/');
                                const tid = status.data?.current_team?.id;
                                if (tid) await apiClient.markMockupCompleted(tid);
                              } catch {}
                            }
                          }
                        } catch (e) { log.warn('save physical mockups failed', e); }
                        // Return to mockup main menu without advancing the flow
                        returnToMainMenu();
                      }} className="flex-1">
                        Use These Images
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>}
          </>
        )}

        {/* Service Flowchart Flow */}
        {selectionMode === 'service' && (
          <Card className="shadow-machinery">
            <CardHeader>
              <CardTitle>Service Experience Flowchart</CardTitle>
              <CardDescription>Solarâ€‘pro2 generated service delivery flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-warning/10 px-6 py-4 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-base font-semibold">What we'll generate</div>
                    <div className="text-xs text-muted-foreground">Personas, journey stages, timeline & milestones</div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  {[
                    { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Customer personas' },
                    { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Journey stages & touchpoints' },
                    { icon: <CheckCircle2 className='h-4 w-4 text-emerald-600' />, label: 'Timeline & milestones' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-3 py-2">
                      {f.icon}
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {isGenerating && (
                <div className="w-full">
                  <div className="w-full h-2 bg-muted rounded mt-2">
                    <div className="h-2 bg-primary rounded animate-pulse" style={{ width: '66%' }} />
                  </div>
                </div>
              )}
              {isGenerating && (
                <div className="text-sm text-muted-foreground">Generating flowâ€¦ this can take a moment.</div>
              )}
              {!isGenerating && serviceDoc && (
            <div className="space-y-6">
                {/* Section toggles + zoom */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'flowchart', label: 'Flowchart' },
                    { key: 'journeys', label: 'Journeys' },
                    { key: 'timeline', label: 'Timeline' },
                    { key: 'milestones', label: 'Milestones' },
                    { key: 'phases', label: 'Phases' },
                  ].map((t: any) => (
                    <Button key={t.key} size="sm" variant={serviceSection === (t.key as any) ? 'default' : 'outline'} onClick={() => setServiceSection(t.key as any)}>
                      {t.label}
                    </Button>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => {
                      if (serviceSection === 'flowchart') setFlowZoom(z => Math.max(0.6, Math.round((z - 0.1) * 100) / 100));
                      else setJourneyZoom(z => Math.max(0.6, Math.round((z - 0.1) * 100) / 100));
                    }}><Minus className="h-4 w-4" /></Button>
                    <div className="text-xs w-12 text-center select-none">
                      {Math.round(100 * (serviceSection === 'flowchart' ? flowZoom : journeyZoom))}%
                    </div>
                    <Button size="icon" variant="outline" onClick={() => {
                      if (serviceSection === 'flowchart') setFlowZoom(z => Math.min(2, Math.round((z + 0.1) * 100) / 100));
                      else setJourneyZoom(z => Math.min(2, Math.round((z + 0.1) * 100) / 100));
                    }}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                  {(() => {
                    const rd: any = (serviceDoc as any)?.roadmap_data || (serviceDoc as any);
                    const flow = (serviceDoc as any)?.service_flowchart;
                    const effective = (flow && Array.isArray(flow?.nodes) && Array.isArray(flow?.edges))
                      ? flow
                      : buildServiceFlowFrom(rd);
                    if (serviceSection !== 'flowchart') return null as any;
                    return (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <CardTitle className="text-base">Service Flowchart</CardTitle>
                              <CardDescription>Customer, Frontstage, Backstage, Integrations</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowFlowchartInfo(true)}>
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant={flowEditMode ? 'default' : 'outline'} onClick={() => {
                                if (!flowEditMode) { try { setServiceDocSnapshot(serviceDoc); } catch {} }
                                setFlowEditMode(v => !v);
                              }}>{flowEditMode ? 'Editing' : 'Edit Flow'}</Button>
                              {flowEditMode && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => addFlowNode()}>+ Node</Button>
                                  <Button size="sm" variant="outline" disabled={!selectedFlowNodeId} onClick={() => confirmConnectFromSelection()}>
                                    {connectFrom ? 'Connecting…' : 'Connect from Selection'}
                                  </Button>
                                  {/* Delete removed per UX request */}
                                  <Button size="sm" variant="default" onClick={async () => {
                                    try {
                                      let teamId: number | null = null;
                                      try { const status = await apiClient.get('/team-formation/status/'); teamId = (status as any)?.data?.current_team?.id || null; } catch {}
                                      if (teamId && serviceDoc) {
                                        await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject());
                                      }
                                      setServiceDocSnapshot(null);
                                      setFlowEditMode(false);
                                    } catch {}
                                  }}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => { if (serviceDocSnapshot) setServiceDoc(serviceDocSnapshot); setServiceDocSnapshot(null); setFlowEditMode(false); setSelectedFlowNodeId(null); setSelectedFlowEdgeIndex(null); setConnectFrom(null); }}>Discard</Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {flowEditMode && selectedFlowNodeId && (
                            <div className="mb-3 flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">Rename selected:</div>
                              <input className="px-2 py-1 border rounded text-sm bg-background text-foreground" value={(effective.nodes||[]).find((n:any)=>n.id===selectedFlowNodeId)?.label || ''} onChange={(e)=> renameSelectedNode(e.target.value)} />
                              {connectFrom && <div className="text-xs text-warning ml-2">Click another node to connect</div>}
                            </div>
                          )}
                          <FlowchartSVG 
                            flow={effective} 
                            zoom={flowZoom} 
                            editMode={flowEditMode}
                            selectedNodeId={selectedFlowNodeId}
                            selectedEdgeIndex={selectedFlowEdgeIndex}
                            onSelectNode={(id?: string) => {
                              if (connectFrom && id && id !== connectFrom) {
                                // add edge and clear connect
                                setServiceDoc(prev => {
                                  if (!prev) return prev as any;
                                  const currentFlow = (prev as any).service_flowchart || effective;
                                  const nextFlow = { ...currentFlow, edges: [...(currentFlow.edges||[]), { from: connectFrom as string, to: id }] };
                                  return { ...(prev as any), service_flowchart: nextFlow } as any;
                                });
                                setConnectFrom(null);
                                setSelectedFlowEdgeIndex(null);
                                setSelectedFlowNodeId(id || null);
                                return;
                              }
                              setSelectedFlowNodeId(id || null);
                              setSelectedFlowEdgeIndex(null);
                            }}
                            onSelectEdge={(idx?: number) => { setSelectedFlowEdgeIndex(typeof idx === 'number' ? idx : null); setSelectedFlowNodeId(null); }}
                            onChange={(next) => {
                              setServiceDoc(prev => prev ? ({ ...(prev as any), service_flowchart: next } as any) : prev);
                            }}
                          />
                        </CardContent>
                      </Card>
                    );
                  })()}
                  {(() => {
                    const rd: any = (serviceDoc as any)?.roadmap_data || (serviceDoc as any);
                    return (
                      <>
                        {/* Title & description */}
                        <div>
                          <h3 className="text-xl font-semibold">{rd?.title || 'Service Roadmap'}</h3>
                          {rd?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rd.description}</p>
                          )}
                      </div>

                        {/* Personas & Journey Stages */}
                        {serviceSection === 'journeys' && Array.isArray(rd?.journey_maps?.personas) && rd.journey_maps.personas.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-medium">Customer Journeys</h4>
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowJourneysInfo(true)}>
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant={journeysEditMode ? 'default' : 'outline'} onClick={() => {
                                  if (!journeysEditMode) { try { setServiceDocSnapshot(serviceDoc); } catch {} }
                                  setJourneysEditMode(v => !v);
                                }}>{journeysEditMode ? 'Editing' : 'Edit Journeys'}</Button>
                                {journeysEditMode && (
                                  <>
                                    <Button size="sm" variant="default" onClick={async () => {
                                      try {
                                        let teamId: number | null = null;
                                        try { const status = await apiClient.get('/team-formation/status/'); teamId = (status as any)?.data?.current_team?.id || null; } catch {}
                        if (teamId && serviceDoc) {
                          await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject());
                        }
                                        setServiceDocSnapshot(null);
                                        setJourneysEditMode(false);
                                      } catch {}
                                    }}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => { if (serviceDocSnapshot) setServiceDoc(serviceDocSnapshot); setServiceDocSnapshot(null); setJourneysEditMode(false); }}>Discard</Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              {rd.journey_maps.personas.map((p: any, idx: number) => (
                                <Card key={p?.id || idx}>
                                  <CardHeader>
                                    <CardTitle className="text-base">{p?.name || `Persona ${idx + 1}`}</CardTitle>
                                    {p?.description && <CardDescription>{p.description}</CardDescription>}
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {journeysEditMode && (
                                      <div className="flex justify-end mb-2">
                                        <Button size="sm" variant="outline" onClick={() => addJourneyStage(idx)}>+ Stage</Button>
                                      </div>
                                    )}
                                    {Array.isArray(p?.journey_stages) && p.journey_stages.length > 0 ? (
                                      <div className="space-y-3">
                                        {/* Visual flow */}
                                        <JourneyFlowSVG stages={p.journey_stages} zoom={journeyZoom} />
                                        <div className="flex flex-wrap gap-2">
                                          {p.journey_stages.map((s: any, i: number) => (
                                            <Badge key={i} variant="secondary">{s?.stage || `Stage ${i+1}`}</Badge>
                                          ))}
                        </div>
                                        {p.journey_stages.map((s: any, i: number) => (
                                          <div key={i} className="rounded border p-3">
                                            {!journeysEditMode ? (
                                              <>
                                                <div className="text-sm font-medium mb-1">{s?.stage}</div>
                                                {s?.description && <div className="text-xs text-muted-foreground mb-2">{s.description}</div>}
                                              </>
                                            ) : (
                                              <div className="grid gap-2 mb-2">
                                                <input
                                                  className="px-2 py-1 border rounded text-sm bg-background text-foreground"
                                                  value={String(s?.stage || '')}
                                                  onChange={(e) => updateJourneyStage(idx, i, { stage: e.target.value })}
                                                  placeholder={`Stage ${i+1}`}
                                                />
                                                <textarea
                                                  className="px-2 py-1 border rounded text-sm bg-background text-foreground"
                                                  value={String(s?.description || '')}
                                                  onChange={(e) => updateJourneyStage(idx, i, { description: e.target.value })}
                                                  placeholder="Description / notes"
                                                  rows={2}
                                                />
                                              </div>
                                            )}
                                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                                              {Array.isArray(s?.activities) && (
                                                <div>
                                                  <div className="font-semibold mb-1">Activities</div>
                                                  {!journeysEditMode ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                      {s.activities.map((a: any, j: number) => <li key={j}>{String(a)}</li>)}
                                                    </ul>
                                                  ) : (
                                                    <div className="space-y-1">
                                                      {(s.activities as any[]).map((a: any, j: number) => (
                                                        <div key={j} className="flex gap-2 items-center">
                                                          <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(a)} onChange={(e)=>{
                                                            const arr = [...(s.activities||[])]; arr[j] = e.target.value; updateJourneyStageList(idx, i, 'activities', arr as string[]);
                                                          }} />
                                                          <Button size="xs" variant="outline" onClick={()=>{ const arr = (s.activities||[]).filter((_:any,k:number)=>k!==j); updateJourneyStageList(idx,i,'activities', arr as string[]); }}>-</Button>
                                                        </div>
                                                      ))}
                                                      <Button size="xs" variant="outline" onClick={()=>{ const arr = [...(s.activities||[]), '']; updateJourneyStageList(idx,i,'activities', arr as string[]); }}>+ Add</Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {Array.isArray(s?.touchpoints) && (
                                                <div>
                                                  <div className="font-semibold mb-1">Touchpoints</div>
                                                  {!journeysEditMode ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                      {s.touchpoints.map((t: any, j: number) => <li key={j}>{String(t)}</li>)}
                                                    </ul>
                                                  ) : (
                                                    <div className="space-y-1">
                                                      {(s.touchpoints as any[]).map((t: any, j: number) => (
                                                        <div key={j} className="flex gap-2 items-center">
                                                          <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(t)} onChange={(e)=>{
                                                            const arr = [...(s.touchpoints||[])]; arr[j] = e.target.value; updateJourneyStageList(idx, i, 'touchpoints', arr as string[]);
                                                          }} />
                                                          <Button size="xs" variant="outline" onClick={()=>{ const arr = (s.touchpoints||[]).filter((_:any,k:number)=>k!==j); updateJourneyStageList(idx,i,'touchpoints', arr as string[]); }}>-</Button>
                                                        </div>
                                                      ))}
                                                      <Button size="xs" variant="outline" onClick={()=>{ const arr = [...(s.touchpoints||[]), '']; updateJourneyStageList(idx,i,'touchpoints', arr as string[]); }}>+ Add</Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {Array.isArray(s?.emotions) && (
                                                <div>
                                                  <div className="font-semibold mb-1">Emotions</div>
                                                  {!journeysEditMode ? (
                                                    <div className="flex flex-wrap gap-2">
                                                      {s.emotions.map((e: any, j: number) => <Badge key={j} variant="outline">{String(e)}</Badge>)}
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-1">
                                                      {(s.emotions as any[]).map((e: any, j: number) => (
                                                        <div key={j} className="flex gap-2 items-center">
                                                          <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(e)} onChange={(ev)=>{
                                                            const arr = [...(s.emotions||[])]; arr[j] = ev.target.value; updateJourneyStageList(idx, i, 'emotions', arr as string[]);
                                                          }} />
                                                          <Button size="xs" variant="outline" onClick={()=>{ const arr = (s.emotions||[]).filter((_:any,k:number)=>k!==j); updateJourneyStageList(idx,i,'emotions', arr as string[]); }}>-</Button>
                                                        </div>
                                                      ))}
                                                      <Button size="xs" variant="outline" onClick={()=>{ const arr = [...(s.emotions||[]), '']; updateJourneyStageList(idx,i,'emotions', arr as string[]); }}>+ Add</Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {Array.isArray(s?.pain_points) && (
                                                <div>
                                                  <div className="font-semibold mb-1">Pain Points</div>
                                                  {!journeysEditMode ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                      {s.pain_points.map((pp: any, j: number) => <li key={j}>{String(pp)}</li>)}
                                                    </ul>
                                                  ) : (
                                                    <div className="space-y-1">
                                                      {(s.pain_points as any[]).map((pp: any, j: number) => (
                                                        <div key={j} className="flex gap-2 items-center">
                                                          <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(pp)} onChange={(ev)=>{
                                                            const arr = [...(s.pain_points||[])]; arr[j] = ev.target.value; updateJourneyStageList(idx, i, 'pain_points', arr as string[]);
                                                          }} />
                                                          <Button size="xs" variant="outline" onClick={()=>{ const arr = (s.pain_points||[]).filter((_:any,k:number)=>k!==j); updateJourneyStageList(idx,i,'pain_points', arr as string[]); }}>-</Button>
                                                        </div>
                                                      ))}
                                                      <Button size="xs" variant="outline" onClick={()=>{ const arr = [...(s.pain_points||[]), '']; updateJourneyStageList(idx,i,'pain_points', arr as string[]); }}>+ Add</Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              {Array.isArray(s?.opportunities) && (
                                                <div>
                                                  <div className="font-semibold mb-1">Opportunities</div>
                                                  {!journeysEditMode ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                      {s.opportunities.map((op: any, j: number) => <li key={j}>{String(op)}</li>)}
                                                    </ul>
                                                  ) : (
                                                    <div className="space-y-1">
                                                      {(s.opportunities as any[]).map((op: any, j: number) => (
                                                        <div key={j} className="flex gap-2 items-center">
                                                          <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(op)} onChange={(ev)=>{
                                                            const arr = [...(s.opportunities||[])]; arr[j] = ev.target.value; updateJourneyStageList(idx, i, 'opportunities', arr as string[]);
                                                          }} />
                                                          <Button size="xs" variant="outline" onClick={()=>{ const arr = (s.opportunities||[]).filter((_:any,k:number)=>k!==j); updateJourneyStageList(idx,i,'opportunities', arr as string[]); }}>-</Button>
                                                        </div>
                                                      ))}
                                                      <Button size="xs" variant="outline" onClick={()=>{ const arr = [...(s.opportunities||[]), '']; updateJourneyStageList(idx,i,'opportunities', arr as string[]); }}>+ Add</Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">No journey stages provided.</div>
                                    )}
                                  </CardContent>
                  </Card>
                ))}
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        {serviceSection === 'timeline' && rd?.timeline && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-medium">Timeline {rd.timeline.total_duration && (<span className="text-sm text-muted-foreground">({rd.timeline.total_duration})</span>)}</h4>
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowTimelineInfo(true)}>
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant={timelineEditMode ? 'default' : 'outline'} onClick={()=>{ if(!timelineEditMode){try{setServiceDocSnapshot(serviceDoc)}catch{}} setTimelineEditMode(v=>!v); }}>{timelineEditMode? 'Editing':'Edit Timeline'}</Button>
                                {timelineEditMode && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={()=>addTimelinePhase()}>+ Phase</Button>
                                    <Button size="sm" variant="default" onClick={async()=>{ try{ let teamId: number | null = null; try{ const status = await apiClient.get('/team-formation/status/'); teamId=(status as any)?.data?.current_team?.id||null; }catch{} if(teamId && serviceDoc){ await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject()); } setServiceDocSnapshot(null); setTimelineEditMode(false);} catch {} }}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={()=>{ if(serviceDocSnapshot) setServiceDoc(serviceDocSnapshot); setServiceDocSnapshot(null); setTimelineEditMode(false); }}>Discard</Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Visual timeline flow */}
                            {Array.isArray(rd.timeline.phases) && rd.timeline.phases.length > 0 && (
                              <TimelineFlowSVG phases={rd.timeline.phases} milestones={rd?.milestones} />
                            )}
                          <div className="space-y-3">
                            {Array.isArray(rd.timeline.phases) && rd.timeline.phases.map((ph: any, i: number) => (
                              <div key={i} className="rounded border p-3">
                                  {!timelineEditMode ? (
                                    <div className="flex items-center justify-between">
                                      <div className="font-semibold">{ph?.phase || ph?.name}</div>
                                      {ph?.duration && <div className="text-xs text-muted-foreground">{ph.duration}</div>}
                                    </div>
                                  ) : (
                                    <div className="grid sm:grid-cols-3 gap-2 mb-2 text-xs">
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Phase name" value={String(ph?.phase || ph?.name || '')} onChange={(e)=>updateTimelinePhase(i, { phase: e.target.value, name: e.target.value })} />
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Duration" value={String(ph?.duration || '')} onChange={(e)=>updateTimelinePhase(i, { duration: e.target.value })} />
                                    </div>
                                  )}
                                  <div className="grid sm:grid-cols-3 gap-3 mt-2 text-xs">
                                    <div>
                                      <div className="font-semibold mb-1">Activities</div>
                                      {!timelineEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.activities||[]).map((a: any, j: number) => <li key={j}>{String(a?.name || a)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.activities||[]).map((a: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(a)} onChange={(e)=>{ const arr=[...(ph.activities||[])]; arr[j]=e.target.value; updateTimelinePhaseList(i,'activities', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.activities||[]).filter((_:any,k:number)=>k!==j); updateTimelinePhaseList(i,'activities', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.activities||[]), '']; updateTimelinePhaseList(i,'activities', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold mb-1">Deliverables</div>
                                      {!timelineEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.deliverables||[]).map((d: any, j: number) => <li key={j}>{String(d)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.deliverables||[]).map((d: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(d)} onChange={(e)=>{ const arr=[...(ph.deliverables||[])]; arr[j]=e.target.value; updateTimelinePhaseList(i,'deliverables', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.deliverables||[]).filter((_:any,k:number)=>k!==j); updateTimelinePhaseList(i,'deliverables', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.deliverables||[]), '']; updateTimelinePhaseList(i,'deliverables', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold mb-1">Resources</div>
                                      {!timelineEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.resources||[]).map((r: any, j: number) => <li key={j}>{String(r)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.resources||[]).map((r: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(r)} onChange={(e)=>{ const arr=[...(ph.resources||[])]; arr[j]=e.target.value; updateTimelinePhaseList(i,'resources', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.resources||[]).filter((_:any,k:number)=>k!==j); updateTimelinePhaseList(i,'resources', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.resources||[]), '']; updateTimelinePhaseList(i,'resources', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Milestones */}
                        {serviceSection === 'milestones' && Array.isArray(rd?.milestones) && rd.milestones.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-medium">Milestones</h4>
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowMilestonesInfo(true)}>
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant={milestonesEditMode ? 'default' : 'outline'} onClick={()=>{ if(!milestonesEditMode){try{setServiceDocSnapshot(serviceDoc)}catch{}} setMilestonesEditMode(v=>!v); }}>{milestonesEditMode? 'Editing':'Edit Milestones'}</Button>
                                {milestonesEditMode && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={()=>addMilestone()}>+ Milestone</Button>
                                    <Button size="sm" variant="default" onClick={async()=>{ try{ let teamId: number | null = null; try{ const status = await apiClient.get('/team-formation/status/'); teamId=(status as any)?.data?.current_team?.id||null; }catch{} if(teamId && serviceDoc){ await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject()); } setServiceDocSnapshot(null); setMilestonesEditMode(false);} catch {} }}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={()=>{ if(serviceDocSnapshot) setServiceDoc(serviceDocSnapshot); setServiceDocSnapshot(null); setMilestonesEditMode(false); }}>Discard</Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              {rd.milestones.map((m: any, i: number) => (
                                <div key={m?.id || i} className="rounded border p-3 text-sm space-y-2">
                                  {!milestonesEditMode ? (
                                    <>
                                      <div className="font-semibold">{m?.title || `Milestone ${i+1}`}</div>
                                      {m?.date && <div className="text-xs text-muted-foreground">{m.date}</div>}
                                      {m?.description && <div className="mt-1">{m.description}</div>}
                                    </>
                                  ) : (
                                    <div className="grid gap-2">
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Title" value={String(m?.title || '')} onChange={(e)=>updateMilestone(i, { title: e.target.value })} />
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Date" value={String(m?.date || '')} onChange={(e)=>updateMilestone(i, { date: e.target.value })} />
                                      <textarea className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Description" rows={2} value={String(m?.description || '')} onChange={(e)=>updateMilestone(i, { description: e.target.value })} />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold mb-1">Success Criteria</div>
                                    {!milestonesEditMode ? (
                                      <ul className="list-disc list-inside space-y-1">
                                        {(m.success_criteria||[]).map((sc: any, j: number) => <li key={j}>{String(sc)}</li>)}
                                      </ul>
                                    ) : (
                                      <div className="space-y-1">
                                        {(m.success_criteria||[]).map((sc: any, j: number) => (
                                          <div key={j} className="flex gap-2 items-center">
                                            <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(sc)} onChange={(e)=>{ const arr=[...(m.success_criteria||[])]; arr[j]=e.target.value; updateMilestoneList(i,'success_criteria', arr as string[]); }} />
                                            <Button size="xs" variant="outline" onClick={()=>{ const arr=(m.success_criteria||[]).filter((_:any,k:number)=>k!==j); updateMilestoneList(i,'success_criteria', arr as string[]); }}>-</Button>
                                          </div>
                                        ))}
                                        <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(m.success_criteria||[]), '']; updateMilestoneList(i,'success_criteria', arr as string[]); }}>+ Add</Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Phases (detailed) */}
                        {serviceSection === 'phases' && Array.isArray(rd?.phases) && rd.phases.length > 0 && (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between">
                             <h4 className="text-lg font-medium">Operational Phases</h4>
                             <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowPhasesInfo(true)}>
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant={phasesEditMode ? 'default' : 'outline'} onClick={()=>{ if(!phasesEditMode){try{setServiceDocSnapshot(serviceDoc)}catch{}} setPhasesEditMode(v=>!v); }}>{phasesEditMode? 'Editing':'Edit Phases'}</Button>
                                {phasesEditMode && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={()=>addPhase()}>+ Phase</Button>
                                    <Button size="sm" variant="default" onClick={async()=>{ try{ let teamId: number | null = null; try{ const status = await apiClient.get('/team-formation/status/'); teamId=(status as any)?.data?.current_team?.id||null; }catch{} if(teamId && serviceDoc){ await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject()); } setServiceDocSnapshot(null); setPhasesEditMode(false);} catch {} }}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={()=>{ if(serviceDocSnapshot) setServiceDoc(serviceDocSnapshot); setServiceDocSnapshot(null); setPhasesEditMode(false); }}>Discard</Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              {rd.phases.map((ph: any, i: number) => (
                                <div key={ph?.id || i} className="rounded border p-3 text-sm space-y-2">
                                  {!phasesEditMode ? (
                                    <div className="flex items-center justify-between">
                                      <div className="font-semibold">{ph?.name || ph?.phase || `Phase ${i+1}`}</div>
                                      {ph?.duration && <div className="text-xs text-muted-foreground">{ph.duration}</div>}
                                    </div>
                                  ) : (
                                    <div className="grid sm:grid-cols-3 gap-2">
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Name" value={String(ph?.name || ph?.phase || '')} onChange={(e)=>updatePhase(i, { name: e.target.value, phase: e.target.value })} />
                                      <input className="px-2 py-1 border rounded bg-background text-foreground" placeholder="Duration" value={String(ph?.duration || '')} onChange={(e)=>updatePhase(i, { duration: e.target.value })} />
                                    </div>
                                  )}
                                  {ph?.description && <div className="mt-1">{ph.description}</div>}
                                  <div className="grid sm:grid-cols-3 gap-3 mt-2 text-xs">
                                    <div>
                                      <div className="font-semibold mb-1">Activities</div>
                                      {!phasesEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.activities||[]).map((a: any, j: number) => <li key={j}>{String(a?.name || a)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.activities||[]).map((a: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(a)} onChange={(e)=>{ const arr=[...(ph.activities||[])]; arr[j]=e.target.value; updatePhaseList(i,'activities', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.activities||[]).filter((_:any,k:number)=>k!==j); updatePhaseList(i,'activities', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.activities||[]), '']; updatePhaseList(i,'activities', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold mb-1">Deliverables</div>
                                      {!phasesEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.deliverables||[]).map((d: any, j: number) => <li key={j}>{String(d)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.deliverables||[]).map((d: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(d)} onChange={(e)=>{ const arr=[...(ph.deliverables||[])]; arr[j]=e.target.value; updatePhaseList(i,'deliverables', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.deliverables||[]).filter((_:any,k:number)=>k!==j); updatePhaseList(i,'deliverables', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.deliverables||[]), '']; updatePhaseList(i,'deliverables', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold mb-1">Resources</div>
                                      {!phasesEditMode ? (
                                        <ul className="list-disc list-inside space-y-1">
                                          {(ph.resources||[]).map((r: any, j: number) => <li key={j}>{String(r)}</li>)}
                                        </ul>
                                      ) : (
                                        <div className="space-y-1">
                                          {(ph.resources||[]).map((r: any, j: number) => (
                                            <div key={j} className="flex gap-2 items-center">
                                              <input className="px-2 py-1 border rounded text-xs bg-background text-foreground flex-1" value={String(r)} onChange={(e)=>{ const arr=[...(ph.resources||[])]; arr[j]=e.target.value; updatePhaseList(i,'resources', arr as string[]); }} />
                                              <Button size="xs" variant="outline" onClick={()=>{ const arr=(ph.resources||[]).filter((_:any,k:number)=>k!==j); updatePhaseList(i,'resources', arr as string[]); }}>-</Button>
                                            </div>
                                          ))}
                                          <Button size="xs" variant="outline" onClick={()=>{ const arr=[...(ph.resources||[]), '']; updatePhaseList(i,'resources', arr as string[]); }}>+ Add</Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {Array.isArray(ph?.dependencies) && ph.dependencies.length > 0 && (
                                    <div className="text-xs mt-2"><span className="font-semibold">Dependencies: </span>{ph.dependencies.join(', ')}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setSelectionMode('menu')}>Back</Button>
                    <Button variant="warning" onClick={async () => {
                      try {
                        let teamId: number | null = null;
                        try {
                          const cached = localStorage.getItem('xfactoryTeamId');
                          teamId = cached ? Number(cached) : null;
                          if (!teamId) {
                            const status = await apiClient.get('/team-formation/status/');
                            teamId = (status as any)?.data?.current_team?.id || null;
                            if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
                          }
                        } catch {}
                        if (teamId && serviceDoc) {
                          await apiClient.saveServiceRoadmapTeam(teamId, getRoadmapSaveObject());
                          // Mark team MVP/mockup completion
                          try {
                            const status = await apiClient.get('/team-formation/status/');
                            const tid = status.data?.current_team?.id;
                            if (tid) await apiClient.markMockupCompleted(tid);
                          } catch {}
                        }
                      } catch (e) { log.warn('save service roadmap failed', e); }
                      // Return to mockup main menu without advancing the flow
                      returnToMainMenu();
                    }}>Use This Flow</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={2} 
        userData={{ 
          ideaCard,
          step,
          isGenerating,
          selectedMockups: selectedMockups.length,
          mockupType: getMockupType()
        }} 
        context="mockup-creation"
          onGenerate={() => setSelectionMode('menu')}
        onRegenerate={() => {
            setSelectionMode('menu');
            setV0Phase('intro');
            setV0DemoUrl(null);
            setGeneratedMockups([]);
            setSelectedMockups([]);
            setServiceDoc(null);
          }}
          canGenerate={!isGenerating && v0Phase !== 'generating'}
          canRegenerate={!isGenerating}
          isGenerating={isGenerating || v0Phase === 'generating'}
        />

      {/* Info Dialogs for Service Flow & Sections */}
      <Dialog open={showServiceFlowIntro} onOpenChange={setShowServiceFlowIntro}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>What's a Service Flowchart?</DialogTitle>
            <DialogDescription>
              The quick meme‑friendly tour: it's a map of your service from the customer's POV plus what happens behind the scenes.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Lanes:</span> the "who/where" rows — Customer, Frontstage UI, Backstage System, External Integrations. Think class group project lanes.</div>
            <div><span className="font-semibold">Nodes:</span> steps like start/end/process/decision/system/subprocess/feedback. Start = spawn point, End = GG.</div>
            <div><span className="font-semibold">Edges:</span> arrows that connect steps. Diamonds use Yes/No branches — like "did you study?" No → retry loop.</div>
            <div>Use this to customize the AI's draft so it matches your real ops. Future you (and your team) will thank you.</div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showFlowchartInfo} onOpenChange={setShowFlowchartInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Flowchart — How to Edit</DialogTitle>
            <DialogDescription>Drag, rename, and connect steps. Keep it simple, nerd‑sniped style.</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Start/End:</span> only one of each. Start kickoffs, End = donezo.</div>
            <div><span className="font-semibold">Process:</span> a normal step (e.g., "User signs up").</div>
            <div><span className="font-semibold">Decision:</span> a question with Yes/No edges (e.g., "Payment approved?"). Label the edges!</div>
            <div><span className="font-semibold">System/Subprocess:</span> backstage or integrations (Stripe, CRM, etc.).</div>
            <div><span className="font-semibold">Feedback:</span> messages back to the user ("Order confirmed").</div>
            <div>Pro‑tip: if your diagram looks like spaghetti, split it into mini‑flows. Chef's kiss.</div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showJourneysInfo} onOpenChange={setShowJourneysInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Journeys — What to Capture</DialogTitle>
            <DialogDescription>It's the story arc from "I saw a TikTok" → "I paid".</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Personas:</span> who's your main character (student, parent, founder)?</div>
            <div><span className="font-semibold">Stages:</span> Awareness → Consideration → Purchase → Onboarding → Retention.</div>
            <div><span className="font-semibold">Activities:</span> what they do at each stage.</div>
            <div><span className="font-semibold">Touchpoints:</span> where it happens (site, app, email, IRL).</div>
            <div><span className="font-semibold">Emotions:</span> the vibes (confused → hyped). Yes, vibes are data.</div>
            <div><span className="font-semibold">Pain points & opportunities:</span> problems + quick wins. Fix the rage‑quit moments.</div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showTimelineInfo} onOpenChange={setShowTimelineInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Timeline — Plan the Semester</DialogTitle>
            <DialogDescription>Phases, durations, deliverables… basically your syllabus for building.</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Phases:</span> Discovery → Build → Test → Launch (tweak as needed).</div>
            <div><span className="font-semibold">Duration:</span> rough time per phase (e.g., 2 weeks).</div>
            <div><span className="font-semibold">Activities:</span> what the team does.</div>
            <div><span className="font-semibold">Deliverables:</span> what gets shipped ("Prototype v1").</div>
            <div><span className="font-semibold">Resources:</span> who/what is needed (dev, designer, budget).</div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showMilestonesInfo} onOpenChange={setShowMilestonesInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Milestones — Checkpoints You Can't Skip</DialogTitle>
            <DialogDescription>Think "boss fights": clear criteria to pass.</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Title & date:</span> name the checkpoint and when it's due.</div>
            <div><span className="font-semibold">Description:</span> what "done" means.</div>
            <div><span className="font-semibold">Success criteria:</span> measurable outcomes (e.g., "10 test users complete checkout").</div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showPhasesInfo} onOpenChange={setShowPhasesInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Operational Phases — Zoomed‑In Plan</DialogTitle>
            <DialogDescription>Each phase = mini‑project. No side quests.</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Activities:</span> the to‑dos.</div>
            <div><span className="font-semibold">Deliverables:</span> artifacts to produce.</div>
            <div><span className="font-semibold">Resources:</span> people/tools/money needed.</div>
            <div><span className="font-semibold">Dependencies:</span> what must happen first (no time‑turners).</div>
            <div><span className="font-semibold">Risks & mitigation:</span> what could go wrong and your backup plan.</div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

