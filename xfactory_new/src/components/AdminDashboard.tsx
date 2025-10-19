import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Factory, 
  UserPlus, 
  Users, 
  Trash2, 
  Upload,
  Download,
  LogOut,
  Mail,
  FileText,
  GraduationCap,
  Briefcase,
  Heart,
  Loader2,
  Users as UsersIcon,
  Eye,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  RefreshCw,
  ArrowLeft,
  User,
  Settings
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient, toAbsoluteMediaUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { v0 } from 'v0-sdk';
import TeamProgressView from "./TeamProgressView";
import ServiceFlowchart from "@/components/ServiceFlowchart";


// Helper: detect if a demo URL can be embedded in iframe
const canEmbedDemo = (u?: string | null) => {
  if (!u) return false;
  try {
    const host = new URL(u).host.toLowerCase();
    if (host.endsWith('v0.app') || host.endsWith('vusercontent.net')) return false;
    return true;
  } catch { return false; }
};

// Minimal flowchart SVG renderer matching user mockup view
const JourneyFlowSVG = ({ stages }: { stages: Array<{ stage?: string; activities?: any[]; touchpoints?: any[] }> }) => {
  const items = Array.isArray(stages) ? stages : [];
  if (!items.length) return null as any;
  const nodeW = 220, nodeH = 90, gap = 40; const pad = 16;
  const width = items.length * nodeW + (items.length - 1) * gap + pad * 2;
  const height = nodeH + pad * 2 + 8;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" style={{ maxWidth: '100%' }}>
        <defs>
          <marker id="adm-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L0,10 L10,5 z" fill="#6366f1" />
          </marker>
        </defs>
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
              {acts.length > 0 && (
                <text x={x + 12} y={y + 42} fill="#374151" fontSize="11">• {String(acts[0])}</text>
              )}
              {tps.length > 0 && (
                <text x={x + 12} y={y + 58} fill="#6b7280" fontSize="11">@ {String(tps[0])}</text>
              )}
              <circle cx={x + nodeW / 2} cy={height - pad} r={4} fill="#6366f1" />
              {i < items.length - 1 && (
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#6366f1" strokeWidth={2} markerEnd="url(#adm-arrow)" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Helpers to normalize and refresh demo URLs
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
const cacheBust = (u?: string | null): string => {
  const base = stripTs(u);
  if (!base) return '';
  try {
    const url = new URL(base);
    url.searchParams.set('ts', String(Date.now()));
    return url.toString();
  } catch { return `${base}${base.includes('?') ? '&' : '?'}ts=${Date.now()}`; }
};

// Coordinate-aware flowchart renderer for admin preview (matches user mockup layout)
type AdmFlowNode = { id: string; label: string; lane?: string; type?: 'start'|'end'|'process'|'decision'|'system'|'subprocess'|'feedback'; x?: number; y?: number };
type AdmFlowEdge = { from: string; to: string; label?: string };
const FlowchartSVG = ({ flow }: { flow: { lanes?: string[]; nodes: AdmFlowNode[]; edges: AdmFlowEdge[] } }) => {
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  if (!nodes.length) return null as any;
  const lanes = (Array.isArray(flow?.lanes) && flow.lanes.length)
    ? flow.lanes
    : Array.from(new Set((flow?.nodes || []).map(n => n.lane || 'Flow')));
  const laneIndex: Record<string, number> = {};
  lanes.forEach((l, i) => laneIndex[l] = i);

  // Measure text helper to size nodes similarly to user view
  const approxTextWidth = (s: string, size = 12) => Math.max(8, Math.min(280, Math.round(String(s||'').length * (size * 0.6))));
  const measureNode = (label: string) => {
    const base = 140;
    const max = 240;
    const w = Math.min(max, Math.max(base, approxTextWidth(label, 12) + 24));
    const h = 54;
    return { w, h };
  };

  // Auto layout columns if x/y are not present
  const incoming: Record<string, number> = {};
  nodes.forEach(n => incoming[n.id] = 0);
  edges.forEach(e => { if (incoming[e.to] !== undefined) incoming[e.to]++; });
  const col: Record<string, number> = {};
  const q: string[] = nodes.filter(n => (incoming[n.id] || 0) === 0).map(n => n.id);
  q.forEach(id => { col[id] = 0; });
  for (let iter = 0; iter < nodes.length + edges.length; iter++) {
    let changed = false;
    for (const e of edges) {
      const cf = (col[e.from] ?? 0);
      const ct = (col[e.to] ?? 0);
      if (ct < cf + 1) { col[e.to] = cf + 1; changed = true; }
    }
    if (!changed) break;
  }
  const maxCol = Math.max(0, ...Object.values(col));
  nodes.forEach(n => { if (col[n.id] === undefined) col[n.id] = maxCol + 1; });

  // Layout constants
  const laneH = 140; const lanePad = 40; const colW = 180; const gPad = 20;
  // Compute positions using saved x/y when present
  const xy: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n => {
    const li = laneIndex[n.lane || lanes[0]] || 0;
    const autoX = gPad + 60 + (col[n.id] || 0) * colW + colW / 2;
    const autoY = lanePad + li * laneH + laneH / 2;
    const x = (typeof n.x === 'number') ? n.x : autoX;
    const y = (typeof n.y === 'number') ? n.y : autoY;
    xy[n.id] = { x, y };
  });

  // Determine canvas size from node bounds
  const bounds = Object.entries(xy).reduce((acc, [id, p]) => {
    const { w, h } = measureNode(nodes.find(n => n.id === id)?.label || '');
    acc.minX = Math.min(acc.minX, p.x - w/2 - gPad);
    acc.maxX = Math.max(acc.maxX, p.x + w/2 + gPad);
    acc.minY = Math.min(acc.minY, p.y - h/2 - gPad);
    acc.maxY = Math.max(acc.maxY, p.y + h/2 + gPad);
    return acc;
  }, { minX: 0, minY: 0, maxX: 800, maxY: Math.max(lanes.length * laneH + lanePad * 2, 400) });
  const rawWidth = Math.max(800, bounds.maxX - bounds.minX);
  const rawHeight = Math.max(Math.max(lanes.length * laneH + lanePad * 2, 360), bounds.maxY - bounds.minY);
  const MAX_CANVAS_W = 1100; // cap extremely wide diagrams
  const MAX_CANVAS_H = 420;  // cap tall diagrams
  const scaleX = rawWidth > MAX_CANVAS_W ? (MAX_CANVAS_W / rawWidth) : 1;
  const scaleY = rawHeight > MAX_CANVAS_H ? (MAX_CANVAS_H / rawHeight) : 1;
  const viewWidth = rawWidth * scaleX;
  const viewHeight = rawHeight * scaleY;
  const tx = -bounds.minX;
  const ty = -bounds.minY;

  // Label wrapping similar to user view
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

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet" className="min-w-full" style={{ width: '100%', height: 420 }}>
        <g transform={`translate(${tx}, ${ty}) scale(${scaleX}, ${scaleY})`}>
          {/* Swimlanes */}
      {lanes.map((l, i) => (
        <g key={l}>
              <rect x={0} y={lanePad + i * laneH - laneH/2 + laneH/2} width={rawWidth} height={laneH} fill={i % 2 === 0 ? '#fafafa' : '#ffffff'} stroke="#f3f4f6" />
              <text x={12} y={lanePad + i * laneH + 18} fill="#6b7280" fontSize={12} fontWeight={700}>{l}</text>
        </g>
      ))}
          {/* Edges with elbow routing */}
      <defs>
        <marker id="adm-edge" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L0,10 L10,5 z" fill="#6d28d9" />
        </marker>
      </defs>
          {edges.map((e, i) => {
            const a = xy[e.from]; const b = xy[e.to]; if (!a || !b) return null;
            // Limit horizontal runs so edges don't span the full width visually
            const MAX_HSTEP = 200;
            const leftCap = a.x + MAX_HSTEP;
            const rightCap = b.x - MAX_HSTEP;
            // Choose a routing column that keeps each horizontal leg <= MAX_HSTEP
            const columnX = leftCap <= rightCap ? ((leftCap + rightCap) / 2) : ((a.x + b.x) / 2);
            const path = `M ${a.x} ${a.y} L ${columnX} ${a.y} L ${columnX} ${b.y} L ${b.x} ${b.y}`;
            const midY = (a.y + b.y) / 2 - 6;
            const labelX = columnX;
            return (
              <g key={`e-${i}`}>
                <path d={path} fill="none" stroke="#6d28d9" strokeWidth={2} markerEnd="url(#adm-edge)" />
                {e.label && (() => {
                  const tw = approxTextWidth(String(e.label), 11) + 8; const th = 14;
                  return (
                    <g>
                      <rect x={labelX - tw/2} y={midY - th + 4} width={tw} height={th} rx={3} ry={3} fill="#ffffff" opacity={0.9} />
                      <text x={labelX} y={midY} textAnchor="middle" fill="#6b7280" fontSize="11">{e.label}</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
          {/* Nodes honor saved coordinates and basic node types */}
          {nodes.map(n => {
          const p = xy[n.id]; if (!p) return null;
          const { w, h } = measureNode(n.label);
          const type = n.type || 'process';
          if (type === 'start' || type === 'end') {
            return (
              <g key={n.id}>
                <ellipse cx={p.x} cy={p.y} rx={w/2} ry={h/2} fill="#fff" stroke="#e5e7eb" />
                {wrapLabel(n.label).map((line, i) => (
                  <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="13" fontWeight={700}>{line}</text>
                ))}
              </g>
            );
          }
          if (type === 'decision') {
            const s = 40;
            return (
              <g key={n.id}>
                <polygon points={`${p.x},${p.y - s} ${p.x + s},${p.y} ${p.x},${p.y + s} ${p.x - s},${p.y}`} fill="#fff" stroke="#f59e0b" />
                {wrapLabel(n.label, 16).map((line, i) => (
                  <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label,16).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight={700}>{line}</text>
                ))}
              </g>
            );
          }
          if (type === 'system' || type === 'subprocess') {
            const skew = 16;
            return (
              <g key={n.id}>
                <polygon points={`${p.x - w/2 + skew},${p.y - h/2} ${p.x + w/2 + skew},${p.y - h/2} ${p.x + w/2 - skew},${p.y + h/2} ${p.x - w/2 - skew},${p.y + h/2}`} fill="#ecfeff" stroke="#06b6d4" />
                {wrapLabel(n.label).map((line, i) => (
                  <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#0e7490" fontSize="13" fontWeight={700}>{line}</text>
                ))}
              </g>
            );
          }
          return (
            <g key={n.id}>
              <rect x={p.x - w/2} y={p.y - h/2} width={w} height={h} rx={8} ry={8} fill="#fff" stroke="#e5e7eb" />
              {wrapLabel(n.label).map((line, i) => (
                <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 14} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="13" fontWeight={700}>{line}</text>
              ))}
            </g>
          );
        })}
        </g>
    </svg>
    </div>
  );
};

// Simple renderer for service sections to mirror user view
const renderServiceSection = (doc: any, section: 'flowchart'|'journeys'|'timeline'|'milestones'|'phases') => {
  const rd = (doc && (doc.roadmap_data || doc)) || null;
  if (!rd) return (<div className="text-sm text-muted-foreground">No service roadmap saved.</div>);
  if (section === 'flowchart') {
    const flow = rd?.service_flowchart;
    if (flow && Array.isArray(flow?.nodes) && Array.isArray(flow?.edges)) {
      return <ServiceFlowchart flow={flow} height={420} />;
    }
    return <div className="text-sm text-muted-foreground">No flowchart saved.</div>;
  }
  if (section === 'journeys') {
    const jm = rd?.journey_maps || {};
    const personas = Array.isArray(jm?.personas) ? jm.personas : [];
    const stages = Array.isArray(jm?.stages) ? jm.stages : [];
    return (
      <div className="space-y-3">
        {personas.length > 0 && (
          <div className="text-sm"><span className="font-semibold">Personas:</span> {personas.map((p: any) => p?.name || p).join(', ')}</div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {stages.map((s: any, i: number) => (
            <div key={i} className="rounded border p-3 text-sm bg-background">
              <div className="font-semibold mb-1">{s?.stage || `Stage ${i+1}`}</div>
              {Array.isArray(s?.activities) && s.activities.length > 0 && (
                <div className="text-xs text-muted-foreground">• {s.activities.slice(0,3).map((a:any)=>String(a?.name||a)).join(' • ')}</div>
              )}
              {Array.isArray(s?.touchpoints) && s.touchpoints.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">@ {s.touchpoints.slice(0,3).join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (section === 'timeline') {
    const tl = rd?.timeline || {};
    const phases = Array.isArray(tl?.phases) ? tl.phases : (Array.isArray(rd?.phases) ? rd.phases : []);
    return (
      <div className="space-y-2">
        {phases.length ? phases.map((p: any, i: number) => (
          <div key={i} className="rounded border p-3 text-sm bg-background">
            <div className="font-semibold">{p?.phase || p?.name || `Phase ${i+1}`}</div>
            {p?.duration && <div className="text-xs text-muted-foreground">{p.duration}</div>}
            {p?.description && <div className="text-xs mt-1">{p.description}</div>}
          </div>
        )) : <div className="text-sm text-muted-foreground">No timeline phases.</div>}
      </div>
    );
  }
  if (section === 'milestones') {
    const ms = Array.isArray(rd?.milestones) ? rd.milestones : [];
    return ms.length ? (
      <div className="grid md:grid-cols-2 gap-3">
        {ms.map((m: any, i: number) => (
          <div key={i} className="rounded border p-3 text-sm bg-background">
            <div className="font-semibold">{m?.title || m?.name || `Milestone ${i+1}`}</div>
            {m?.due_date && <div className="text-xs text-muted-foreground">Due: {m.due_date}</div>}
            {m?.success_criteria && (
              <ul className="list-disc list-inside text-xs mt-1">
                {m.success_criteria.map((sc: any, j: number) => <li key={j}>{String(sc)}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    ) : <div className="text-sm text-muted-foreground">No milestones.</div>;
  }
  // phases
  const phases = Array.isArray(rd?.phases) ? rd.phases : [];
  return phases.length ? (
    <div className="grid md:grid-cols-2 gap-3">
      {phases.map((ph: any, i: number) => (
        <div key={i} className="rounded border p-3 text-sm bg-background">
          <div className="font-semibold mb-1">{ph?.name || ph?.phase || `Phase ${i+1}`}</div>
          {ph?.description && <div className="text-xs">{ph.description}</div>}
        </div>
      ))}
    </div>
  ) : <div className="text-sm text-muted-foreground">No phases.</div>;
};

const TeamAdminModal = ({ open, onOpenChange, team }: { open: boolean; onOpenChange: (o: boolean) => void; team: any; }) => {
  const [loading, setLoading] = useState(false);
  const [conceptCard, setConceptCard] = useState<any | null>(null);
  const [elevator, setElevator] = useState<any | null>(null);
  const [personaKit, setPersonaKit] = useState<any | null>(null);
  const [validationEvidence, setValidationEvidence] = useState<any | null>(null);
  const [aiSurvey, setAISurvey] = useState<any | null>(null);
  const [pst, setPst] = useState<any | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('idea');
  const [validationSubsection, setValidationSubsection] = useState<string>('secondary');
  const [deepResearch, setDeepResearch] = useState<any | null>(null);
  const [qualitativeInsights, setQualitativeInsights] = useState<any | null>(null);
  const [focusGroupInsights, setFocusGroupInsights] = useState<any | null>(null);
  const [qualitativeViewMode, setQualitativeViewMode] = useState<'interview' | 'focus-group'>('interview');
  const [quantitativeData, setQuantitativeData] = useState<any | null>(null);
  const [quantitativeScore, setQuantitativeScore] = useState<any | null>(null);
  const [responseVolume, setResponseVolume] = useState<number | null>(null);
  const [hasInterviewKit, setHasInterviewKit] = useState<boolean>(false);
  const [interviews, setInterviews] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(null);
  const [qualitativeScore, setQualitativeScore] = useState<any | null>(null);
  const [secondaryScore20, setSecondaryScore20] = useState<number | null>(null);
  const [adminLocks, setAdminLocks] = useState<Record<string, boolean>>({});
  const [adminUnlocks, setAdminUnlocks] = useState<Record<string, boolean>>({});
  const [isViewing, setIsViewing] = useState<boolean>(false);
  const [landingUrl, setLandingUrl] = useState<string | null>(null);
  const [mockupImages, setMockupImages] = useState<Array<{ url: string; title?: string }>>([]);
  const [flowcharts, setFlowcharts] = useState<Array<{ url: string; title?: string }>>([]);
  const [serviceDoc, setServiceDoc] = useState<any | null>(null);
  const [mockupTab, setMockupTab] = useState<'landing' | 'images' | 'service'>('landing');
  const [serviceSection, setServiceSection] = useState<'flowchart'|'journeys'|'timeline'|'milestones'|'phases'>('flowchart');
  const [savingLocks, setSavingLocks] = useState<boolean>(false);
  // Pitch deck states
  const [pitchGuidelines, setPitchGuidelines] = useState<any | null>(null);
  const [pitchCoaching, setPitchCoaching] = useState<any | null>(null);
  const [pitchSubmission, setPitchSubmission] = useState<any | null>(null);
  const [currentAdviceSlide, setCurrentAdviceSlide] = useState<number>(0);
  
  // MVP states
  const [mvpData, setMvpData] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mvpSubmission, setMvpSubmission] = useState<any | null>(null);

  const { toast } = useToast();

  // Map interview kit data (same as ValidationEngine)
  const mapInterviewKit = (raw: any) => {
    if (!raw) return null;
    const data = raw.data || raw;
    const user_personas = data.user_personas || data.interview_profiles || [];
    const demographic_questions = data.demographic_questions || data.warm_up_questions || [];
    const market_validation_questions = data.market_validation_questions || [];
    const solution_questions = data.solution_questions || data.solution_feedback_questions || [];
    const result = {
      user_personas,
      demographic_questions,
      behavioral_questions: data.behavioral_questions || market_validation_questions,
      pain_point_questions: data.pain_point_questions || market_validation_questions,
      solution_questions,
      market_questions: data.market_questions || market_validation_questions,
      persona_validation_questions: data.persona_validation_questions || [],
      interview_strategy: data.interview_strategy || '',
      target_interview_count: data.target_interview_count || 15,
      interview_duration: data.interview_duration || '30-45 minutes',
    };
    console.log('DEBUG: mapInterviewKit result:', result);
    return result;
  };

  useEffect(() => {
    (async () => {
      if (!open || !team) return;
      setLoading(true);
      try {
        // Configure v0 SDK (matches user-side MockupStation)
        try {
          const anyV0: any = v0 as any;
          if (anyV0 && typeof anyV0.configure === 'function') {
            anyV0.configure({
              apiKey: (import.meta as any).env?.VITE_V0_API_KEY,
              projectId: (import.meta as any).env?.VITE_V0_PROJECT_ID,
            });
          }
        } catch {}
        const teamId = team.id;
        
        // Fetch fresh roadmap data from server instead of using stale team prop
        try {
          const roadmapRes = await apiClient.getTeamRoadmap(teamId);
          const roadmapData = (roadmapRes as any)?.data || {};
          setAdminLocks(roadmapData?.admin_locks || {});
          setAdminUnlocks(roadmapData?.admin_unlocks || {});
          console.log('[AdminModal] fresh locks/unlocks from server', { admin_locks: roadmapData?.admin_locks, admin_unlocks: roadmapData?.admin_unlocks });
        } catch (error) {
          // Fallback to team prop data if server fetch fails
          const rc = (team as any)?.roadmap_completion || {};
          setAdminLocks(rc?.admin_locks || {});
          setAdminUnlocks(rc?.admin_unlocks || {});
          console.log('[AdminModal] fallback to team prop locks/unlocks', { admin_locks: rc?.admin_locks, admin_unlocks: rc?.admin_unlocks });
        }
        // Idea gen
        try { const cc = await apiClient.getTeamConceptCard(teamId); setConceptCard((cc as any).data || null); } catch {}
        try { const ep = await apiClient.getElevatorPitchSubmission(teamId); setElevator((ep as any).data || null); } catch {}
        try { const ps = await apiClient.getTeamProblemSolution(teamId); setPst((ps as any)?.data || null); } catch {}
        // Personas/interview kit (team-scoped)
        try {
          const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
          const data = (res as any)?.data?.data;
          if (data) {
            // Use the same mapping function as ValidationEngine
            const mappedData = mapInterviewKit({ data });
            setPersonaKit(mappedData);
          }
        } catch {}
        // Validation evidence snapshot (team-scoped); do NOT auto-generate survey here
        try { const ev = await apiClient.getValidationEvidence(teamId); setValidationEvidence((ev as any).data || null); } catch {}
        // Deep research (secondary validation)
        try { const dr = await apiClient.getDeepResearchReportTeam(teamId); setDeepResearch((dr as any).data || null); } catch {}
        // Secondary score: try GET; if missing, POST compute; parse multiple shapes
        try {
          let final20: number | null = null;
          try {
            const ss = await apiClient.getSecondaryScoreTeam(teamId);
            const raw: any = ss as any;
            const d: any = raw?.data || raw;
            // Accept variants: {data:{final_score_20}}, {final_score_20}, {score:{final_score_20}}
            final20 = typeof d?.final_score_20 === 'number' ? d.final_score_20
                     : typeof d?.data?.final_score_20 === 'number' ? d.data.final_score_20
                     : typeof d?.score?.final_score_20 === 'number' ? d.score.final_score_20
                     : null;
          } catch {}
          if (final20 === null) {
            try {
              const cs = await apiClient.computeSecondaryScoreTeam(teamId);
              const raw: any = cs as any;
              const d: any = raw?.data || raw;
              final20 = typeof d?.final_score_20 === 'number' ? d.final_score_20
                       : typeof d?.data?.final_score_20 === 'number' ? d.data.final_score_20
                       : typeof d?.score?.final_score_20 === 'number' ? d.score.final_score_20
                       : null;
            } catch {}
          }
          setSecondaryScore20(final20);
        } catch {}
        // Qualitative insights
        try { const qi = await apiClient.getQualInsightsTeam(teamId); setQualitativeInsights((qi as any).data || null); } catch {}
        // Focus group insights
        try { const fgi = await apiClient.get(`/validation/teams/${teamId}/focus-group-insights/`); setFocusGroupInsights((fgi as any).data || null); } catch {}
        // Quantitative data (AI survey questions) - GET only, don't generate
        try { const qd = await apiClient.getAISurveyTeam(teamId); setQuantitativeData((qd as any).data || null); } catch {}
        // Quantitative score
        try { const qs = await apiClient.getQuantitativeScoreTeam(teamId); setQuantitativeScore((qs as any)?.data?.score || null); } catch {}
        // Response volume from validation evidence
        try { const ev = await apiClient.getValidationEvidence(teamId); setResponseVolume((ev as any)?.data?.response_volume || null); } catch {}
        // Optionally, if questions already exist somewhere, you can wire a GET-only endpoint later
        // Software mockups (team-scoped) to wire landing page and media
        try {
          const sm = await apiClient.getSoftwareMockupTeam(teamId);
          const data: any = (sm as any)?.data || {};
          console.log('[AdminModal] software mockups data', data);
          const items: any[] = Array.isArray(data?.mockups) ? data.mockups : [];
          const sortedItems = items.slice().sort((a,b) => {
            const ta = Date.parse(a?.created_at || '') || 0;
            const tb = Date.parse(b?.created_at || '') || 0;
            return tb - ta;
          });
          const demo = (typeof data?.v0_demo_url === 'string' && data.v0_demo_url)
            || (sortedItems.find((m: any) => typeof m?.v0_demo_url === 'string' && m.v0_demo_url)?.v0_demo_url)
            || (sortedItems.find((m: any) => typeof m?.demo_url === 'string' && m.demo_url)?.demo_url)
            || null;
          const normalized = stripTs((toAbsoluteMediaUrl(demo) || demo || null) as any);
          setLandingUrl(normalized);
          const imgs: Array<{ url: string; title?: string; type?: string }> = [];
          const flows: Array<{ url: string; title?: string; type?: string }> = [];
          items.forEach((m: any) => {
            const url: string | undefined = m?.image_url || m?.url || m?.file_url || '';
            const title: string | undefined = m?.title || m?.name;
            const type: string | undefined = m?.type || m?.category;
            if (url) {
              const abs = toAbsoluteMediaUrl(url) || url;
              const isFlow = (type && /flow|chart|diagram/i.test(String(type))) || (title && /flow|chart|diagram/i.test(String(title)));
              if (isFlow) flows.push({ url: abs, title, type }); else imgs.push({ url: abs, title, type });
            }
          });
          // Also fetch team physical mockups (images)
          try {
            const pm = await apiClient.getPhysicalMockupsTeam(teamId);
            const list: any[] = Array.isArray((pm as any)?.data?.mockups) ? (pm as any).data.mockups : [];
            for (const m of list) {
              const url = toAbsoluteMediaUrl(m?.image_url) || m?.image_url;
              if (url) imgs.push({ url, title: m?.title || 'Product Mockup', type: 'image' });
            }
          } catch {}
          // Fetch team service roadmap (structured flow)
          try {
            const sr = await apiClient.getServiceRoadmapTeam(teamId);
            const list: any[] = Array.isArray((sr as any)?.data?.roadmaps) ? (sr as any).data.roadmaps : [];
            if (list.length) {
              // Pick most recent by created_at if available
              const sorted = list.slice().sort((a,b) => {
                const ta = Date.parse(a?.created_at || '') || 0;
                const tb = Date.parse(b?.created_at || '') || 0;
                return tb - ta;
              });
              setServiceDoc(sorted[0]);
            }
          } catch {}
          // Try v0 SDK for the latest demo URL when chat metadata exists
          try {
            const cid: string | undefined = (data?.v0_chat_id as string | undefined)
              || (sortedItems.find((m: any) => m?.v0_chat_id)?.v0_chat_id as string | undefined);
            let latestVid: string | undefined = data?.v0_latest_version_id as string | undefined;
            const anyV0: any = v0 as any;
            if (cid && anyV0?.chats) {
              if (!latestVid && anyV0.chats.getById) {
                try { const info = await anyV0.chats.getById({ chatId: cid }); latestVid = (info as any)?.latestVersion?.id; } catch {}
              }
              if (latestVid && anyV0.chats.getVersion) {
                try {
                  const v = await anyV0.chats.getVersion({ chatId: cid, versionId: latestVid });
                  const live = (v?.demoUrl || v?.webUrl || v?.demo || null) as string | null;
                  if (live) setLandingUrl(stripTs(live));
                } catch {}
              }
            }
          } catch {}

          // If landing still empty after v0 check, try MVP software record as fallback
          if (!demo && !landingUrl) {
            try {
              const smvp = await apiClient.getSoftwareMvpTeam(teamId);
              const d: any = (smvp as any)?.data || {};
              const mvpdemo = d?.v0_demo_url || (Array.isArray(d?.mockups) ? d.mockups.find((m:any)=>m?.v0_demo_url)?.v0_demo_url : null);
              if (mvpdemo && !landingUrl) setLandingUrl(stripTs((toAbsoluteMediaUrl(mvpdemo) || mvpdemo) as any));
            } catch {}
          }
          // De-dupe image URLs
          const seen = new Set<string>();
          const dedupImgs = imgs.filter(i => {
            const k = String(i.url||'').toLowerCase();
            if (!k || seen.has(k)) return false; seen.add(k); return true;
          });
          setMockupImages(dedupImgs);
          setFlowcharts(flows);
        } catch {}
        // Pitch deck data (team-scoped)
        try { const pg = await apiClient.getPitchGuidelinesTeam(teamId); setPitchGuidelines((pg as any).data || null); } catch {}
        try { const pc = await apiClient.getPitchCoachingTeam(teamId); setPitchCoaching((pc as any).data || null); } catch {}
        try { const ps = await apiClient.getPitchDeckSubmissionTeam(teamId); setPitchSubmission((ps as any).data || null); } catch {}
        
        // MVP data (team-scoped)
        try { 
          const mvp = await apiClient.getUnifiedMvp(teamId); 
          const mvpResponse = (mvp as any).data;
          if (mvpResponse) {
            // Combine mvp_data with other fields from the response
            setMvpData({
              ...mvpResponse.mvp_data,
              image_url: mvpResponse.image_url,
              image_prompt: mvpResponse.image_prompt,
              mockup_id: mvpResponse.mockup_id,
              unified_mvp_id: mvpResponse.unified_mvp_id,
              ai_generated: mvpResponse.ai_generated,
              generation_notes: mvpResponse.generation_notes,
              created_at: mvpResponse.created_at,
              updated_at: mvpResponse.updated_at
            });
          } else {
            setMvpData(null);
          }
        } catch {}
        try { const tasks = await apiClient.getMvpTasksTeam(teamId); setTasks((tasks as any).data?.tasks || []); } catch {}
        try { 
          const submission = await apiClient.getMvpSubmission(teamId); 
          setMvpSubmission((submission as any).data?.submission || null); 
        } catch (error) {
          console.error('Error loading MVP submission:', error);
        }
      } finally { setLoading(false); }
    })();
  }, [open, team]);

  // Load interview kit availability and interview sessions when entering Qualitative
  useEffect(() => {
    (async () => {
      if (!open || !team) return;
      if (validationSubsection !== 'qualitative') return;
      try {
        const teamId = (team as any)?.id;
        const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
        const data: any = (res as any)?.data?.data;
        setHasInterviewKit(Boolean((data?.demographic_questions || []).length || (data?.behavioral_questions || []).length));
      } catch { setHasInterviewKit(false); }
      try {
        const teamId = (team as any)?.id;
        const iv = await apiClient.getTeamInterviews(teamId);
        const rows: Array<any> = (iv as any)?.data?.data || [];
        setInterviews(rows.map(r => ({ id: r.id, title: r.title })));
        setSelectedInterviewId(rows.length ? rows[0].id : null);
      } catch {}
      try {
        const teamId = (team as any)?.id;
        const qs = await apiClient.getQualitativeScoreTeam(teamId);
        setQualitativeScore((qs as any)?.data?.score || null);
      } catch {}
    })();
  }, [open, team, validationSubsection]);

  const sections = [
    { key: 'idea', label: 'Idea Generation', viewEnabled: true },
    { key: 'mockups', label: 'Mockups', viewEnabled: true },
    { key: 'validation', label: 'Validation', viewEnabled: true },
    { key: 'pitch_deck', label: 'Pitch Deck', viewEnabled: true },
    { key: 'mentorship_pre', label: 'Pre-MVP Mentorship', viewEnabled: false },
    { key: 'mvp', label: 'MVP Development', viewEnabled: true },
    { key: 'mentorship_post', label: 'Post-MVP Mentorship', viewEnabled: false },
    // Workshops next
    { key: 'finance', label: 'Workshop: Finance', viewEnabled: true },
    { key: 'marketing', label: 'Workshop: Marketing', viewEnabled: true },
    { key: 'legal', label: 'Workshop: Legal', viewEnabled: false },
    // Then launch
    { key: 'launch_prep', label: 'Launch Prep', viewEnabled: false },
    { key: 'launch_execution', label: 'Launch Execution', viewEnabled: false },
    // Pre-investor mentorship and pitch practice
    { key: 'mentorship_pre_investor', label: 'Pre-Investor Mentorship Session', viewEnabled: false },
    { key: 'pitch_practice', label: 'Pitch Practice', viewEnabled: false },
    // Final presentation (for completeness)
    { key: 'investor_presentation', label: 'Investor Presentation', viewEnabled: false },
  ];

  const isLocked = (key: string) => {
    // Default locked unless explicitly unlocked
    if (adminLocks?.[key] === true) return true;
    if (adminUnlocks?.[key] === true) return false;
    return true;
  };

  const toggleLock = (key: string) => {
    if (isLocked(key)) {
      // unlock: set adminUnlocks true, clear adminLocks key
      setAdminUnlocks(prev => ({ ...prev, [key]: true }));
      setAdminLocks(prev => {
        const next = { ...(prev || {}) } as Record<string, boolean>;
        delete next[key];
        return next;
      });
    } else {
      // lock: set adminLocks true, clear adminUnlocks key
      setAdminLocks(prev => ({ ...prev, [key]: true }));
      setAdminUnlocks(prev => {
        const next = { ...(prev || {}) } as Record<string, boolean>;
        delete next[key];
        return next;
      });
    }
  };

  const saveLocks = async () => {
    try {
      setSavingLocks(true);
      const teamId = team.id;
      // Build full maps so server receives explicit true/false for every section
      const keys: string[] = sections.map(s => s.key);
      const locksOut: Record<string, boolean> = {};
      const unlocksOut: Record<string, boolean> = {};
      keys.forEach((k) => {
        const locked = isLocked(k);
        locksOut[k] = locked;
        unlocksOut[k] = !locked;
      });
      console.log('[AdminModal] saving locks', { admin_locks: locksOut, admin_unlocks: unlocksOut });
      const res = await apiClient.updateTeamRoadmap(teamId, { admin_locks: locksOut, admin_unlocks: unlocksOut });
      console.log('[AdminModal] save response', res?.data || res);
      try { localStorage.setItem('xfactory_adminLocksUpdated', String(Date.now())); } catch {}
      toast({ title: 'Saved', description: 'Lock settings saved.' });
    } catch (e) {
      console.error('[AdminModal] save locks failed', e);
      toast({ title: 'Error', description: 'Failed to save locks', variant: 'destructive' });
    } finally { setSavingLocks(false); }
  };

  const resetSection = async (key: string) => {
    try {
      const teamId = team.id;
      const map: Record<string, string> = {
        validation: 'validation',
        pitch_deck: 'pitch_deck',
        mvp: 'mvp',
        finance: 'finance',
        marketing: 'marketing',
        legal: 'legal',
      };
      const payload: any = {};
      if (map[key]) payload[map[key]] = {};
      await apiClient.updateTeamRoadmap(teamId, payload);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team: {team?.name}</DialogTitle>
        </DialogHeader>

        {/* Vertical sections menu (hidden in viewing mode) */}
        {!isViewing && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-end">
              <Button variant="machinery" size="sm" onClick={saveLocks} disabled={savingLocks}>
                {savingLocks ? 'Saving…' : 'Save Locks'}
              </Button>
            </div>
            {sections.map((s) => (
              <div key={s.key} className={`flex items-center justify-between p-3 border rounded-lg ${selectedSection===s.key ? 'bg-muted/40' : ''}`}>
                <button className="text-sm font-semibold text-left" onClick={() => s.viewEnabled ? setSelectedSection(s.key) : null} disabled={!s.viewEnabled}>
                  {s.label}
                </button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleLock(s.key)}>
                    {isLocked(s.key) ? (<><UnlockIcon className="h-4 w-4 mr-1" />Unlock</>) : (<><LockIcon className="h-4 w-4 mr-1" />Lock</>)}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resetSection(s.key)}>
                    <RefreshCw className="h-4 w-4 mr-1" />Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { if (s.viewEnabled) { setSelectedSection(s.key); setIsViewing(true); }}} disabled={!s.viewEnabled}>
                    <Eye className="h-4 w-4 mr-1" />View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section content (only in viewing mode) */}
        {isViewing && (
          <div className="space-y-4">
            <div>
              <Button variant="outline" size="sm" onClick={() => setIsViewing(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            {selectedSection === 'finance' && (
              <div className="min-h-[200px]">
                {/* Finance Submission Links */}
                <div className="mb-4 p-3 border rounded bg-muted/30">
                  <div className="text-sm font-semibold mb-2">Finance Submission</div>
                  {(() => {
                    const fin = (team?.roadmap_completion?.finance || {}) as any;
                    const link = fin.walkthrough_video_link;
                    return link ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground mr-2">Walkthrough Video:</span>
                        <a href={link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{link}</a>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No finance video submitted yet.</div>
                    );
                  })()}
                </div>
              <TeamProgressView
                team={team}
                initialSection="finance"
                mode="admin"
                showSectionNavigation={false}
                onBack={() => setIsViewing(false)}
                  key={`finance-${team.id}`}
              />
              </div>
            )}

            {selectedSection === 'marketing' && (
              <div className="min-h-[200px]">
                {/* Marketing Submission Links */}
                <div className="mb-4 p-3 border rounded bg-muted/30">
                  <div className="text-sm font-semibold mb-2">Marketing Submissions</div>
                  {(() => {
                    const mk = (team?.roadmap_completion?.marketing || {}) as any;
                    const hasAny = mk.strategy_link || mk.branding_link || mk.traction_link;
                    return hasAny ? (
                      <div className="space-y-1 text-sm">
                        {mk.strategy_link && (
                          <div>
                            <span className="text-muted-foreground mr-2">Strategy:</span>
                            <a href={mk.strategy_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{mk.strategy_link}</a>
                          </div>
                        )}
                        {mk.branding_link && (
                          <div>
                            <span className="text-muted-foreground mr-2">Branding:</span>
                            <a href={mk.branding_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{mk.branding_link}</a>
                          </div>
                        )}
                        {mk.traction_link && (
                          <div>
                            <span className="text-muted-foreground mr-2">Validation/Traction:</span>
                            <a href={mk.traction_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{mk.traction_link}</a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No marketing links submitted yet.</div>
                    );
                  })()}
                </div>
              <TeamProgressView
                team={team}
                initialSection="marketing"
                mode="admin"
                showSectionNavigation={false}
                onBack={() => setIsViewing(false)}
                  key={`marketing-${team.id}`}
              />
              </div>
            )}
            {selectedSection === 'idea' && (
              <div className="space-y-4">
                {/* Concept card */}
                {conceptCard ? (
                  <div className="border rounded p-4 space-y-4">
                    <div className="text-lg font-semibold">Concept Card</div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Problem</div>
                        <div className="text-sm">{conceptCard.problem}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Solution</div>
                        <div className="text-sm">{conceptCard.solution}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Target Audience</div>
                        <div className="text-sm">{conceptCard.target_audience}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Current Solutions</div>
                        <div className="text-sm">{conceptCard.current_solutions}</div>
                      </div>
                    </div>
                    {Array.isArray(conceptCard.assumptions) && conceptCard.assumptions.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Key Assumptions</div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {conceptCard.assumptions.slice(0,3).map((a: any, idx: number) => (
                            <div key={idx} className="p-3 rounded border bg-muted/20">
                              <div className="text-sm font-medium">{typeof a === 'string' ? a : (a?.text || '')}</div>
                              {typeof a !== 'string' && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {typeof a?.confidence === 'number' ? `${a.confidence}% confidence` : ''}
                                  {a?.testing_plan ? ` — ${a.testing_plan}` : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border rounded p-3">
                      <div className="text-xs text-muted-foreground mb-1">Elevator Pitch</div>
                      <div className="text-sm">
                        {elevator?.google_drive_link ? (
                          <a href={elevator.google_drive_link} target="_blank" className="underline text-primary">Open Link</a>
                        ) : 'No link submitted.'}
                      </div>
                    </div>
                  </div>
                ) : (<div className="text-sm text-muted-foreground">No concept card found.</div>)}

                {/* Q&A */}
                <div className="border rounded p-4 max-h-[60vh] overflow-auto">
                  <div className="text-lg font-semibold mb-3">Idea Generation Q&A</div>
                  {pst ? (
                    <div className="space-y-2">
                      {Object.entries(pst).filter(([k,v]) => typeof v === 'string' && v).map(([k,v]) => (
                        <div key={k} className="p-2 rounded border bg-background/50">
                          <div className="text-xs text-muted-foreground">{k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                          <div className="text-sm">{String(v)}</div>
                        </div>
                      ))}
                      {personaKit && (
                        <div className="p-2 rounded border bg-muted/20">
                          <div className="text-xs text-muted-foreground mb-1">Interview Strategy</div>
                          <div className="prose prose-sm text-muted-foreground">
                            <ReactMarkdown>{String(personaKit.interview_strategy || '')}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No questionnaire data found.</div>
                  )}
                </div>
              </div>
            )}

            {selectedSection === 'mockups' && (
              <div className="space-y-4">
                {/* Toggle menu */}
                <div className="flex items-center gap-2">
                  <Button variant={mockupTab==='landing'?'default':'outline'} size="sm" onClick={() => setMockupTab('landing')}>Landing</Button>
                  <Button variant={mockupTab==='images'?'default':'outline'} size="sm" onClick={() => setMockupTab('images')}>Images</Button>
                  <Button variant={mockupTab==='service'?'default':'outline'} size="sm" onClick={() => setMockupTab('service')}>Service Flow</Button>
                </div>

                {/* Landing viewer */}
                {mockupTab === 'landing' && (
                  <div className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">Landing Page Preview</div>
                    {landingUrl ? (
                      <div className="space-y-2">
                        {canEmbedDemo(landingUrl) ? (
                          <div className="w-full h-[60vh] border rounded overflow-hidden">
                            <iframe src={cacheBust(landingUrl)} className="w-full h-full" sandbox="allow-scripts allow-same-origin allow-forms" />
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">This host does not allow embedding. Use the link below.</div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground truncate">{landingUrl}</div>
                          <a href={landingUrl} target="_blank" className="underline text-primary">Open</a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No landing page found.</div>
                    )}
                  </div>
                )}

                {/* Images viewer */}
                {mockupTab === 'images' && (
                  <div className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">Mockup Images</div>
                    {mockupImages.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {mockupImages.map((m, idx) => (
                          <div key={idx} className="border rounded overflow-hidden bg-background">
                            <img src={m.url} alt={m.title || `Mockup ${idx+1}`} className="w-full max-h-[60vh] object-contain bg-black/5" />
                            {m.title && <div className="px-2 py-1 text-xs text-muted-foreground truncate">{m.title}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No images found.</div>
                    )}
                  </div>
                )}

                {/* Service roadmap viewer */}
                {mockupTab === 'service' && (
                  <div className="border rounded p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant={serviceSection==='flowchart'?'default':'outline'} size="sm" onClick={() => setServiceSection('flowchart')}>Flowchart</Button>
                      <Button variant={serviceSection==='journeys'?'default':'outline'} size="sm" onClick={() => setServiceSection('journeys')}>Journeys</Button>
                      <Button variant={serviceSection==='timeline'?'default':'outline'} size="sm" onClick={() => setServiceSection('timeline')}>Timeline</Button>
                      <Button variant={serviceSection==='milestones'?'default':'outline'} size="sm" onClick={() => setServiceSection('milestones')}>Milestones</Button>
                      <Button variant={serviceSection==='phases'?'default':'outline'} size="sm" onClick={() => setServiceSection('phases')}>Phases</Button>
                    </div>
                    {renderServiceSection(serviceDoc, serviceSection)}
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'pitch_deck' && (
              <div className="space-y-4">
                {/* Pitch Deck Overview */}
                <div className="border rounded p-4">
                  <div className="text-lg font-semibold mb-4">Pitch Deck Overview</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Guidelines Available</div>
                      <div className={pitchGuidelines ? "text-green-600" : "text-muted-foreground"}>
                        {pitchGuidelines ? "? Generated" : "Not available"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Coaching Available</div>
                      <div className={pitchCoaching ? "text-green-600" : "text-muted-foreground"}>
                        {pitchCoaching ? "? Generated" : "Not available"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Submission Status</div>
                      <div className={pitchSubmission?.submission ? "text-green-600" : "text-muted-foreground"}>
                        {pitchSubmission?.submission ? "? Submitted" : "Not submitted"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Submission Date</div>
                      <div className="text-muted-foreground">
                        {pitchSubmission?.submission?.submitted_at 
                          ? new Date(pitchSubmission.submission.submitted_at).toLocaleDateString()
                          : "—"
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presentation Advice with Navigation */}
                {pitchCoaching?.coaching && (
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-lg font-semibold">Presentation Advice</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentAdviceSlide(Math.max(0, currentAdviceSlide - 1))}
                          disabled={currentAdviceSlide === 0}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentAdviceSlide + 1} / {(() => {
                            const coaching = pitchCoaching.coaching;
                            const adviceSlides = [
                              { title: 'Title Line', content: coaching.title_line },
                              { title: 'Problem', content: coaching.problem_advice },
                              { title: 'Unique Insight', content: coaching.insight_advice },
                              { title: 'Solution', content: coaching.solution_advice },
                              { title: 'Customer Validation', content: coaching.customer_validation_advice },
                              { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                              { title: 'Roadmap', content: coaching.roadmap_advice },
                              { title: 'Team', content: coaching.team_advice },
                              { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                              { title: 'Closing', content: coaching.closing_advice }
                            ];
                            return adviceSlides.length;
                          })()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const coaching = pitchCoaching.coaching;
                            const adviceSlides = [
                              { title: 'Title Line', content: coaching.title_line },
                              { title: 'Problem', content: coaching.problem_advice },
                              { title: 'Unique Insight', content: coaching.insight_advice },
                              { title: 'Solution', content: coaching.solution_advice },
                              { title: 'Customer Validation', content: coaching.customer_validation_advice },
                              { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                              { title: 'Roadmap', content: coaching.roadmap_advice },
                              { title: 'Team', content: coaching.team_advice },
                              { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                              { title: 'Closing', content: coaching.closing_advice }
                            ];
                            setCurrentAdviceSlide(Math.min(adviceSlides.length - 1, currentAdviceSlide + 1));
                          }}
                          disabled={(() => {
                            const coaching = pitchCoaching.coaching;
                            const adviceSlides = [
                              { title: 'Title Line', content: coaching.title_line },
                              { title: 'Problem', content: coaching.problem_advice },
                              { title: 'Unique Insight', content: coaching.insight_advice },
                              { title: 'Solution', content: coaching.solution_advice },
                              { title: 'Customer Validation', content: coaching.customer_validation_advice },
                              { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                              { title: 'Roadmap', content: coaching.roadmap_advice },
                              { title: 'Team', content: coaching.team_advice },
                              { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                              { title: 'Closing', content: coaching.closing_advice }
                            ];
                            return currentAdviceSlide >= adviceSlides.length - 1;
                          })()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    
                    {(() => {
                      const coaching = pitchCoaching.coaching;
                      const adviceSlides = [
                        { title: 'Title Line', content: coaching.title_line },
                        { title: 'Problem', content: coaching.problem_advice },
                        { title: 'Unique Insight', content: coaching.insight_advice },
                        { title: 'Solution', content: coaching.solution_advice },
                        { title: 'Customer Validation', content: coaching.customer_validation_advice },
                        { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                        { title: 'Roadmap', content: coaching.roadmap_advice },
                        { title: 'Team', content: coaching.team_advice },
                        { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                        { title: 'Closing', content: coaching.closing_advice }
                      ];
                      const currentSlide = adviceSlides[currentAdviceSlide];
                      
                      return (
                        <div className="space-y-3">
                          <div className="text-lg font-medium">{currentSlide?.title}</div>
                          <div className="text-sm p-3 bg-muted/50 rounded border-l-4 border-primary">
                            {currentSlide?.content || "No advice available for this section."}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Submission Links */}
                {pitchSubmission?.submission && (
                  <div className="border rounded p-4">
                    <div className="text-lg font-semibold mb-4">Submission Links</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">PDF Presentation</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground truncate flex-1">
                            {pitchSubmission.submission.pdf_link}
                          </div>
                          <a 
                            href={pitchSubmission.submission.pdf_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            Open PDF
                          </a>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">5-Minute Presentation Video</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground truncate flex-1">
                            {pitchSubmission.submission.video_link}
                          </div>
                          <a 
                            href={pitchSubmission.submission.video_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            Open Video
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Data Available */}
                {!pitchCoaching?.coaching && !pitchSubmission?.submission && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-lg mb-2">No Pitch Deck Data Available</div>
                    <div className="text-sm">
                      This team hasn't generated coaching advice or submitted their pitch deck yet.
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'mvp' && (
              <div className="space-y-4">
                {/* MVP Progress Overview */}
                <div className="border rounded p-4">
                  <div className="text-lg font-semibold mb-4">MVP Development Progress</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">MVP Generated</div>
                      <div className={mvpData ? "text-green-600" : "text-muted-foreground"}>
                        {mvpData ? "? Generated" : "Not generated"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Tasks Status</div>
                      <div className={tasks && tasks.length > 0 ? "text-green-600" : "text-muted-foreground"}>
                        {tasks && tasks.length > 0 ? `${tasks.filter(t => t.status === 'completed').length}/${tasks.length} completed` : "No tasks"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Video Submitted</div>
                      <div className={mvpSubmission ? "text-green-600" : "text-muted-foreground"}>
                        {mvpSubmission ? "? Submitted" : "Not submitted"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MVP Generation Status */}
                {mvpData && (
                  <div className="border rounded p-4">
                    <div className="text-lg font-semibold mb-4">MVP Details</div>
                    <div className="space-y-4">
                      {/* MVP Image */}
                      {mvpData.image_url && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-2">MVP Image</div>
                          <div className="flex justify-center">
                            <img 
                              src={mvpData.image_url} 
                              alt="MVP Visualization" 
                              className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                              onError={(e) => {
                                // Fallback to direct backend URL if image fails to load
                                const target = e.target as HTMLImageElement;
                                if (mvpData.image_url && !target.src.includes('localhost:8000')) {
                                  target.src = `https://api.ivyfactory.io${mvpData.image_url}`;
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="font-medium text-muted-foreground">Title</div>
                        <div>{mvpData.mvp_title}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Description</div>
                        <div className="text-sm">{mvpData.mvp_description}</div>
                      </div>
                      {mvpData.key_features && mvpData.key_features.length > 0 && (
                        <div>
                          <div className="font-medium text-muted-foreground">Key Features</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mvpData.key_features.map((feature: string, index: number) => (
                              <Badge key={index} variant="secondary">{feature}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {mvpData.target_users && (
                        <div>
                          <div className="font-medium text-muted-foreground">Target Users</div>
                          <div className="text-sm">{mvpData.target_users}</div>
                        </div>
                      )}
                      {mvpData.value_proposition && (
                        <div>
                          <div className="font-medium text-muted-foreground">Value Proposition</div>
                          <div className="text-sm">{mvpData.value_proposition}</div>
                        </div>
                      )}
                      {mvpData.success_metrics && mvpData.success_metrics.length > 0 && (
                        <div>
                          <div className="font-medium text-muted-foreground">Success Metrics</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mvpData.success_metrics.map((metric: string, index: number) => (
                              <Badge key={index} variant="outline">{metric}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Additional MVP Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="font-medium text-muted-foreground">AI Generated</div>
                          <div className="text-sm">
                            {mvpData.ai_generated ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </div>
                        </div>
                        
                        {mvpData.created_at && (
                          <div>
                            <div className="font-medium text-muted-foreground">Created At</div>
                            <div className="text-sm">
                              {new Date(mvpData.created_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                        
                        {mvpData.updated_at && (
                          <div>
                            <div className="font-medium text-muted-foreground">Last Updated</div>
                            <div className="text-sm">
                              {new Date(mvpData.updated_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                        
                        {mvpData.mockup_id && (
                          <div>
                            <div className="font-medium text-muted-foreground">Mockup ID</div>
                            <div className="text-sm">
                              {mvpData.mockup_id}
                            </div>
                          </div>
                        )}
                        
                        {mvpData.unified_mvp_id && (
                          <div>
                            <div className="font-medium text-muted-foreground">MVP ID</div>
                            <div className="text-sm">
                              {mvpData.unified_mvp_id}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks Status */}
                {tasks && tasks.length > 0 && (
                  <div className="border rounded p-4">
                    <div className="text-lg font-semibold mb-4">Task Progress</div>
                    <div className="space-y-2">
                      {tasks.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                              {task.status === 'completed' ? 'Completed' : 'Pending'}
                            </Badge>
                            <Badge variant="outline">{task.task_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Submission */}
                {mvpSubmission && (
                  <div className="border rounded p-4">
                    <div className="text-lg font-semibold mb-4">Video Submission</div>
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-muted-foreground">Video Link</div>
                        {mvpSubmission.video_link ? (
                          <a 
                            href={mvpSubmission.video_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {mvpSubmission.video_link}
                          </a>
                        ) : (
                          <div className="text-muted-foreground text-sm">No video link provided</div>
                        )}
                      </div>
                      {mvpSubmission.video_description && (
                        <div>
                          <div className="font-medium text-muted-foreground">Description</div>
                          <div className="text-sm">{mvpSubmission.video_description}</div>
                        </div>
                      )}
                      {mvpSubmission.submission_notes && (
                        <div>
                          <div className="font-medium text-muted-foreground">Notes</div>
                          <div className="text-sm">{mvpSubmission.submission_notes}</div>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-muted-foreground">Submitted</div>
                        <div className="text-sm">{new Date(mvpSubmission.submitted_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Data Available */}
                {!mvpData && !tasks && !mvpSubmission && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-lg mb-2">No MVP Data Available</div>
                    <div className="text-sm">
                      This team hasn't generated an MVP or submitted their work yet.
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'validation' && (
              <div className="space-y-4">
                {/* Validation Subsection Selector */}
                <div className="flex space-x-2 mb-4">
                  <Button
                    variant={validationSubsection === 'secondary' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValidationSubsection('secondary')}
                  >
                    Secondary Research
                  </Button>
                  <Button
                    variant={validationSubsection === 'qualitative' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValidationSubsection('qualitative')}
                  >
                    Qualitative
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={validationSubsection === 'quantitative' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setValidationSubsection('quantitative')}
                    >
                      Quantitative
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const secondaryPoints = secondaryScore20 || 0;
                        const qualitativePoints = qualitativeScore ? Math.round((Number(qualitativeScore.final_score_10 || 0) / 10) * 30) : 0;
                        const quantitativePoints = quantitativeScore ? Math.round(quantitativeScore.final_score_50 || 0) : 0;
                        const currentPoints = secondaryPoints + qualitativePoints + quantitativePoints;
                        const totalPoints = 100;
                        return `${currentPoints}/${totalPoints}`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Secondary Research */}
                {validationSubsection === 'secondary' && (
                  <div className="space-y-4">
                    {/* Secondary Score */}
                    <div className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-semibold">Secondary Research Score</div>
                        <div className={`text-2xl font-bold ${
                          (secondaryScore20 ?? 0) >= 17 ? "text-success" :
                          (secondaryScore20 ?? 0) >= 14 ? "text-info" :
                          (secondaryScore20 ?? 0) >= 11 ? "text-warning" : "text-destructive"
                        }`}>
                          {secondaryScore20 !== null ? `${secondaryScore20}/20` : '0/20'}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {secondaryScore20 !== null ? 
                          (secondaryScore20 >= 17 ? "Excellent" :
                           secondaryScore20 >= 14 ? "Good" :
                           secondaryScore20 >= 11 ? "Fair" : "Poor") : "Pending"
                        }
                      </div>
                    </div>
                    
                    {/* Team Scores */}
                    <div className="border rounded p-4">
                      <div className="text-lg font-semibold mb-4">Team Scores</div>
                      <div className="text-sm text-muted-foreground">
                        Current team score: {secondaryScore20 !== null ? `${secondaryScore20}/20` : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="border rounded p-4">
                      <div className="text-lg font-semibold mb-2">Deep Research Report</div>
                      {deepResearch?.report ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium">Title</div>
                            <div className="text-sm text-muted-foreground">{deepResearch.report.title || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Abstract</div>
                            <div className="text-sm text-muted-foreground">{deepResearch.report.abstract || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Status</div>
                            <div className="text-sm">
                              <Badge variant={deepResearch.report.status === 'completed' ? 'success' : 'warning'}>
                                {deepResearch.report.status || 'Unknown'}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Processing Time</div>
                            <div className="text-sm text-muted-foreground">{deepResearch.report.processing_time ? `${deepResearch.report.processing_time.toFixed(2)}s` : 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Key Findings</div>
                            <div className="text-sm text-muted-foreground">
                              {deepResearch.report.key_findings?.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {deepResearch.report.key_findings.map((finding: string, idx: number) => (
                                    <li key={idx}>{finding}</li>
                                  ))}
                                </ul>
                              ) : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Market Size</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="font-medium">TAM</div>
                                <div className="text-muted-foreground">{deepResearch.report.tam || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="font-medium">SAM</div>
                                <div className="text-muted-foreground">{deepResearch.report.sam || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="font-medium">SOM</div>
                                <div className="text-muted-foreground">{deepResearch.report.som || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Full Essay Content */}
                          {deepResearch.report.content && (
                            <div className="mt-6">
                              <div className="text-sm font-medium mb-3">Research Report Content</div>
                              <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed max-h-96 overflow-y-auto border rounded p-4 bg-muted/10">
                                  {deepResearch.report.content}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No deep research report found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Qualitative Validation */}
                {validationSubsection === 'qualitative' && (
                  <div className="space-y-4">
                    {/* Qualitative Score */}
                    <div className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-semibold">Qualitative Validation Score</div>
                        <div className={`text-2xl font-bold ${
                          (qualitativeScore?.final_score_10 ?? 0) >= 8 ? "text-success" :
                          (qualitativeScore?.final_score_10 ?? 0) >= 6 ? "text-info" :
                          (qualitativeScore?.final_score_10 ?? 0) >= 4 ? "text-warning" : "text-destructive"
                        }`}>
                          {(() => {
                            const f10 = Number(qualitativeScore?.final_score_10 || 0);
                            const score30 = Math.round((f10 / 10) * 30);
                            return `${score30}/30`;
                          })()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {(() => {
                          const f10 = Number(qualitativeScore?.final_score_10 || 0);
                          return f10 >= 8 ? "Excellent" :
                                 f10 >= 6 ? "Good" :
                                 f10 >= 4 ? "Fair" : "Poor";
                        })()}
                      </div>
                      <div>
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const teamId = (team as any)?.id;
                            const res = await apiClient.getQualitativeScoreTeam(teamId);
                            const score: any = (res as any)?.data?.score;
                            setQualitativeScore(score || null);
                          } catch {}
                        }}>Refresh</Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {qualitativeScore ? 'Score available' : 'No score available yet'}
                      </div>
                    </div>
                    <div className="border rounded p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-semibold">Qualitative Questions & Insights</div>
                        <div className="flex items-center gap-2">
                          {/* Interview session menu */}
                          <select
                            className="px-2 py-1 border rounded bg-background text-foreground text-sm"
                            value={selectedInterviewId || ''}
                            onChange={async (e) => {
                              const id = e.target.value ? Number(e.target.value) : null;
                              setSelectedInterviewId(id);
                              try {
                                const teamId = (team as any)?.id;
                                const qi = await apiClient.getQualInsightsTeam(teamId, id || undefined);
                                setQualitativeInsights((qi as any).data || null);
                              } catch {}
                            }}
                          >
                            {interviews.length === 0 && <option value="">No sessions</option>}
                            {interviews.map((it) => (
                              <option key={it.id} value={it.id}>{it.title}</option>
                            ))}
                          </select>
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              const teamId = (team as any)?.id;
                              const title = `Interview Session ${interviews.length + 1}`;
                              const res = await apiClient.createTeamInterview(teamId, title);
                              if ((res as any)?.data?.data) {
                                const iv = await apiClient.getTeamInterviews(teamId);
                                const rows: Array<any> = (iv as any)?.data?.data || [];
                                setInterviews(rows.map(r => ({ id: r.id, title: r.title })));
                                setSelectedInterviewId(rows.length ? rows[0].id : null);
                              }
                            } catch {}
                          }}>New</Button>
                          <Button
                            variant={qualitativeViewMode === 'interview' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setQualitativeViewMode('interview')}
                          >
                            Interview
                          </Button>
                          <Button
                            variant={qualitativeViewMode === 'focus-group' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setQualitativeViewMode('focus-group')}
                          >
                            Focus Group
                          </Button>
                        </div>
                      </div>
                      
                      {qualitativeViewMode === 'interview' ? (
                        qualitativeInsights?.data?.length > 0 ? (
                          <div className="space-y-3">
                            {qualitativeInsights.data.map((insight: any, idx: number) => (
                              <div key={idx} className="p-3 border rounded bg-muted/20">
                                <div className="text-sm font-medium capitalize">{insight.section?.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-muted-foreground mb-1">Q: {insight.question}</div>
                                <div className="text-sm">A: {insight.insight}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No interview insights found</div>
                        )
                      ) : (
                        focusGroupInsights?.data?.length > 0 ? (
                          <div className="space-y-3">
                            {focusGroupInsights.data.map((insight: any, idx: number) => (
                              <div key={idx} className="p-3 border rounded bg-muted/20">
                                <div className="text-sm font-medium capitalize">{insight.section?.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-muted-foreground mb-1">Q: {insight.question}</div>
                                <div className="text-sm">A: {insight.insight}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No focus group insights found</div>
                        )
                      )}
                    </div>
                    <div className="border rounded p-4">
                      <div className="text-lg font-semibold mb-2">Qualitative Evidence Links</div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Interviews: </span>
                          {validationEvidence?.qual_interview_link ? (
                            <a href={validationEvidence.qual_interview_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.qual_interview_link}
                            </a>
                          ) : 'N/A'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Focus Groups: </span>
                          {validationEvidence?.qual_focus_group_link ? (
                            <a href={validationEvidence.qual_focus_group_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.qual_focus_group_link}
                            </a>
                          ) : 'N/A'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Transcript Folders: </span>
                          {validationEvidence?.qual_transcript_link ? (
                            <a href={validationEvidence.qual_transcript_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.qual_transcript_link}
                            </a>
                          ) : '�'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Legacy Folder: </span>
                          {validationEvidence?.qual_folder_link ? (
                            <a href={validationEvidence.qual_folder_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.qual_folder_link}
                            </a>
                          ) : '�'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantitative Validation */}
                {validationSubsection === 'quantitative' && (
                  <div className="space-y-4">
                    {/* Quantitative Score */}
                    <div className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-semibold">Quantitative Validation Score</div>
                        <div className={`text-2xl font-bold ${
                          quantitativeScore ? "text-success" : "text-muted-foreground"
                        }`}>
                          {quantitativeScore ? `${Math.round(quantitativeScore.final_score_50 || 0)}/50` : "0/50"}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {quantitativeScore ? "Scored" : (quantitativeData?.questions?.length > 0 ? "Generated" : "Pending")}
                      </div>
                      {responseVolume && (
                        <div className="text-sm text-primary font-medium">
                          Response Volume: {responseVolume} responses
                        </div>
                      )}
                    </div>
                    <div className="border rounded p-4">
                      <div className="text-lg font-semibold mb-2">Survey Questions</div>
                      {quantitativeData?.questions?.length > 0 ? (
                        <div className="space-y-3">
                          {quantitativeData.questions.map((question: any, idx: number) => (
                            <div key={idx} className="p-3 border rounded bg-muted/20">
                              <div className="text-sm font-medium">Question {idx + 1}</div>
                              <div className="text-sm text-muted-foreground mb-2">{question.text}</div>
                              <div className="text-xs text-muted-foreground">
                                Type: {question.type} | Required: {question.required ? 'Yes' : 'No'}
                                {question.options && (
                                  <div className="mt-1">
                                    Options: {question.options.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No survey questions found</div>
                      )}
                    </div>
                    <div className="border rounded p-4">
                      <div className="text-lg font-semibold mb-2">Evidence Links</div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Survey Link: </span>
                          {validationEvidence?.survey_link ? (
                            <a href={validationEvidence.survey_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.survey_link}
                            </a>
                          ) : '�'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Google Forms: </span>
                          {validationEvidence?.quant_google_form_link ? (
                            <a href={validationEvidence.quant_google_form_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.quant_google_form_link}
                            </a>
                          ) : '�'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Video Evidence: </span>
                          {validationEvidence?.quant_video_link ? (
                            <a href={validationEvidence.quant_video_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {validationEvidence.quant_video_link}
                            </a>
                          ) : '�'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
      
    </Dialog>
  );
};

interface User {
  id: number;
  email: string;
  name: string;
  user_type: "student" | "investor" | "mentor";
  user_type_display: string;
  status: "active" | "pending" | "inactive";
  status_display: string;
  has_registered: boolean;
  registered_at: string | null;
  added_by_name: string;
  created_at: string;
  notes: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState<boolean>(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [isMatchingMentors, setIsMatchingMentors] = useState(false);
  const [isMatchingInvestors, setIsMatchingInvestors] = useState(false);
  const [isAutoForming, setIsAutoForming] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserType, setNewUserType] = useState<"student" | "investor" | "mentor">("student");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkUserType, setBulkUserType] = useState<"student" | "investor" | "mentor">("student");
  const [userFilter, setUserFilter] = useState<"all" | "student" | "investor" | "mentor">("all");
  
  // Manage mentor/investor assignment states
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [managingTeam, setManagingTeam] = useState<any | null>(null);
  const [manageType, setManageType] = useState<'mentor' | 'investor'>('mentor');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  // Load allowed users on component mount
  useEffect(() => {
    loadAllowedUsers();
    loadTeams();
  }, []);

  const loadAllowedUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/auth/allowed-users/');
      if (response.data) {
        setUsers(response.data.allowed_users);
      }
    } catch (error) {
      console.error('Error loading allowed users:', error);
      toast({ title: "Error", description: "Failed to load allowed users", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const loadTeams = async () => {
    try {
      const res = await apiClient.getAdminTeams();
      if (res?.data?.items) {
        const teamsWithScores = await Promise.all(
          res.data.items.map(async (team: any) => {
            try {
              const scoreRes = await apiClient.getSecondaryScoreTeam(team.id);
              const score = (scoreRes as any)?.data?.final_score_20 || null;
              return { ...team, secondary_score: score };
            } catch {
              return { ...team, secondary_score: null };
            }
          })
        );
        setTeams(teamsWithScores);
      }
    } catch {}
  };

  const openTeamModal = (team: any) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
  };

  const openMemberInfo = async (e: React.MouseEvent, member: any, team: any) => {
    e.stopPropagation();
    setSelectedMember(member);
    setShowMemberInfo(true);
    try {
      setIsLoadingMember(true);
      const res = await apiClient.getAdminTeams();
      const freshTeams = (res as any)?.data?.items || [];
      const freshTeam = freshTeams.find((t: any) => t.id === team.id);
      const freshMember = freshTeam?.memberships?.find((m: any) => m.id === member.id);
      if (freshMember) setSelectedMember(freshMember);
    } catch {}
    finally { setIsLoadingMember(false); }
  };

  const triggerAutoFormTeams = async () => {
    try {
      setIsAutoForming(true);
      const res = await apiClient.post('/admin/auto-form-teams/', {});
      if (res.status >= 200 && res.status < 300) {
        toast({ title: 'Team Formation Complete', description: 'Users without teams were grouped.' });
        await loadTeams();
      } else {
        toast({ title: 'Auto-form failed', description: res.error || 'Check admin privileges', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Auto-form failed', description: 'Network or permission error', variant: 'destructive' });
    } finally { setIsAutoForming(false); }
  };

  const triggerMentorMatching = async () => {
    try {
      setIsMatchingMentors(true);
      const res = await apiClient.post('/admin/match-mentors/', {});
      if (res.status >= 200 && res.status < 300) {
        toast({ title: 'Mentor Matching Complete', description: 'Mentors paired with teams.' });
      } else {
        toast({ title: 'Mentor Matching Failed', description: res.error || 'Check admin privileges', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Mentor Matching Failed', description: 'Network or permission error', variant: 'destructive' });
    } finally { setIsMatchingMentors(false); }
  };

  const triggerInvestorMatching = async () => {
    try {
      setIsMatchingInvestors(true);
      const res = await apiClient.post('/admin/match-investors/', {});
      if (res.status >= 200 && res.status < 300) {
        toast({ title: 'Investor Matching Complete', description: 'Investors paired with teams.' });
      } else {
        toast({ title: 'Investor Matching Failed', description: res.error || 'Check admin privileges', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Investor Matching Failed', description: 'Network or permission error', variant: 'destructive' });
    } finally { setIsMatchingInvestors(false); }
  };

  const resetAll = async () => {
    try {
      setIsResettingAll(true);
      const token = localStorage.getItem('authToken');
      await fetch('https://api.ivyfactory.io/api/auth/admin/reset-all-progress/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        }
      });
      toast({ title: 'Reset complete', description: 'All progress and artifacts were reset' });
      await Promise.all([loadAllowedUsers(), loadTeams()]);
    } catch (e) {
      toast({ title: 'Reset failed', description: 'Check admin privileges', variant: 'destructive' });
    } finally { setIsResettingAll(false); }
  };

  const addSingleUser = async () => {
    if (!newUserEmail || !newUserName) return;
    try {
      setIsCreating(true);
      const response = await apiClient.post('/auth/allowed-users/create/', {
        email: newUserEmail,
        name: newUserName,
        user_type: newUserType,
        status: 'pending'
      });
      if (response.data) {
        setUsers(prev => [...prev, response.data.allowed_user]);
        setNewUserEmail("");
        setNewUserName("");
        toast({ title: "Success", description: "User added successfully" });
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast({ title: "Error", description: "Failed to add user", variant: "destructive" });
    } finally { setIsCreating(false); }
  };

  const addBulkUsers = async () => {
    if (!bulkEmails.trim()) return;

    try {
      setIsCreating(true);
      const lines = bulkEmails.split('\n').filter(line => line.trim());
      
      // Parse each line as "FirstName,LastName,Email"
      const users = lines.map(line => {
        const parts = line.split(',').map(part => part.trim());
        if (parts.length !== 3) {
          throw new Error(`Invalid format: ${line}. Expected: FirstName,LastName,Email`);
        }
        return {
          first_name: parts[0],
          last_name: parts[1],
          email: parts[2]
        };
      });
      
      const response = await apiClient.post('/auth/allowed-users/bulk-create/', {
        users: users,
        user_type: bulkUserType,
        status: 'pending'
      });

      if (response.data) {
        setUsers(prev => [...prev, ...response.data.created_users]);
        setBulkEmails("");
        toast({
          title: "Success",
          description: `Added ${response.data.created_count} users successfully`,
        });
      }
    } catch (error) {
      console.error('Error adding bulk users:', error);
      toast({
        title: "Error",
        description: "Failed to add users",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const removeUser = async (id: number) => {
    try {
      const response = await apiClient.delete(`/auth/allowed-users/${id}/delete/`);
      if (response.status === 200) {
        setUsers(prev => prev.filter(user => user.id !== id));
        toast({
          title: "Success",
          description: "User removed successfully",
        });
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (id: number) => {
    try {
      const user = users.find(u => u.id === id);
      if (!user) return;

      const newStatus = user.status === "active" ? "inactive" : "active";
      const response = await apiClient.put(`/auth/allowed-users/${id}/update/`, {
        status: newStatus
      });

      if (response.data) {
        setUsers(prev => prev.map(user => 
          user.id === id 
            ? { ...user, status: newStatus, status_display: newStatus === "active" ? "Active" : "Inactive" }
            : user
        ));
        toast({
          title: "Success",
          description: `User status updated to ${newStatus}`,
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  // Handle opening manage dialog and loading available users
  const handleOpenManageDialog = async (team: any, type: 'mentor' | 'investor') => {
    setManagingTeam(team);
    setManageType(type);
    setSelectedUserId(null);
    
    // Load available users of the specified type
    const availableUsersOfType = users.filter(user => user.user_type === type && user.status === 'active');
    setAvailableUsers(availableUsersOfType);
    
    setManageDialogOpen(true);
  };

  // Handle assigning a user to a team
  const handleAssignUser = async () => {
    if (!selectedUserId || !managingTeam) return;
    
    setIsManaging(true);
    try {
      const user = availableUsers.find(u => u.id === selectedUserId);
      if (!user) return;

      if (manageType === 'mentor') {
        // Remove existing mentor assignment first (if we have an id)
        const currentMentorId = Array.isArray(managingTeam.mentors) && managingTeam.mentors[0]?.id;
        if (currentMentorId) {
          await apiClient.delete(`/admin/teams/${managingTeam.id}/remove-mentor/${currentMentorId}/`);
        }
        // Assign new mentor via admin endpoint
        await apiClient.post(`/admin/teams/${managingTeam.id}/assign-mentor/`, { mentor_id: selectedUserId });
      } else {
        // Remove existing investor assignment first (if we have an id)
        const currentInvestorId = Array.isArray(managingTeam.investors) && managingTeam.investors[0]?.id;
        if (currentInvestorId) {
          await apiClient.delete(`/admin/teams/${managingTeam.id}/remove-investor/${currentInvestorId}/`);
        }
        // Assign new investor via admin endpoint
        await apiClient.post(`/admin/teams/${managingTeam.id}/assign-investor/`, { investor_id: selectedUserId });
      }

      // Refresh teams data
      await loadTeams();
      
      toast({
        title: "Success",
        description: `${manageType === 'mentor' ? 'Mentor' : 'Investor'} assigned successfully`,
      });
      
      setManageDialogOpen(false);
    } catch (error) {
      console.error(`Error assigning ${manageType}:`, error);
      toast({
        title: "Error",
        description: `Failed to assign ${manageType}`,
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  };

  // Handle removing assignment
  const handleRemoveAssignment = async () => {
    if (!managingTeam) return;
    
    setIsManaging(true);
    try {
      if (manageType === 'mentor') {
        const currentMentorId = Array.isArray(managingTeam.mentors) && managingTeam.mentors[0]?.id;
        if (currentMentorId) {
          await apiClient.delete(`/admin/teams/${managingTeam.id}/remove-mentor/${currentMentorId}/`);
        }
      } else {
        const currentInvestorId = Array.isArray(managingTeam.investors) && managingTeam.investors[0]?.id;
        if (currentInvestorId) {
          await apiClient.delete(`/admin/teams/${managingTeam.id}/remove-investor/${currentInvestorId}/`);
        }
      }

      // Refresh teams data
      await loadTeams();
      
      toast({
        title: "Success",
        description: `${manageType === 'mentor' ? 'Mentor' : 'Investor'} removed successfully`,
      });
    } catch (error) {
      console.error(`Error removing ${manageType}:`, error);
      toast({
        title: "Error",
        description: `Failed to remove ${manageType}`,
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "pending": return "warning";
      case "inactive": return "secondary";
      default: return "secondary";
    }
  };

  const getUserTypeIcon = (type: "student" | "investor" | "mentor") => {
    switch (type) {
      case "student": return <GraduationCap className="h-5 w-5 text-primary-foreground" />;
      case "investor": return <Briefcase className="h-5 w-5 text-primary-foreground" />;
      case "mentor": return <Heart className="h-5 w-5 text-primary-foreground" />;
    }
  };

  const getUserTypeLabel = (type: "student" | "investor" | "mentor") => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredUsers = users.filter(user => 
    userFilter === "all" || user.user_type === userFilter
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Header */}
      <div className="border-b border-border bg-gradient-conveyor relative">
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
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left: Section name and icon (bounded left) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
                <Factory className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Ivy Factory Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage student access and permissions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Admin Controls */}
        <Card className="shadow-industrial">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>Danger zone: irreversible actions</CardDescription>
            </div>
            <Button variant="destructive" onClick={resetAll} disabled={isResettingAll}>
              {isResettingAll ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</>) : (<>Reset ALL Progress</>)}
            </Button>
          </CardHeader>
        </Card>

        {/* System Actions */}
        <Card className="shadow-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Admin Actions</CardTitle>
            <CardDescription>Run automated pairing and maintenance tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={triggerAutoFormTeams} disabled={isAutoForming}>
              {isAutoForming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UsersIcon className="h-4 w-4 mr-2" />}
              Auto-form Teams
            </Button>
            <Button variant="outline" onClick={triggerMentorMatching} disabled={isMatchingMentors}>
              {isMatchingMentors ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GraduationCap className="h-4 w-4 mr-2" />}
              Pair Mentors ? Teams
            </Button>
            <Button variant="outline" onClick={triggerInvestorMatching} disabled={isMatchingInvestors}>
              {isMatchingInvestors ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Briefcase className="h-4 w-4 mr-2" />}
              Pair Investors ? Teams
            </Button>
            <Button variant="destructive" onClick={resetAll} disabled={isResettingAll}>
              {isResettingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Reset All Progress
            </Button>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-industrial">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-industrial">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.user_type === "student").length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-industrial">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.user_type === "investor").length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-industrial">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mentors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.user_type === "mentor").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teams and Members */}
        <Card className="shadow-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" /> Teams & Members
            </CardTitle>
            <CardDescription>Overview of teams and active memberships</CardDescription>
          </CardHeader>
          <CardContent>
            {teams && teams.length > 0 ? (
              <div className="space-y-4">
                {teams.map((team: any) => (
                  <div key={team.id} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => openTeamModal(team)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{team.name}</div>
                        <div className="text-xs text-muted-foreground">{team.description || 'No description'}</div>
                          <div className="mt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Mentor: </span>
                        {Array.isArray(team.mentors) && team.mentors.length > 0 ? (
                          <>
                            <Badge variant="accent">{team.mentors[0].name || team.mentors[0].email}</Badge>
                            {team.roadmap_completion?.mentorship?.rating ? (
                              <span className="ml-1">Rating: {team.roadmap_completion.mentorship.rating}/5</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenManageDialog(team, 'mentor');
                          }}
                        >
                          Manage
                        </Button>
                          </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">Investor: </span>
                        {Array.isArray(team.investors) && team.investors.length > 0 ? (
                          <Badge variant="secondary">{team.investors[0].name || team.investors[0].email}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenManageDialog(team, 'investor');
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                      {/* Rating removed from below investor; now shown next to mentor */}
                    </div>
                      </div>
                      <Badge variant="secondary">{team.current_member_count}/{team.max_members}</Badge>
                    </div>
                    {Array.isArray(team.memberships) && team.memberships.length > 0 ? (
                      <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {team.memberships.map((m: any) => (
                          <div 
                            key={m.id} 
                            className="text-sm p-2 rounded bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                            onClick={(e) => openMemberInfo(e, m, team)}
                          >
                            <div className="font-medium">{m.user?.full_name || m.user?.email || 'Member'}</div>
                            <div className="text-xs text-muted-foreground">{m.assigned_archetype || 'Unassigned'}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-2">No members</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No teams found.</div>
            )}
          </CardContent>
        </Card>

        {showTeamModal && selectedTeam && (
          <TeamAdminModal 
            open={showTeamModal}
            onOpenChange={setShowTeamModal}
            team={selectedTeam}
          />
        )}

        {/* Add Users Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single User */}
          <Card className="shadow-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Single User
              </CardTitle>
              <CardDescription>
                Add users one by one to the allowed list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userType">User Type</Label>
                <Select value={newUserType} onValueChange={(value: "student" | "investor" | "mentor") => setNewUserType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userName">Name</Label>
                <Input
                  id="userName"
                  placeholder="John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email Address</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={addSingleUser}
                disabled={!newUserEmail || !newUserName || isCreating}
                className="w-full"
                variant="machinery"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add {getUserTypeLabel(newUserType)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Users */}
          <Card className="shadow-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Add Users
              </CardTitle>
              <CardDescription>
                Add multiple users using First Name, Last Name, Email format (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkUserType">User Type</Label>
                <Select value={bulkUserType} onValueChange={(value: "student" | "investor" | "mentor") => setBulkUserType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="investor">Investors</SelectItem>
                    <SelectItem value="mentor">Mentors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkEmails">User Information (First Name, Last Name, Email)</Label>
                <Textarea
                  id="bulkEmails"
                  placeholder="John,Doe,john.doe@example.com&#10;Jane,Smith,jane.smith@example.com&#10;Bob,Johnson,bob.johnson@example.com"
                  rows={6}
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                />
              </div>
              <Button 
                onClick={addBulkUsers}
                disabled={!bulkEmails.trim() || isCreating}
                className="w-full"
                variant="success"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Add All {getUserTypeLabel(bulkUserType)}s
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card className="shadow-industrial">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Access List
                </CardTitle>
                <CardDescription>
                  Manage user permissions and access status
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <Label htmlFor="userFilter" className="text-sm font-medium">Filter by type:</Label>
                <Select value={userFilter} onValueChange={(value: "all" | "student" | "investor" | "mentor") => setUserFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users ({users.length})</SelectItem>
                    <SelectItem value="student">Students ({users.filter(u => u.user_type === "student").length})</SelectItem>
                    <SelectItem value="investor">Investors ({users.filter(u => u.user_type === "investor").length})</SelectItem>
                    <SelectItem value="mentor">Mentors ({users.filter(u => u.user_type === "mentor").length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <div className="text-muted-foreground">Loading users...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users added yet. Add some users to get started.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-machinery rounded-full flex items-center justify-center">
                        {getUserTypeIcon(user.user_type)}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {getUserTypeLabel(user.user_type)} — Added: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Info Popup */}
      <Dialog open={showMemberInfo} onOpenChange={setShowMemberInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Member Information</DialogTitle>
            <DialogDescription>
              Student details and team information
            </DialogDescription>
          </DialogHeader>
          {isLoadingMember && (
            <div className="text-sm text-muted-foreground">Loading member details�</div>
          )}
          {selectedMember && !isLoadingMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-muted-foreground">Full Name</label>
                  <p className="mt-1">{selectedMember.user?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Email</label>
                  <p className="mt-1">{selectedMember.user?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Student ID</label>
                  <p className="mt-1">{selectedMember.user?.student_id || 'Not provided'}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">College</label>
                  <p className="mt-1">{selectedMember.user?.college || 'Not provided'}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Major</label>
                  <p className="mt-1">{selectedMember.user?.major || 'Not provided'}</p>

                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Role</label>
                  <p className="mt-1">{selectedMember.assigned_archetype || 'Unassigned'}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm">
                  <label className="font-medium text-muted-foreground">Joined Team</label>
                  <p className="mt-1">
                    {selectedMember.created_at 
                      ? new Date(selectedMember.created_at).toLocaleDateString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberInfo(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Mentor/Investor Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Manage {manageType === 'mentor' ? 'Mentor' : 'Investor'} - {managingTeam?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Assignment */}
            <div>
              <Label className="text-sm font-medium">Current {manageType === 'mentor' ? 'Mentor' : 'Investor'}</Label>
              <div className="mt-1">
                {manageType === 'mentor' ? (
                  Array.isArray(managingTeam?.mentors) && managingTeam.mentors.length > 0 ? (
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span>{managingTeam.mentors[0].name || managingTeam.mentors[0].email}</span>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={handleRemoveAssignment}
                        disabled={isManaging}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No {manageType} assigned</span>
                  )
                ) : (
                  Array.isArray(managingTeam?.investors) && managingTeam.investors.length > 0 ? (
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span>{managingTeam.investors[0].name || managingTeam.investors[0].email}</span>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={handleRemoveAssignment}
                        disabled={isManaging}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No {manageType} assigned</span>
                  )
                )}
              </div>
            </div>

            {/* Add New Assignment */}
            <div>
              <Label className="text-sm font-medium">Assign New {manageType === 'mentor' ? 'Mentor' : 'Investor'}</Label>
              <Select value={selectedUserId?.toString() || ""} onValueChange={(value) => setSelectedUserId(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Select a ${manageType}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter(user => user.user_type === manageType)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{user.full_name || user.email}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedUserId(user.id);
                              setShowMemberInfo(true);
                              setSelectedMember({ user, id: user.id });
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignUser} 
                disabled={!selectedUserId || isManaging}
              >
                {isManaging ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};







