import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { v0 } from 'v0-sdk';
import { Clock } from 'lucide-react';
import { apiClient, toAbsoluteMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type TeamProgressSectionKey = 'idea' | 'mockups' | 'validation' | 'pitch_deck' | 'mvp' | 'finance' | 'marketing' | 'assignments';

interface TeamProgressViewProps {
  team?: any;
  initialSection?: TeamProgressSectionKey;
  onBack?: () => void;
  showSectionNavigation?: boolean;
  includeAssignments?: boolean;
  mode?: 'admin' | 'mentor';
}

const canEmbedDemo = (u?: string | null) => {
  if (!u) return false;
  try {
    const host = new URL(u).host.toLowerCase();
    if (host.endsWith('v0.app') || host.endsWith('vusercontent.net')) return false;
    return true;
  } catch {
    return false;
  }
};

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
  } catch {
    return `${base}${base.includes('?') ? '&' : '?'}ts=${Date.now()}`;
  }
};

const safeNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value: any): string => {
  const amount = safeNumber(value);
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

const formatPercent = (value: any, fractionDigits = 1): string => {
  const num = safeNumber(value);
  return `${num.toFixed(fractionDigits)}%`;
};

const JourneyFlowSVG = ({ stages }: { stages: Array<{ stage?: string; activities?: any[]; touchpoints?: any[] }> }) => {
  const items = Array.isArray(stages) ? stages : [];
  if (!items.length) return null;
  const nodeW = 220;
  const nodeH = 90;
  const gap = 40;
  const pad = 16;
  const width = items.length * nodeW + (items.length - 1) * gap + pad * 2;
  const height = nodeH + pad * 2 + 8;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" style={{ maxWidth: '100%' }}>
        <defs>
          <marker id="mentor-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L0,10 L10,5 z" fill="#6366f1" />
          </marker>
        </defs>
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" strokeWidth={2} />
        {items.map((stageEntry: any, index: number) => {
          const label = String(stageEntry?.stage || `Stage ${index + 1}`);
          const x = pad + index * (nodeW + gap);
          const y = pad;
          const cx = x + nodeW;
          const cy = y + nodeH / 2;
          const nx = x + nodeW + gap;
          const ny = cy;
          const acts = Array.isArray(stageEntry?.activities) ? stageEntry.activities.slice(0, 2) : [];
          const tps = Array.isArray(stageEntry?.touchpoints) ? stageEntry.touchpoints.slice(0, 2) : [];
          return (
            <g key={index}>
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
              {index < items.length - 1 && (
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#6366f1" strokeWidth={2} markerEnd="url(#mentor-arrow)" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface FlowNode { id: string; label: string; lane?: string }
interface FlowEdge { from: string; to: string; label?: string }

const FlowchartSVG = ({ flow }: { flow: { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] } }) => {
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  if (!nodes.length) return null;
  const lanes = (Array.isArray(flow?.lanes) && flow.lanes.length)
    ? flow.lanes
    : Array.from(new Set(nodes.map((node) => node.lane || 'Flow')));
  const laneHeight = 120;
  const nodeWidth = 180;
  const nodeHeight = 60;
  const horizontalGap = 60;
  const verticalGap = 40;
  const pad = 32;
  const width = nodes.length * (nodeWidth + horizontalGap) + pad * 2;
  const height = lanes.length * (laneHeight + verticalGap) + pad;

  const lanePositions = lanes.reduce<Record<string, number>>((acc, lane, idx) => {
    acc[lane] = pad + idx * (laneHeight + verticalGap);
    return acc;
  }, {});

  const nodePositions = nodes.reduce<Record<string, { x: number; y: number }>>((acc, node, idx) => {
    const laneY = lanePositions[node.lane || lanes[0]];
    const x = pad + idx * (nodeWidth + horizontalGap);
    acc[node.id] = { x, y: laneY };
    return acc;
  }, {});

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full">
        <defs>
          <marker id="mentor-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L0,10 L10,5 z" fill="#6366f1" />
          </marker>
        </defs>
        {lanes.map((lane, idx) => (
          <g key={lane}>
            <rect
              x={pad / 2}
              y={pad + idx * (laneHeight + verticalGap) - 18}
              width={width - pad}
              height={laneHeight + 36}
              fill="#f9fafb"
              stroke="#e5e7eb"
              strokeWidth={idx === 0 ? 1 : 0.5}
              opacity={0.6}
            />
            <text
              x={pad}
              y={pad + idx * (laneHeight + verticalGap) - 24}
              fill="#6b7280"
              fontSize="12"
              fontWeight={600}
            >
              {lane}
            </text>
          </g>
        ))}
        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          return (
            <g key={node.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={nodeWidth}
                height={nodeHeight}
                rx={12}
                ry={12}
                fill="#ffffff"
                stroke="#6366f1"
                strokeWidth={1.5}
              />
              <text
                x={pos.x + nodeWidth / 2}
                y={pos.y + nodeHeight / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#111827"
                fontSize="13"
                fontWeight={600}
              >
                {node.label}
              </text>
            </g>
          );
        })}
        {edges.map((edge, idx) => {
          const from = nodePositions[edge.from];
          const to = nodePositions[edge.to];
          if (!from || !to) return null;
          const midX = (from.x + to.x + nodeWidth) / 2;
          const midY = from.y + nodeHeight / 2;
          return (
            <g key={idx}>
              <line
                x1={from.x + nodeWidth}
                y1={from.y + nodeHeight / 2}
                x2={to.x}
                y2={to.y + nodeHeight / 2}
                stroke="#6366f1"
                strokeWidth={1.5}
                markerEnd="url(#mentor-arrow)"
              />
              {edge.label && (
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  fill="#4b5563"
                  fontSize="11"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const renderServiceSection = (
  doc: any,
  section: 'flowchart' | 'journeys' | 'timeline' | 'milestones' | 'phases'
) => {
  const rd = (doc && (doc.roadmap_data || doc)) || null;
  if (!rd) return (<div className="text-sm text-muted-foreground">No service roadmap saved.</div>);
  if (section === 'flowchart') {
    const flow = rd?.service_flowchart;
    if (flow && Array.isArray(flow?.nodes) && Array.isArray(flow?.edges)) {
      return <FlowchartSVG flow={flow} />;
    }
    const stages = Array.isArray(rd?.journey_maps?.stages) ? rd.journey_maps.stages
      : (Array.isArray(rd?.stages) ? rd.stages
      : (Array.isArray(rd?.journey_maps?.personas?.[0]?.journey_stages) ? rd.journey_maps.personas[0].journey_stages : []));
    return stages.length
      ? <JourneyFlowSVG stages={stages} />
      : <div className="text-sm text-muted-foreground">No journey stages available.</div>;
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
        <div className="grid gap-2">
          {stages.map((stage: any, idx: number) => (
            <div key={idx} className="p-3 border rounded bg-muted/20">
              <div className="text-sm font-semibold">{stage?.stage || `Stage ${idx + 1}`}</div>
              {stage?.activities && (
                <div className="text-xs text-muted-foreground">Activities: {stage.activities.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (section === 'timeline') {
    const timeline = rd?.timeline_events || rd?.timeline || [];
    if (!Array.isArray(timeline) || !timeline.length) {
      return <div className="text-sm text-muted-foreground">No timeline events documented.</div>;
    }
    return (
      <div className="space-y-3">
        {timeline.map((event: any, idx: number) => (
          <div key={idx} className="p-3 border rounded bg-muted/10">
            <div className="text-sm font-semibold">{event?.title || `Milestone ${idx + 1}`}</div>
            {event?.date && <div className="text-xs text-muted-foreground">{event.date}</div>}
            {event?.description && <div className="text-sm mt-1">{event.description}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (section === 'milestones') {
    const milestones = rd?.milestones || [];
    if (!Array.isArray(milestones) || !milestones.length) {
      return <div className="text-sm text-muted-foreground">No milestones documented.</div>;
    }
    return (
      <div className="grid gap-3">
        {milestones.map((milestone: any, idx: number) => (
          <div key={idx} className="p-3 border rounded bg-muted/10">
            <div className="text-sm font-semibold">{milestone?.title || `Milestone ${idx + 1}`}</div>
            {milestone?.goal && <div className="text-xs text-muted-foreground">Goal: {milestone.goal}</div>}
            {milestone?.status && <div className="text-xs text-muted-foreground">Status: {milestone.status}</div>}
          </div>
        ))}
      </div>
    );
  }
  const phases = rd?.phases || [];
  if (!Array.isArray(phases) || !phases.length) {
    return <div className="text-sm text-muted-foreground">No phases documented.</div>;
  }
  return (
    <div className="space-y-3">
      {phases.map((phase: any, idx: number) => (
        <div key={idx} className="p-3 border rounded bg-muted/10">
          <div className="text-sm font-semibold">{phase?.name || `Phase ${idx + 1}`}</div>
          {phase?.description && <div className="text-sm mt-1">{phase.description}</div>}
        </div>
      ))}
    </div>
  );
};

const TeamProgressView: React.FC<TeamProgressViewProps> = ({
  team,
  initialSection = 'idea',
  onBack,
  showSectionNavigation = false,
  includeAssignments = false,
  mode = 'mentor',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conceptCard, setConceptCard] = useState<any | null>(null);
  const [elevator, setElevator] = useState<any | null>(null);
  const [personaKit, setPersonaKit] = useState<any | null>(null);
  const [validationEvidence, setValidationEvidence] = useState<any | null>(null);
  const [pst, setPst] = useState<any | null>(null);
  const [deepResearch, setDeepResearch] = useState<any | null>(null);
  const [secondaryScore20, setSecondaryScore20] = useState<number | null>(null);
  const [quantitativeData, setQuantitativeData] = useState<any | null>(null);
  const [quantitativeScore, setQuantitativeScore] = useState<any | null>(null);
  const [responseVolume, setResponseVolume] = useState<number | null>(null);
  const [qualitativeScore, setQualitativeScore] = useState<any | null>(null);
  const [qualitativeInsights, setQualitativeInsights] = useState<any | null>(null);
  const [focusGroupInsights, setFocusGroupInsights] = useState<any | null>(null);
  const [interviews, setInterviews] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(null);
  const [qualitativeViewMode, setQualitativeViewMode] = useState<'interview' | 'focus-group'>('interview');
  const [validationSubsection, setValidationSubsection] = useState<'secondary' | 'qualitative' | 'quantitative'>('secondary');
  const [landingUrl, setLandingUrl] = useState<string | null>(null);
  const [mockupImages, setMockupImages] = useState<Array<{ url: string; title?: string }>>([]);
  const [serviceDoc, setServiceDoc] = useState<any | null>(null);
  const [mockupTab, setMockupTab] = useState<'landing' | 'images' | 'service'>('landing');
  const [serviceSection, setServiceSection] = useState<'flowchart' | 'journeys' | 'timeline' | 'milestones' | 'phases'>('flowchart');
  const [pitchGuidelines, setPitchGuidelines] = useState<any | null>(null);
  const [pitchCoaching, setPitchCoaching] = useState<any | null>(null);
  const [pitchSubmission, setPitchSubmission] = useState<any | null>(null);
  const [currentAdviceSlide, setCurrentAdviceSlide] = useState<number>(0);
  const [mvpData, setMvpData] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mvpSubmission, setMvpSubmission] = useState<any | null>(null);
  const [financeSetup, setFinanceSetup] = useState<any | null>(null);
  // Removed financeHistory state - no version control for admin/mentor view
  const [financeVideoLink, setFinanceVideoLink] = useState<string | null>(null);
  const [marketingOverview, setMarketingOverview] = useState<any | null>(null);
  const [marketingImages, setMarketingImages] = useState<any[]>([]);
  // Lazy-load flags to avoid expensive requests until the section is opened
  const [financeLoaded, setFinanceLoaded] = useState(false);
  const [marketingLoaded, setMarketingLoaded] = useState(false);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(false);
  // Marketing calendar dialog state
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedCalendarEntries, setSelectedCalendarEntries] = useState<any[]>([]);

  const sectionOptions = useMemo(() => {
    const base: Array<{ key: TeamProgressSectionKey; label: string }> = [
      { key: 'idea', label: 'Idea Generation' },
      { key: 'mockups', label: 'Mockups' },
      { key: 'validation', label: 'Validation' },
      { key: 'pitch_deck', label: 'Pitch Deck' },
      { key: 'mvp', label: 'MVP Development' },
    ];
    if (mode === 'admin' || mode === 'mentor') {
      base.push({ key: 'finance', label: 'Finance' });
      base.push({ key: 'marketing', label: 'Marketing' });
    }
    if (includeAssignments) {
      base.push({ key: 'assignments', label: 'Mentor & Investor Assignment' });
    }
    return base;
  }, [includeAssignments, mode]);

  const defaultSection = useMemo<TeamProgressSectionKey>(() => {
    const first = sectionOptions[0]?.key || 'idea';
    return sectionOptions.some((section) => section.key === initialSection) ? initialSection : first;
  }, [sectionOptions, initialSection]);

  const [currentSection, setCurrentSection] = useState<TeamProgressSectionKey>(defaultSection);
  useEffect(() => {
    setCurrentSection(defaultSection);
  }, [defaultSection]);

  // Lazy loaders for expensive sections
  const loadFinanceIfNeeded = useCallback(async (teamId: number) => {
    if (financeLoaded || financeLoading) return;
    setFinanceLoading(true);
    try {
      const [financeRes, roadmapRes] = await Promise.all([
        apiClient.getTeamFinanceSetup(teamId),
        apiClient.getTeamRoadmap(teamId),
      ]);
      const financePayload: any = (financeRes as any)?.data || null;
      setFinanceSetup(financePayload);
      const financeNode: any = (roadmapRes as any)?.data?.finance || {};
      const link = typeof financeNode?.video_link === 'string' && financeNode.video_link
        ? financeNode.video_link
        : (typeof financeNode?.financial_video_link === 'string' ? financeNode.financial_video_link : null);
      setFinanceVideoLink(link || null);
      setFinanceLoaded(true);
    } catch (err) {
      console.error('Lazy finance load error:', err);
      setFinanceSetup(null);
      setFinanceVideoLink(null);
    } finally {
      setFinanceLoading(false);
    }
  }, [financeLoaded, financeLoading]);

  const loadMarketingIfNeeded = useCallback(async (teamId: number) => {
    if (marketingLoaded || marketingLoading) return;
    setMarketingLoading(true);
    try {
      const [overviewRes, imagesRes] = await Promise.all([
        apiClient.getMarketingTeam(teamId),
        apiClient.getMarketingCampaignImagesListTeam(teamId),
      ]);
      const overview = (overviewRes as any)?.data || null;
      setMarketingOverview(overview);
      const imagesData: any = (imagesRes as any)?.data || {};
      const imagesByEntry: any = imagesData?.images_by_entry || {};
      if (imagesByEntry && typeof imagesByEntry === 'object' && Object.keys(imagesByEntry).length > 0) {
        const formatted = Object.entries(imagesByEntry as Record<string, any>).map(([entryKey, value]) => {
          const val: any = value as any;
          let images: any[] = [];
          if (Array.isArray(val)) images = val;
          else if (val && typeof val === 'object' && Array.isArray((val as any).images)) images = (val as any).images;
          else if (val && typeof val === 'object' && (val as any).url) images = [val];
          // Build alias keys so admin can match by date label or day key
          const aliases: string[] = [];
          try {
            const ek = String(entryKey);
            if (/^\d{4}-\d{2}-\d{2}$/.test(ek)) {
              aliases.push(ek);
              const d = new Date(ek);
              if (!Number.isNaN(d.getTime())) {
                aliases.push(d.toLocaleDateString('en-CA'));
                aliases.push(d.toISOString().split('T')[0]);
              }
            }
            const m = ek.match(/day[-_ ]?(\d+)/i);
            if (m) aliases.push(`day-${m[1]}`);
          } catch {}
          return { entryKey, aliases, images } as any;
        });
        setMarketingImages(formatted);
      } else if (Array.isArray(imagesData?.assets)) {
        setMarketingImages(imagesData.assets);
      } else if (Array.isArray(imagesData?.images)) {
        setMarketingImages([{ entryKey: 'Assets', images: imagesData.images }]);
      } else {
        setMarketingImages([]);
      }
      setMarketingLoaded(true);
    } catch (err) {
      console.error('Lazy marketing load error:', err);
      setMarketingOverview(null);
      setMarketingImages([]);
    } finally {
      setMarketingLoading(false);
    }
  }, [marketingLoaded, marketingLoading]);

  const shouldShowNavigation = mode === 'mentor' || showSectionNavigation;
  const headerSubtitle = mode === 'mentor'
    ? 'Progress overview for mentors'
    : mode === 'admin'
      ? 'Progress overview for admins'
      : 'Progress overview';

  // Trigger lazy loads when section changes
  useEffect(() => {
    const teamId = team?.id;
    if (!teamId) return;
    if (currentSection === 'finance') {
      void loadFinanceIfNeeded(teamId);
    } else if (currentSection === 'marketing') {
      void loadMarketingIfNeeded(teamId);
    }
  }, [currentSection, team?.id, loadFinanceIfNeeded, loadMarketingIfNeeded]);

  const mapInterviewKit = useCallback((raw: any) => {
    if (!raw) return null;
    const data = raw.data || raw;
    const userPersonas = data.user_personas || data.interview_profiles || [];
    const demographicQuestions = data.demographic_questions || data.warm_up_questions || [];
    const marketValidationQuestions = data.market_validation_questions || [];
    const solutionQuestions = data.solution_questions || data.solution_feedback_questions || [];
    return {
      user_personas: userPersonas,
      demographic_questions: demographicQuestions,
      behavioral_questions: data.behavioral_questions || marketValidationQuestions,
      pain_point_questions: data.pain_point_questions || marketValidationQuestions,
      solution_questions: solutionQuestions,
      market_questions: data.market_questions || marketValidationQuestions,
      persona_validation_questions: data.persona_validation_questions || [],
      interview_strategy: data.interview_strategy || '',
      target_interview_count: data.target_interview_count || 15,
      interview_duration: data.interview_duration || '30-45 minutes',
    };
  }, []);
  useEffect(() => {
    const teamId = team?.id;
    if (!teamId) {
      setConceptCard(null);
      setElevator(null);
      setPersonaKit(null);
      setValidationEvidence(null);
      setPst(null);
      setDeepResearch(null);
      setSecondaryScore20(null);
      setQuantitativeData(null);
      setQuantitativeScore(null);
      setResponseVolume(null);
      setQualitativeScore(null);
      setQualitativeInsights(null);
      setFocusGroupInsights(null);
      setLandingUrl(null);
      setMockupImages([]);
      setServiceDoc(null);
      setPitchGuidelines(null);
      setPitchCoaching(null);
      setPitchSubmission(null);
      setMvpData(null);
      setTasks([]);
      setMvpSubmission(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const anyV0: any = v0 as any;
          if (anyV0 && typeof anyV0.configure === 'function') {
            anyV0.configure({
              apiKey: (import.meta as any).env?.VITE_V0_API_KEY,
              projectId: (import.meta as any).env?.VITE_V0_PROJECT_ID,
            });
          }
        } catch {}

        try {
          const res = await apiClient.getTeamConceptCard(teamId);
          if (!cancelled) setConceptCard((res as any).data || null);
        } catch {
          if (!cancelled) setConceptCard(null);
        }

        try {
          const res = await apiClient.getElevatorPitchSubmission(teamId);
          if (!cancelled) setElevator((res as any).data || null);
        } catch {
          if (!cancelled) setElevator(null);
        }

        try {
          const res = await apiClient.getTeamProblemSolution(teamId);
          if (!cancelled) setPst((res as any)?.data || null);
        } catch {
          if (!cancelled) setPst(null);
        }

        try {
          const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
          const data = (res as any)?.data?.data;
          if (!cancelled) setPersonaKit(data ? mapInterviewKit({ data }) : null);
        } catch {
          if (!cancelled) setPersonaKit(null);
        }

        try {
          const res = await apiClient.getValidationEvidence(teamId);
          if (!cancelled) {
            const payload = (res as any).data || null;
            setValidationEvidence(payload);
            const volume = payload?.response_volume;
            setResponseVolume(typeof volume === 'number' ? volume : null);
          }
        } catch {
          if (!cancelled) {
            setValidationEvidence(null);
            setResponseVolume(null);
          }
        }

        try {
          const res = await apiClient.getDeepResearchReportTeam(teamId);
          if (!cancelled) setDeepResearch((res as any).data || null);
        } catch {
          if (!cancelled) setDeepResearch(null);
        }

        let secondaryScore: number | null = null;
        try {
          const res = await apiClient.getSecondaryScoreTeam(teamId);
          const raw: any = res as any;
          const data: any = raw?.data || raw;
          secondaryScore = typeof data?.final_score_20 === 'number' ? data.final_score_20
            : typeof data?.data?.final_score_20 === 'number' ? data.data.final_score_20
            : typeof data?.score?.final_score_20 === 'number' ? data.score.final_score_20
            : null;
        } catch {}
        if (secondaryScore === null) {
          try {
            const res = await apiClient.computeSecondaryScoreTeam(teamId);
            const raw: any = res as any;
            const data: any = raw?.data || raw;
            secondaryScore = typeof data?.final_score_20 === 'number' ? data.final_score_20
              : typeof data?.data?.final_score_20 === 'number' ? data.data.final_score_20
              : typeof data?.score?.final_score_20 === 'number' ? data.score.final_score_20
              : secondaryScore;
          } catch {}
        }
        if (!cancelled) setSecondaryScore20(secondaryScore);

        try {
          const res = await apiClient.getAISurveyTeam(teamId);
          if (!cancelled) setQuantitativeData((res as any).data || null);
        } catch {
          if (!cancelled) setQuantitativeData(null);
        }

        try {
          const res = await apiClient.getQuantitativeScoreTeam(teamId);
          if (!cancelled) setQuantitativeScore((res as any)?.data?.score || null);
        } catch {
          if (!cancelled) setQuantitativeScore(null);
        }

        let landingCandidate: string | null = null;
        const imageCandidates: Array<{ url: string; title?: string; kind?: string }> = [];
        let serviceCandidate: any = null;

        try {
          const res = await apiClient.getSoftwareMockupTeam(teamId);
          const data: any = (res as any)?.data || {};
          const items: any[] = Array.isArray(data?.mockups) ? data.mockups : [];
          const sortedItems = items.slice().sort((a, b) => {
            const ta = Date.parse(a?.created_at || '') || 0;
            const tb = Date.parse(b?.created_at || '') || 0;
            return tb - ta;
          });
          const demo = (typeof data?.v0_demo_url === 'string' && data.v0_demo_url)
            || (sortedItems.find((m: any) => typeof m?.v0_demo_url === 'string' && m.v0_demo_url)?.v0_demo_url)
            || (sortedItems.find((m: any) => typeof m?.demo_url === 'string' && m.demo_url)?.demo_url)
            || null;
          if (demo) {
            landingCandidate = stripTs((toAbsoluteMediaUrl(demo) || demo) as any);
          }

          items.forEach((mockup: any) => {
            const url: string | undefined = mockup?.image_url || mockup?.url || mockup?.file_url;
            if (!url) return;
            const absolute = toAbsoluteMediaUrl(url) || url;
            const title: string | undefined = mockup?.title || mockup?.name;
            const kind: string | undefined = mockup?.type || mockup?.category;
            imageCandidates.push({ url: absolute, title, kind });
          });

          try {
            const pm = await apiClient.getPhysicalMockupsTeam(teamId);
            const list: any[] = Array.isArray((pm as any)?.data?.mockups) ? (pm as any).data.mockups : [];
            for (const entry of list) {
              const url = toAbsoluteMediaUrl(entry?.image_url) || entry?.image_url;
              if (url) imageCandidates.push({ url, title: entry?.title || 'Product Mockup', kind: 'image' });
            }
          } catch {}

          try {
            const sr = await apiClient.getServiceRoadmapTeam(teamId);
            const list: any[] = Array.isArray((sr as any)?.data?.roadmaps) ? (sr as any).data.roadmaps : [];
            if (list.length) {
              const sorted = list.slice().sort((a, b) => {
                const ta = Date.parse(a?.created_at || '') || 0;
                const tb = Date.parse(b?.created_at || '') || 0;
                return tb - ta;
              });
              serviceCandidate = sorted[0];
            }
          } catch {}

          try {
            const chatId: string | undefined = (data?.v0_chat_id as string | undefined)
              || (sortedItems.find((m: any) => m?.v0_chat_id)?.v0_chat_id as string | undefined);
            let latestVersion: string | undefined = data?.v0_latest_version_id as string | undefined;
            const anyV0: any = v0 as any;
            if (chatId && anyV0?.chats) {
              if (!latestVersion && anyV0.chats.getById) {
                try {
                  const info = await anyV0.chats.getById({ chatId });
                  latestVersion = (info as any)?.latestVersion?.id;
                } catch {}
              }
              if (latestVersion && anyV0.chats.getVersion) {
                try {
                  const version = await anyV0.chats.getVersion({ chatId, versionId: latestVersion });
                  const live = (version?.demoUrl || version?.webUrl || version?.demo || null) as string | null;
                  if (live) landingCandidate = stripTs(live);
                } catch {}
              }
            }
          } catch {}

          if (!demo && !landingCandidate) {
            try {
              const smvp = await apiClient.getSoftwareMvpTeam(teamId);
              const d: any = (smvp as any)?.data || {};
              const mvpdemo = d?.v0_demo_url || (Array.isArray(d?.mockups) ? d.mockups.find((m: any) => m?.v0_demo_url)?.v0_demo_url : null);
              if (mvpdemo) landingCandidate = stripTs((toAbsoluteMediaUrl(mvpdemo) || mvpdemo) as any);
            } catch {}
          }
        } catch {}

        const seen = new Set<string>();
        const dedupImages = imageCandidates.filter((item) => {
          const key = String(item.url || '').toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) {
          setLandingUrl(landingCandidate || null);
          setMockupImages(dedupImages);
          setServiceDoc(serviceCandidate);
        }

        try {
          const res = await apiClient.getPitchGuidelinesTeam(teamId);
          if (!cancelled) setPitchGuidelines((res as any).data || null);
        } catch {
          if (!cancelled) setPitchGuidelines(null);
        }

        try {
          const res = await apiClient.getPitchCoachingTeam(teamId);
          if (!cancelled) setPitchCoaching((res as any).data || null);
        } catch {
          if (!cancelled) setPitchCoaching(null);
        }

        try {
          const res = await apiClient.getPitchDeckSubmissionTeam(teamId);
          if (!cancelled) setPitchSubmission((res as any).data || null);
        } catch {
          if (!cancelled) setPitchSubmission(null);
        }

        try {
          const res = await apiClient.getUnifiedMvp(teamId);
          const data = (res as any).data;
          if (!cancelled) {
            if (data) {
              setMvpData({
                ...data.mvp_data,
                image_url: data.image_url,
                image_prompt: data.image_prompt,
                mockup_id: data.mockup_id,
                unified_mvp_id: data.unified_mvp_id,
                ai_generated: data.ai_generated,
                generation_notes: data.generation_notes,
                created_at: data.created_at,
                updated_at: data.updated_at,
              });
            } else {
              setMvpData(null);
            }
          }
        } catch {
          if (!cancelled) setMvpData(null);
        }

        try {
          const res = await apiClient.getMvpTasksTeam(teamId);
          if (!cancelled) setTasks((res as any).data?.tasks || []);
        } catch {
          if (!cancelled) setTasks([]);
        }

        try {
          const res = await apiClient.getMvpSubmission(teamId);
          if (!cancelled) setMvpSubmission((res as any).data?.submission || null);
        } catch {
          if (!cancelled) setMvpSubmission(null);
        }
    // NOTE: Finance and Marketing heavy requests are moved to lazy-load handlers below

      } catch (err) {
        if (!cancelled) {
          console.error('Error loading team progress:', err);
          setError('Failed to load team progress.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [team?.id, mapInterviewKit]);
  useEffect(() => {
    const teamId = team?.id;
    if (!teamId) return;
    if (validationSubsection !== 'qualitative') return;

    let cancelled = false;
    const loadQualitative = async () => {
      try {
        const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
        const data: any = (res as any)?.data?.data;
        if (!cancelled) {
        }
      } catch {
      }

      try {
        const res = await apiClient.getTeamInterviews(teamId);
        const rows: Array<any> = (res as any)?.data?.data || [];
        if (!cancelled) {
          const mapped = rows.map((row) => ({ id: row.id, title: row.title }));
          setInterviews(mapped);
          const firstId = mapped.length ? mapped[0].id : null;
          setSelectedInterviewId(firstId);
          if (firstId !== null) {
            try {
              const insights = await apiClient.getQualInsightsTeam(teamId, firstId);
              if (!cancelled) setQualitativeInsights((insights as any).data || null);
            } catch {
              if (!cancelled) setQualitativeInsights(null);
            }
          } else if (!cancelled) {
            setQualitativeInsights(null);
          }
        }
      } catch {
        if (!cancelled) {
          setInterviews([]);
          setSelectedInterviewId(null);
          setQualitativeInsights(null);
        }
      }

      try {
        const res = await apiClient.getQualitativeScoreTeam(teamId);
        if (!cancelled) setQualitativeScore((res as any)?.data?.score || null);
      } catch {
        if (!cancelled) setQualitativeScore(null);
      }

      try {
        const res = await apiClient.get(`/validation/teams/${teamId}/focus-group-insights/`);
        if (!cancelled) setFocusGroupInsights((res as any).data || null);
      } catch {
        if (!cancelled) setFocusGroupInsights(null);
      }
    };

    loadQualitative();
    return () => {
      cancelled = true;
    };
  }, [team?.id, validationSubsection]);

  const handleInterviewChange = useCallback(async (interviewId: number | null) => {
    setSelectedInterviewId(interviewId);
    if (!team?.id) return;
    try {
      const res = await apiClient.getQualInsightsTeam(team.id, interviewId || undefined);
      setQualitativeInsights((res as any).data || null);
    } catch {
      setQualitativeInsights(null);
    }
  }, [team?.id]);

  const renderIdeaSection = () => (
    <div className="space-y-4">
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
                {conceptCard.assumptions.slice(0, 3).map((assumption: any, idx: number) => (
                  <div key={idx} className="p-3 rounded border bg-muted/20">
                    <div className="text-sm font-medium">{typeof assumption === 'string' ? assumption : (assumption?.text || '')}</div>
                    {typeof assumption !== 'string' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof assumption?.confidence === 'number' ? `${assumption.confidence}% confidence` : ''}
                        {assumption?.testing_plan ? ` � ${assumption.testing_plan}` : ''}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground italic mt-1">* Percentage indicates confidence level</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="border rounded p-3">
            <div className="text-xs text-muted-foreground mb-1">Elevator Pitch</div>
            <div className="text-sm">
              {elevator?.google_drive_link ? (
                <a href={elevator.google_drive_link} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  Open Link
                </a>
              ) : 'No link submitted.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No concept card found.</div>
      )}

      <div className="border rounded p-4 max-h-[60vh] overflow-auto">
        <div className="text-lg font-semibold mb-3">Idea Generation Q&A</div>
        {pst ? (
          <div className="space-y-2">
            {Object.entries(pst).filter(([key, value]) => typeof value === 'string' && value).map(([key, value]) => (
              <div key={key} className="p-2 rounded border bg-background/50">
                <div className="text-xs text-muted-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                <div className="text-sm">{String(value)}</div>
              </div>
            ))}
            {personaKit?.interview_strategy && (
              <div className="p-2 rounded border bg-muted/20">
                <div className="text-xs text-muted-foreground mb-1">Interview Strategy</div>
                <div className="prose prose-sm text-muted-foreground">
                  <ReactMarkdown>{String(personaKit.interview_strategy)}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No questionnaire data found.</div>
        )}
      </div>
    </div>
  );
  const renderMockupsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant={mockupTab === 'landing' ? 'default' : 'outline'} size="sm" onClick={() => setMockupTab('landing')}>
          Landing
        </Button>
        <Button variant={mockupTab === 'images' ? 'default' : 'outline'} size="sm" onClick={() => setMockupTab('images')}>
          Images
        </Button>
        <Button variant={mockupTab === 'service' ? 'default' : 'outline'} size="sm" onClick={() => setMockupTab('service')}>
          Service Flow
        </Button>
      </div>

      {mockupTab === 'landing' && (
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Landing Page Preview</div>
          {landingUrl ? (
            <div className="space-y-2">
              {canEmbedDemo(landingUrl) ? (
                <div className="w-full h-[60vh] border rounded overflow-hidden">
                  <iframe
                    src={cacheBust(landingUrl)}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">This host does not allow embedding. Use the link below.</div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground truncate">{landingUrl}</div>
                <a href={landingUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  Open
                </a>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No landing page found.</div>
          )}
        </div>
      )}

      {mockupTab === 'images' && (
        <div className="border rounded p-3">
          <div className="text-sm font-medium mb-2">Mockup Images</div>
          {mockupImages.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {mockupImages.map((image, idx) => (
                <div key={idx} className="border rounded overflow-hidden bg-background">
                  <img
                    src={image.url}
                    alt={image.title || `Mockup ${idx + 1}`}
                    className="w-full max-h-[60vh] object-contain bg-black/5"
                  />
                  {image.title && (
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate">{image.title}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No images found.</div>
          )}
        </div>
      )}

      {mockupTab === 'service' && (
        <div className="border rounded p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={serviceSection === 'flowchart' ? 'default' : 'outline'} size="sm" onClick={() => setServiceSection('flowchart')}>
              Flowchart
            </Button>
            <Button variant={serviceSection === 'journeys' ? 'default' : 'outline'} size="sm" onClick={() => setServiceSection('journeys')}>
              Journeys
            </Button>
            <Button variant={serviceSection === 'timeline' ? 'default' : 'outline'} size="sm" onClick={() => setServiceSection('timeline')}>
              Timeline
            </Button>
            <Button variant={serviceSection === 'milestones' ? 'default' : 'outline'} size="sm" onClick={() => setServiceSection('milestones')}>
              Milestones
            </Button>
            <Button variant={serviceSection === 'phases' ? 'default' : 'outline'} size="sm" onClick={() => setServiceSection('phases')}>
              Phases
            </Button>
          </div>
          {renderServiceSection(serviceDoc, serviceSection)}
        </div>
      )}
    </div>
  );
  const renderValidationSection = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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
            return `${secondaryPoints + qualitativePoints + quantitativePoints}/100`;
          })()}
        </div>
      </div>

      {validationSubsection === 'secondary' && (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Secondary Research Score</div>
              <div
                className={`text-2xl font-bold ${
                  (secondaryScore20 ?? 0) >= 17 ? 'text-success'
                    : (secondaryScore20 ?? 0) >= 14 ? 'text-info'
                    : (secondaryScore20 ?? 0) >= 10 ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {secondaryScore20 !== null ? `${secondaryScore20}/20` : '0/20'}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {secondaryScore20 !== null ? 'Computed score based on latest deep research report.' : 'Score not computed yet.'}
            </div>
          </div>

          <div className="border rounded p-4 space-y-3">
            <div className="text-lg font-semibold">Deep Research Highlights</div>
            {deepResearch?.report ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Total Sources</div>
                  <div>{deepResearch.report.total_sources || 0}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Key Findings</div>
                  <div className="text-muted-foreground">
                    {Array.isArray(deepResearch.report.key_findings) && deepResearch.report.key_findings.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {deepResearch.report.key_findings.map((finding: string, idx: number) => (
                          <li key={idx}>{finding}</li>
                        ))}
                      </ul>
                    ) : '-'}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Market Size</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="font-medium">TAM</div>
                      <div className="text-muted-foreground">{deepResearch.report.tam || '-'}</div>
                    </div>
                    <div>
                      <div className="font-medium">SAM</div>
                      <div className="text-muted-foreground">{deepResearch.report.sam || '-'}</div>
                    </div>
                    <div>
                      <div className="font-medium">SOM</div>
                      <div className="text-muted-foreground">{deepResearch.report.som || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No deep research report found.</div>
            )}
          </div>
        </div>
      )}

      {validationSubsection === 'qualitative' && (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Qualitative Score</div>
              <div
                className={`text-2xl font-bold ${
                  Number(qualitativeScore?.final_score_10 || 0) >= 8 ? 'text-success'
                    : Number(qualitativeScore?.final_score_10 || 0) >= 6 ? 'text-info'
                    : Number(qualitativeScore?.final_score_10 || 0) >= 4 ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {qualitativeScore ? `${Math.round((Number(qualitativeScore.final_score_10 || 0) / 10) * 30)}/30` : '0/30'}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {qualitativeScore ? 'Score available' : 'No score available yet'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!team?.id) return;
                try {
                  const res = await apiClient.getQualitativeScoreTeam(team.id);
                  setQualitativeScore((res as any)?.data?.score || null);
                } catch {
                  setQualitativeScore(null);
                }
              }}
            >
              Refresh
            </Button>
          </div>

          <div className="border rounded p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select
                className="px-2 py-1 border rounded bg-background text-foreground text-sm"
                value={selectedInterviewId ?? ''}
                onChange={(event) => handleInterviewChange(event.target.value ? Number(event.target.value) : null)}
              >
                {interviews.length === 0 && <option value="">No sessions</option>}
                {interviews.map((session) => (
                  <option key={session.id} value={session.id}>{session.title}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!team?.id) return;
                  try {
                    const title = `Interview Session ${interviews.length + 1}`;
                    const res = await apiClient.createTeamInterview(team.id, title);
                    if ((res as any)?.data?.data) {
                      const refreshed = await apiClient.getTeamInterviews(team.id);
                      const rows: Array<any> = (refreshed as any)?.data?.data || [];
                      const mapped = rows.map((row) => ({ id: row.id, title: row.title }));
                      setInterviews(mapped);
                      const firstId = mapped.length ? mapped[0].id : null;
                      setSelectedInterviewId(firstId);
                      if (firstId !== null) {
                        try {
                          const insights = await apiClient.getQualInsightsTeam(team.id, firstId);
                          setQualitativeInsights((insights as any).data || null);
                        } catch {
                          setQualitativeInsights(null);
                        }
                      }
                    }
                  } catch {}
                }}
              >
                New
              </Button>
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

            {qualitativeViewMode === 'interview' ? (
              qualitativeInsights?.data?.length > 0 ? (
                <div className="space-y-3 text-sm">
                  {qualitativeInsights.data.map((insight: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded bg-muted/20">
                      <div className="font-medium">{insight?.question}</div>
                      <div className="text-muted-foreground mt-1">{insight?.summary || 'No summary available.'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No interview insights loaded.</div>
              )
            ) : (
              focusGroupInsights?.insights?.length > 0 ? (
                <div className="space-y-3 text-sm">
                  {focusGroupInsights.insights.map((insight: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded bg-muted/20">
                      <div className="font-medium">{insight?.topic || `Topic ${idx + 1}`}</div>
                      <div className="text-muted-foreground mt-1">{insight?.summary || 'No summary available.'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No focus group insights available.</div>
              )
            )}
          </div>

          <div className="border rounded p-4 text-sm space-y-2">
            <div className="font-semibold">Submission Links</div>
            <div>
              <span className="font-medium">Interview Recordings: </span>
              {validationEvidence?.qual_interview_recordings ? (
                <a href={validationEvidence.qual_interview_recordings} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Open folder
                </a>
              ) : '-'}
            </div>
            <div>
              <span className="font-medium">Focus Groups: </span>
              {validationEvidence?.qual_focus_group_link ? (
                <a href={validationEvidence.qual_focus_group_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {validationEvidence.qual_focus_group_link}
                </a>
              ) : '-'}
            </div>
            <div>
              <span className="font-medium">Transcript Folders: </span>
              {validationEvidence?.qual_transcript_link ? (
                <a href={validationEvidence.qual_transcript_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {validationEvidence.qual_transcript_link}
                </a>
              ) : '-'}
            </div>
            <div>
              <span className="font-medium">Legacy Folder: </span>
              {validationEvidence?.qual_folder_link ? (
                <a href={validationEvidence.qual_folder_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {validationEvidence.qual_folder_link}
                </a>
              ) : '-'}
            </div>
          </div>
        </div>
      )}

      {validationSubsection === 'quantitative' && (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Quantitative Validation Score</div>
              <div className={`text-2xl font-bold ${quantitativeScore ? 'text-success' : 'text-muted-foreground'}`}>
                {quantitativeScore ? `${Math.round(quantitativeScore.final_score_50 || 0)}/50` : '0/50'}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {quantitativeScore ? 'Score available' : (quantitativeData?.questions?.length > 0 ? 'Survey generated, awaiting responses.' : 'No survey generated.')}
            </div>
            {responseVolume && (
              <div className="text-sm text-primary font-medium">Response Volume: {responseVolume} responses</div>
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
                        <div className="mt-1">Options: {question.options.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No survey questions found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  const renderPitchDeckSection = () => (
    <div className="space-y-4">
      <div className="border rounded p-4">
        <div className="text-lg font-semibold mb-4">Pitch Deck Overview</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-muted-foreground">Guidelines Available</div>
            <div className={pitchGuidelines ? 'text-green-600' : 'text-muted-foreground'}>
              {pitchGuidelines ? '? Generated' : 'Not available'}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Coaching Available</div>
            <div className={pitchCoaching ? 'text-green-600' : 'text-muted-foreground'}>
              {pitchCoaching ? '? Generated' : 'Not available'}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Submission Status</div>
            <div className={pitchSubmission?.submission ? 'text-green-600' : 'text-muted-foreground'}>
              {pitchSubmission?.submission ? '? Submitted' : 'Not submitted'}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Submission Date</div>
            <div className="text-muted-foreground">
              {pitchSubmission?.submission?.submitted_at
                ? new Date(pitchSubmission.submission.submitted_at).toLocaleDateString()
                : '-'}
            </div>
          </div>
        </div>
      </div>

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
                  const slides = [
                    { title: 'Title Line', content: coaching.title_line },
                    { title: 'Problem', content: coaching.problem_advice },
                    { title: 'Unique Insight', content: coaching.insight_advice },
                    { title: 'Solution', content: coaching.solution_advice },
                    { title: 'Customer Validation', content: coaching.customer_validation_advice },
                    { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                    { title: 'Roadmap', content: coaching.roadmap_advice },
                    { title: 'Team', content: coaching.team_advice },
                    { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                    { title: 'Closing', content: coaching.closing_advice },
                  ];
                  return slides.length;
                })()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const coaching = pitchCoaching.coaching;
                  const slides = [
                    { title: 'Title Line', content: coaching.title_line },
                    { title: 'Problem', content: coaching.problem_advice },
                    { title: 'Unique Insight', content: coaching.insight_advice },
                    { title: 'Solution', content: coaching.solution_advice },
                    { title: 'Customer Validation', content: coaching.customer_validation_advice },
                    { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
                    { title: 'Roadmap', content: coaching.roadmap_advice },
                    { title: 'Team', content: coaching.team_advice },
                    { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
                    { title: 'Closing', content: coaching.closing_advice },
                  ];
                  setCurrentAdviceSlide(Math.min(slides.length - 1, currentAdviceSlide + 1));
                }}
                disabled={(() => {
                  const coaching = pitchCoaching.coaching;
                  const slides = [
                    coaching.title_line,
                    coaching.problem_advice,
                    coaching.insight_advice,
                    coaching.solution_advice,
                    coaching.customer_validation_advice,
                    coaching.business_hypothesis_advice,
                    coaching.roadmap_advice,
                    coaching.team_advice,
                    coaching.mentor_questions_advice,
                    coaching.closing_advice,
                  ];
                  return currentAdviceSlide >= slides.length - 1;
                })()}
              >
                Next
              </Button>
            </div>
          </div>

          {(() => {
            const coaching = pitchCoaching.coaching;
            const slides = [
              { title: 'Title Line', content: coaching.title_line },
              { title: 'Problem', content: coaching.problem_advice },
              { title: 'Unique Insight', content: coaching.insight_advice },
              { title: 'Solution', content: coaching.solution_advice },
              { title: 'Customer Validation', content: coaching.customer_validation_advice },
              { title: 'Business Hypothesis', content: coaching.business_hypothesis_advice },
              { title: 'Roadmap', content: coaching.roadmap_advice },
              { title: 'Team', content: coaching.team_advice },
              { title: 'Mentor Questions', content: coaching.mentor_questions_advice },
              { title: 'Closing', content: coaching.closing_advice },
            ];
            const currentSlide = slides[currentAdviceSlide];
            return (
              <div className="space-y-3">
                <div className="text-lg font-medium">{currentSlide?.title}</div>
                <div className="text-sm p-3 bg-muted/50 rounded border-l-4 border-primary">
                  {currentSlide?.content || 'No advice available for this section.'}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {pitchSubmission?.submission && (
        <div className="border rounded p-4 space-y-3">
          <div className="text-lg font-semibold">Submission Links</div>
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
      )}

      {!pitchCoaching?.coaching && !pitchSubmission?.submission && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg mb-2">No Pitch Deck Data Available</div>
          <div className="text-sm">This team hasn't generated coaching advice or submitted their pitch deck yet.</div>
        </div>
      )}
    </div>
  );

  const renderMvpSection = () => (
    <div className="space-y-4">
      <div className="border rounded p-4">
        <div className="text-lg font-semibold mb-4">MVP Development Progress</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-muted-foreground">MVP Generated</div>
            <div className={mvpData ? 'text-green-600' : 'text-muted-foreground'}>
              {mvpData ? '? Generated' : 'Not generated'}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Tasks Status</div>
            <div className={tasks && tasks.length > 0 ? 'text-green-600' : 'text-muted-foreground'}>
              {tasks && tasks.length > 0 ? `${tasks.filter((task) => task.status === 'completed').length}/${tasks.length} completed` : 'No tasks'}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Video Submitted</div>
            <div className={mvpSubmission ? 'text-green-600' : 'text-muted-foreground'}>
              {mvpSubmission ? '? Submitted' : 'Not submitted'}
            </div>
          </div>
        </div>
      </div>

      {mvpData && (
        <div className="border rounded p-4 space-y-4">
          {mvpData.image_url && (
            <div>
              <div className="font-medium text-muted-foreground mb-2">MVP Image</div>
              <div className="flex justify-center">
                <img
                  src={mvpData.image_url}
                  alt="MVP Visualization"
                  className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                  onError={(event) => {
                    const target = event.target as HTMLImageElement;
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
            <div>{mvpData.mvp_title || '-'}</div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Description</div>
            <div className="text-sm">{mvpData.mvp_description || '-'}</div>
          </div>
          {Array.isArray(mvpData.key_features) && mvpData.key_features.length > 0 && (
            <div>
              <div className="font-medium text-muted-foreground">Key Features</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {mvpData.key_features.map((feature: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{feature}</Badge>
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
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="border rounded p-4">
          <div className="text-lg font-semibold mb-4">Task Progress</div>
          <div className="space-y-2">
            {tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">{task.description || 'No description provided.'}</div>
                </div>
                <Badge variant={task.status === 'completed' ? 'success' : 'outline'}>
                  {task.status || 'pending'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {mvpSubmission && (
        <div className="border rounded p-4 space-y-2">
          <div className="text-lg font-semibold mb-2">Submission Details</div>
          <div className="text-sm">
            <span className="font-medium">Link: </span>
            {mvpSubmission.submission_url ? (
              <a href={mvpSubmission.submission_url} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                {mvpSubmission.submission_url}
              </a>
            ) : '-'}
          </div>
          {mvpSubmission.submission_notes && (
            <div className="text-sm text-muted-foreground">{mvpSubmission.submission_notes}</div>
          )}
          <div className="text-sm text-muted-foreground">
            Submitted at {new Date(mvpSubmission.submitted_at).toLocaleString()}
          </div>
        </div>
      )}

      {!mvpData && (!tasks || tasks.length === 0) && !mvpSubmission && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg mb-2">No MVP Data Available</div>
          <div className="text-sm">This team hasn't generated an MVP or submitted their work yet.</div>
        </div>
      )}
    </div>
  );
  

  const renderFinanceSection = () => {
    console.log('Rendering finance section with data:', {
      financeSetup,
      financeVideoLink
    });

    const activeFinance: any = financeSetup;

    if (financeLoading && !financeLoaded) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading finance...
          </CardContent>
        </Card>
      );
    }

    if (!activeFinance) {

      return (

        <Card>

          <CardContent className="py-10 text-center text-sm text-muted-foreground">

            Financial data has not been generated for this team yet.

          </CardContent>

        </Card>

      );

    }



    const startupCostEntries: Array<{ key: string; label: string }> = [

      { key: 'product_development_cost', label: 'Product Development' },

      { key: 'marketing_customer_acquisition_cost', label: 'Marketing & Acquisition' },

      { key: 'team_salaries_freelance_cost', label: 'Team Salaries & Freelancers' },

      { key: 'tools_subscriptions_cost', label: 'Tools & Subscriptions' },

      { key: 'legal_admin_cost', label: 'Legal & Admin' },

      { key: 'other_expenses_cost', label: 'Other Expenses' },

    ];



    const monthlyCostEntries: Array<{ key: string; label: string }> = [

      { key: 'monthly_rent_utilities', label: 'Rent & Utilities' },

      { key: 'monthly_salaries', label: 'Team Salaries' },

      { key: 'monthly_marketing', label: 'Marketing' },

      { key: 'monthly_tools_subscriptions', label: 'Tools & Subscriptions' },

      { key: 'monthly_insurance_legal', label: 'Insurance & Legal' },

      { key: 'monthly_other_operational', label: 'Other Operational Costs' },

    ];



    const totalStartupCost = safeNumber(activeFinance.total_startup_cost);

    const monthlyBurn = safeNumber(activeFinance.monthly_burn_rate);

    const monthlyRevenue = safeNumber(activeFinance.monthly_revenue);

    const monthlyProfit = safeNumber(activeFinance.monthly_profit_margin);

    const runwayMonths = safeNumber(activeFinance.runway_months);

    const breakEvenMonth = safeNumber(activeFinance.break_even_month);

    const newCustomers = safeNumber(activeFinance.new_customers_per_month);

    const conversionRate = safeNumber(activeFinance.conversion_rate);

    const conversionRatio = conversionRate / 100;

    const monthlyGrowthRate = safeNumber(activeFinance.monthly_growth_rate);

    const pricePerCustomer = safeNumber(activeFinance.price_per_customer);

    const cogsPerCustomer = safeNumber(activeFinance.cogs_per_customer);

    const monthlyCogs = newCustomers * cogsPerCustomer * conversionRatio;

    const grossMarginPct = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyCogs) / monthlyRevenue) * 100 : 0;

    const netMarginPct = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    const scenarioCostReduction = safeNumber(activeFinance.cost_reduction_percentage);

    const scenarioRevenueIncrease = safeNumber(activeFinance.revenue_increase_percentage);

    const cityOfOperation = activeFinance.city_of_operation || 'Not specified';

    // Removed history list - no version control for admin/mentor view



    return (

      <div className="space-y-6">

        <Card>

          <CardHeader>

            <CardTitle>Cost Analysis</CardTitle>

            <CardDescription>One-time startup expenses and ongoing monthly burn</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-6 md:grid-cols-2">

              <div>

                <div className="text-sm font-semibold mb-2">One-Time Startup Costs</div>

                <div className="space-y-2">

                  {startupCostEntries.map(({ key, label }) => (

                    <div key={key} className="flex items-center justify-between text-sm">

                      <span className="text-muted-foreground">{label}</span>

                      <span className="font-medium">{formatCurrency(activeFinance[key])}</span>

                    </div>

                  ))}

                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">

                    <span>Total Startup Investment</span>

                    <span>{formatCurrency(totalStartupCost)}</span>

                  </div>

                </div>

              </div>

              <div>

                <div className="text-sm font-semibold mb-2">Monthly Operational Costs</div>

                <div className="space-y-2">

                  {monthlyCostEntries.map(({ key, label }) => (

                    <div key={key} className="flex items-center justify-between text-sm">

                      <span className="text-muted-foreground">{label}</span>

                      <span className="font-medium">{formatCurrency(activeFinance[key])}</span>

                    </div>

                  ))}

                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">

                    <span>Total Monthly Burn</span>

                    <span>{formatCurrency(monthlyBurn)}</span>

                  </div>

                </div>

              </div>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Revenue Model</CardTitle>

            <CardDescription>Assumptions driving revenue projections</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-4 md:grid-cols-2">

              <div className="space-y-2 text-sm">

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">City of Operation</span>

                  <span className="font-medium">{cityOfOperation}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Pricing Model</span>

                  <span className="font-medium">{activeFinance.pricing_model || 'Not specified'}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Price per Customer</span>

                  <span className="font-medium">{formatCurrency(pricePerCustomer)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Cost per Customer (COGS)</span>

                  <span className="font-medium">{formatCurrency(cogsPerCustomer)}</span>

                </div>

              </div>

              <div className="space-y-2 text-sm">

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">New Customers / Month</span>

                  <span className="font-medium">{newCustomers}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Conversion Rate</span>

                  <span className="font-medium">{formatPercent(conversionRate)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Monthly Growth Rate</span>

                  <span className="font-medium">{formatPercent(monthlyGrowthRate)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Projected Monthly Revenue</span>

                  <span className="font-medium">{formatCurrency(monthlyRevenue)}</span>

                </div>

              </div>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Burn & Runway</CardTitle>

            <CardDescription>How long the team can operate and when they break even</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded border p-4 bg-muted/40">

                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Burn</div>

                <div className="text-lg font-semibold">{formatCurrency(monthlyBurn)}</div>

              </div>

              <div className="rounded border p-4 bg-muted/40">

                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Runway</div>

                <div className="text-lg font-semibold">{runwayMonths.toFixed(1)} months</div>

              </div>

              <div className="rounded border p-4 bg-muted/40">

                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Break-Even</div>

                <div className="text-lg font-semibold">

                  {breakEvenMonth ? `${breakEvenMonth.toFixed(1)} months` : 'Not predicted'}

                </div>

              </div>

            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">

              <div className="flex items-center justify-between">

                <span className="text-muted-foreground">Monthly Profit (after burn & COGS)</span>

                <span className="font-medium">

                  {formatCurrency(monthlyProfit)}

                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-muted-foreground">Monthly COGS</span>

                <span className="font-medium">{formatCurrency(monthlyCogs)}</span>

              </div>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Financial Reports</CardTitle>

            <CardDescription>Scenario planning and financial metrics</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-6 md:grid-cols-2">

              <div className="space-y-2">

                <div className="text-sm font-semibold">Scenario Adjustments</div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Cost Reduction Target</span>

                  <span className="font-medium">{formatPercent(scenarioCostReduction)}</span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Revenue Uplift Target</span>

                  <span className="font-medium">{formatPercent(scenarioRevenueIncrease)}</span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Gross Margin</span>

                  <span className="font-medium">{formatPercent(grossMarginPct)}</span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Net Margin</span>

                  <span className="font-medium">{formatPercent(netMarginPct)}</span>

                </div>

              </div>

                  <div className="space-y-2">

                <div className="text-sm font-semibold">Financial Health</div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">City of Operation</span>

                  <span className="font-medium">{cityOfOperation}</span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Monthly Growth Rate</span>

                  <span className="font-medium">{formatPercent(monthlyGrowthRate)}</span>

                          </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Price per Customer</span>

                  <span className="font-medium">{formatCurrency(pricePerCustomer)}</span>

                        </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">COGS per Customer</span>

                  <span className="font-medium">{formatCurrency(cogsPerCustomer)}</span>

                        </div>

              </div>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Investor Summary</CardTitle>

            <CardDescription>Key numbers to share with stakeholders</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-6 md:grid-cols-2">

              <div className="space-y-2 text-sm">

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Total Startup Investment</span>

                  <span className="font-medium">{formatCurrency(totalStartupCost)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Projected Monthly Revenue</span>

                  <span className="font-medium">{formatCurrency(monthlyRevenue)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Monthly Profit</span>

                  <span className="font-medium">

                    {formatCurrency(monthlyProfit)}

                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Gross Margin</span>

                  <span className="font-medium">{formatPercent(grossMarginPct)}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Net Margin</span>

                  <span className="font-medium">{formatPercent(netMarginPct)}</span>

                </div>

              </div>

              <div className="space-y-3">

                <div className="text-sm font-semibold">Team Finance Walkthrough</div>

                {financeVideoLink ? (

                  <a

                    href={financeVideoLink}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm font-medium text-primary hover:underline"

                  >

                    Open shared video

                  </a>

                ) : (

                  <div className="text-sm text-muted-foreground">

                    Team has not submitted a finance walkthrough video yet.

                  </div>

                )}

                {/* Removed version display - no version control for admin/mentor view */}

              </div>

            </div>

          </CardContent>

        </Card>

      </div>

    );

  };



  const renderMarketingSection = () => {
    console.log('Rendering marketing section with data:', {
      marketingOverview,
      marketingImages
    });

    if (marketingLoading && !marketingLoaded) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading marketing...
          </CardContent>
        </Card>
      );
    }

    const branding = marketingOverview?.branding || null;

    const targetAudience = marketingOverview?.target_audience || null;

    const calendar = marketingOverview?.campaign_calendar || null;

    // Normalize calendar like MarketingStation.hydrateCampaignCalendar
    const startDateValue = calendar?.startDate ?? calendar?.start_date ?? null;
    const rawEntries = Array.isArray(calendar?.entries) ? calendar.entries : calendar?.calendar_entries;
    const baseStartDate = startDateValue ? new Date(startDateValue) : null;
    const normalizedEntries: Array<any> = Array.isArray(rawEntries)
      ? rawEntries.map((entry: any, index: number) => {
          const resolvedDate = entry?.date ?? entry?.day ?? (
            baseStartDate ? new Date(baseStartDate.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
          );
          const platformValue = Array.isArray(entry?.platform) ? entry.platform[0] : entry?.platform;
          const impressionsValue = typeof entry?.impressions_to_buy === 'number'
            ? entry.impressions_to_buy
            : Number(entry?.impressions_to_buy ?? entry?.impressions ?? entry?.paid_impressions ?? 0) || 0;
          return {
            date: resolvedDate || '',
            dayOfCampaign: typeof entry?.day_of_campaign === 'number' ? entry.day_of_campaign : (entry?.dayOfCampaign ?? index + 1),
            theme: entry?.theme ?? entry?.purpose ?? entry?.focus ?? '',
            contentType: entry?.content_type ?? entry?.format ?? entry?.contentType ?? '',
            caption: entry?.caption ?? entry?.copy ?? entry?.activity ?? '',
            platform: platformValue ?? 'Instagram',
            impressions: impressionsValue,
            call_to_action: entry?.call_to_action ?? entry?.callToAction ?? entry?.cta ?? '',
            posting_time: entry?.posting_time ?? entry?.scheduled_time ?? entry?.postingTime ?? '',
            imagePrompt: entry?.image_prompt ?? entry?.imagePrompt ?? '',
          };
        })
      : [];

    const sortedCampaignEntries: Array<any> = (() => {
      if (!normalizedEntries.length) return [];
      const entriesCopy = [...normalizedEntries];
      return entriesCopy.sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : NaN;
        const bTime = b.date ? new Date(b.date).getTime() : NaN;
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
        if (!Number.isNaN(aTime)) return -1;
        if (!Number.isNaN(bTime)) return 1;
        return (a.dayOfCampaign ?? 0) - (b.dayOfCampaign ?? 0);
      });
    })();

    const platforms: string[] = Array.isArray(calendar?.platforms)

      ? calendar.platforms

      : calendar?.platforms

        ? [calendar.platforms]

        : [];

    const galleryGroups = (() => {

      if (!Array.isArray(marketingImages) || marketingImages.length === 0) {

        return [] as Array<{ entryKey: string; images: any[] }>;

      }

      if (marketingImages[0]?.entryKey !== undefined && Array.isArray(marketingImages[0]?.images)) {

        return marketingImages as Array<{ entryKey: string; images: any[] }>;

      }

      if (marketingImages[0]?.campaign_entry_key || marketingImages[0]?.entry_key) {

        const groups: Record<string, any[]> = {};

        marketingImages.forEach((img: any) => {

          const key = img.campaign_entry_key || img.entry_key || img.entryKey || 'Campaign';

          if (!groups[key]) {

            groups[key] = [];

          }

          groups[key].push(img);

        });

        return Object.entries(groups).map(([entryKey, images]) => ({ entryKey, images }));

      }

      return [{ entryKey: 'Assets', images: marketingImages }];

    })();



    const hasBrandingInfo = Boolean(

      branding &&

        (branding.brand_name ||

          branding.brand_identity ||

          (Array.isArray(branding.brand_values) && branding.brand_values.length > 0))

    );

    const hasTargetAudience = Boolean(targetAudience);

    const hasCalendar = Array.isArray(calendar?.entries) ? calendar.entries.length > 0 : false;

    const hasAssets = galleryGroups.length > 0;



    if (!hasBrandingInfo && !hasTargetAudience && !hasCalendar && !hasAssets) {

      return (

        <Card>

          <CardContent className="py-10 text-center text-sm text-muted-foreground">

            Marketing materials have not been generated for this team yet.

          </CardContent>

        </Card>

      );

    }



    const brandValues: string[] = Array.isArray(branding?.brand_values) ? branding.brand_values : [];



    return (

      <div className="space-y-6">

        <Card>

          <CardHeader>

            <CardTitle>Campaign Preferences</CardTitle>

            <CardDescription>High-level objectives and guardrails for marketing</CardDescription>

          </CardHeader>

          <CardContent>

            <div className="grid gap-6 md:grid-cols-2">

              <div className="space-y-2 text-sm">

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Campaign Goal</span>

                  <span className="font-medium">{calendar?.campaign_goal || 'Not specified'}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Campaign Tone</span>

                  <span className="font-medium">{calendar?.campaign_tone || 'Not specified'}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Posting Frequency</span>

                  <span className="font-medium">{calendar?.posting_frequency || 'Not specified'}</span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Budget Range</span>

                  <span className="font-medium">{calendar?.budget_range || 'Not specified'}</span>

                </div>

                <div>

                  <div className="text-sm font-semibold mb-1">Primary Platforms</div>

                  <div className="flex flex-wrap gap-2">

                    {platforms.length ? (

                      platforms.map((platform, idx) => (

                        <Badge key={idx} variant="outline">

                          {platform}

                        </Badge>

                      ))

                    ) : (

                      <span className="text-sm text-muted-foreground">Not specified</span>

                    )}

                  </div>

                </div>

              </div>

              <div className="space-y-2 text-sm">

                <div className="flex items-center justify-between">

                  <span className="text-muted-foreground">Brand Name</span>

                  <span className="font-medium">{branding?.brand_name || 'Not specified'}</span>

                </div>

                <div>

                  <div className="text-muted-foreground text-sm mb-1">Brand Identity</div>

                  <div className="text-sm">{branding?.brand_identity || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground text-sm mb-1">Brand Persona</div>

                  <div className="text-sm">{branding?.brand_persona || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground text-sm mb-1">Brand Values</div>

                  <div className="flex flex-wrap gap-2">

                    {brandValues.length ? (

                      brandValues.map((value, idx) => (

                        <Badge key={idx} variant="outline">

                          {value}

                        </Badge>

                      ))

                    ) : (

                      <span className="text-sm text-muted-foreground">Not specified</span>

                    )}

                  </div>

                </div>

              </div>

            </div>

          </CardContent>

        </Card>



        {hasTargetAudience ? (

          <Card>

            <CardHeader>

              <CardTitle>Target Audience</CardTitle>

              <CardDescription>Who the campaign is designed to reach</CardDescription>

            </CardHeader>

            <CardContent>

              <div className="grid gap-4 md:grid-cols-2 text-sm">

                <div>

                  <div className="text-muted-foreground">Customer Type</div>

                  <div className="font-medium">{targetAudience?.customer_type || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground">Age Range</div>

                  <div className="font-medium">{targetAudience?.age_range || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground">Income Level</div>

                  <div className="font-medium">{targetAudience?.income || targetAudience?.income_level || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground">Location</div>

                  <div className="font-medium">{targetAudience?.location || 'Not specified'}</div>

                </div>

              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">

                <div>

                  <div className="text-muted-foreground mb-1">Pain Points</div>

                  <div>{targetAudience?.pain_points || 'Not specified'}</div>

                </div>

                <div>

                  <div className="text-muted-foreground mb-1">Goals & Behaviors</div>

                  <div>{targetAudience?.goals || targetAudience?.behaviors || 'Not specified'}</div>

                </div>

              </div>

            </CardContent>

          </Card>

        ) : null}



        {sortedCampaignEntries.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Calendar</CardTitle>
              <CardDescription>Click a day to see details and images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center font-semibold text-sm p-2 bg-muted rounded">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {sortedCampaignEntries.map((plan: any, index: number) => {
                    const dateObj = plan.date ? new Date(plan.date) : null;
                    const isValidDate = dateObj ? !Number.isNaN(dateObj.getTime()) : false;
                    const dayOfWeek = isValidDate && index === 0 ? dateObj!.getDay() : undefined;
                    const key = `${plan.date}-${index}`;
                    const label = isValidDate ? String(dateObj!.getDate()) : plan.date || `Day ${plan.dayOfCampaign}`;
                    const onClick = () => {
                      setSelectedCalendarDate(isValidDate ? dateObj!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${plan.dayOfCampaign}`);
                      setSelectedCalendarEntries([plan]);
                      setCalendarDialogOpen(true);
                    };
                  return (
                      <div
                        key={key}
                        className="min-h-[180px] p-2 border rounded-lg hover:shadow-md transition-shadow bg-card flex flex-col gap-1 cursor-pointer"
                        style={{ gridColumnStart: dayOfWeek !== undefined ? dayOfWeek + 1 : undefined }}
                        onClick={onClick}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-semibold text-sm text-foreground">{label}</span>
                          {plan.posting_time ? <span>{plan.posting_time}</span> : null}
                        </div>
                        <div className="text-xs">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{plan.theme || 'Campaign Drop'}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {plan.caption || plan.contentType || 'Planned activation'}
                      </div>
                        <div className="text-xs text-primary font-semibold flex items-center justify-between">
                          <span>{plan.platform}</span>
                          <span>{plan.impressions ? plan.impressions : 'Organic'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </CardContent>
          </Card>
        ) : null}



        {hasAssets ? (

          <Card>

            <CardHeader>

              <CardTitle>Generated Assets</CardTitle>

              <CardDescription>Visuals created for the campaign schedule</CardDescription>

            </CardHeader>

            <CardContent>

              <div className="space-y-4">

                {galleryGroups.map((group, groupIndex) => (

                  <div key={group.entryKey ?? groupIndex} className="space-y-3 rounded border p-3">

                    <div className="text-sm font-semibold">

                      {group.entryKey || 'Campaign Entry'}

                    </div>

                    <div className="grid gap-3 md:grid-cols-3">

                      {group.images.map((image: any, imageIndex: number) => {
                        const candidate = image?.url || image?.image_url || image?.file_url || image?.path || image?.src;
                        const absolute = toAbsoluteMediaUrl(candidate);
                        const imageUrl = absolute ? `${absolute}${absolute.includes('?') ? '&' : '?'}ts=${Date.now()}` : '';
                        if (!imageUrl) return null;

                        return (

                          <div key={image.id ?? imageIndex} className="overflow-hidden rounded border bg-muted/20">

                            <img

                              src={imageUrl}

                              alt={image?.image_prompt || image?.caption || 'Campaign asset'}

                              className="h-40 w-full object-cover"

                              onError={(e) => {
                                try {
                                  const el = e.currentTarget as HTMLImageElement;
                                  if (absolute && el.dataset.fallback !== '1') {
                                    el.dataset.fallback = '1';
                                    el.src = absolute;
                                  } else if (candidate && typeof candidate === 'string') {
                                    el.src = candidate;
                                  }
                                } catch {}
                              }}

                            />

                            {image?.image_prompt || image?.caption ? (

                              <div className="border-t bg-background px-2 py-2 text-xs text-muted-foreground">

                                {image.image_prompt || image.caption}

                              </div>

                            ) : null}

                          </div>

                        );

                      })}

                    </div>

                  </div>

                ))}

              </div>

            </CardContent>

          </Card>

        ) : null}

        <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Campaign Day Details</DialogTitle>
              <DialogDescription>{selectedCalendarDate || 'Selected day'} • {selectedCalendarEntries.length} post(s)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCalendarEntries.map((entry: any, idx: number) => {
                const imagesForEntry = (() => {
                  const groups: Array<any> = Array.isArray(marketingImages) ? marketingImages : [];
                  const dateStr: string | null = entry.date || entry.scheduled_date || null;
                  const normalizedDate = (() => {
                    if (!dateStr) return null;
                    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return null; }
                  })();
                  const candidateKeys = [
                    entry.entry_key,
                    entry.day_of_campaign,
                    entry.dayOfCampaign,
                    normalizedDate,
                    dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : null,
                    entry.date,
                    entry.scheduled_date,
                  ].filter(Boolean).map(String);
                  const group = groups.find((g: any) => {
                    const ek = String(g?.entryKey ?? '');
                    const aliases: string[] = Array.isArray(g?.aliases) ? g.aliases : [];
                    return candidateKeys.includes(ek) || aliases.some(a => candidateKeys.includes(String(a)));
                  });
                  return group?.images || [];
                })();
                return (
                  <div key={idx} className="rounded border">
                    <div className="px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{entry.platform || 'Platform'}</Badge>
                        <Badge variant="outline" className="text-xs">{entry.contentType || entry.content_type || 'Type'}</Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium">{entry.theme || 'Theme TBD'}</div>
                      <div className="text-xs text-muted-foreground mt-1">{entry.caption || 'No caption provided.'}</div>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {entry.postingTime || entry.posting_time || 'Time TBD'}
                        {entry.impressions ? <><span>•</span><span>{entry.impressions} impressions</span></> : null}
                      </div>
                      {entry.imagePrompt ? (
                        <div className="bg-muted p-2 rounded">
                          <span className="font-medium">Original Prompt:</span>
                          <p className="mt-1 text-muted-foreground">{entry.imagePrompt}</p>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {entry.call_to_action ? <span>CTA: {entry.call_to_action}</span> : null}
                        {entry.content_type ? <span>Type: {entry.content_type}</span> : null}
                      </div>
                    </div>
                    {imagesForEntry.length ? (
                      <div className="px-4 pb-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          {imagesForEntry.map((image: any, imageIndex: number) => {
                            const candidate = image?.url || image?.image_url || image?.file_url || image?.path || image?.src;
                            const absolute = toAbsoluteMediaUrl(candidate);
                            const imageUrl = absolute ? `${absolute}${absolute.includes('?') ? '&' : '?'}ts=${Date.now()}` : '';
                            if (!imageUrl) return null;
                            return (
                              <div key={image.id ?? imageIndex} className="overflow-hidden rounded border bg-muted/20">
                                <img
                                  src={imageUrl}
                                  alt={image?.image_prompt || image?.caption || 'Campaign asset'}
                                  className="h-40 w-full object-cover"
                                  onError={(e) => {
                                    try {
                                      const el = e.currentTarget as HTMLImageElement;
                                      if (absolute && el.dataset.fallback !== '1') {
                                        el.dataset.fallback = '1';
                                        el.src = absolute;
                                      } else if (candidate && typeof candidate === 'string') {
                                        el.src = candidate;
                                      }
                                    } catch {}
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-4 text-sm text-muted-foreground">
                        No images generated for this day.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

      </div>

    );

  };



const renderCurrentSection = () => {
    switch (currentSection) {
      case 'idea':
        return renderIdeaSection();
      case 'mockups':
        return renderMockupsSection();
      case 'validation':
        return renderValidationSection();
      case 'pitch_deck':
        return renderPitchDeckSection();
      case 'mvp':
        return renderMvpSection();
      case 'finance':
        return renderFinanceSection();
      case 'marketing':
        return renderMarketingSection();
      case 'assignments':
        return (
          <div className="text-sm text-muted-foreground">
            Mentor and investor assignments are managed by administrators.
          </div>
        );
      default:
        return null;
    }
  };

  if (!team?.id) {
    return (
      <div className="text-sm text-muted-foreground">No team selected.</div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{team?.name || 'Team'}</CardTitle>
            <div className="text-sm text-muted-foreground">{headerSubtitle}</div>
          </div>
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to Controls
            </Button>
          )}
        </CardHeader>
      </Card>

      {shouldShowNavigation && (
        <div className="flex flex-wrap gap-2">
          {sectionOptions.map((section) => (
            <Button
              key={section.key}
              variant={currentSection === section.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSection(section.key)}
            >
              {section.label}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          Loading detailed progress...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-10 text-sm text-destructive">
          {error}
        </div>
      ) : (
        renderCurrentSection()
      )}
    </div>
  );
};

export default TeamProgressView;













