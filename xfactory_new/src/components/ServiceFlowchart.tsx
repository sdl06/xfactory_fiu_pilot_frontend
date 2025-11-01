import React, { useMemo } from 'react';

type FlowNode = {
  id: string;
  label: string;
  lane?: string;
  type?: 'start'|'end'|'process'|'decision'|'system'|'subprocess'|'feedback';
  x?: number;
  y?: number;
};

type FlowEdge = { from: string; to: string; label?: string };

export interface ServiceFlowchartProps {
  flow: { lanes?: string[]; nodes: FlowNode[]; edges: FlowEdge[] };
  zoom?: number;
  height?: number;
}

/**
 * Read‑only flowchart renderer that mirrors the user mockup renderer.
 * It honors saved x/y coordinates; otherwise applies the same simple
 * column layering and elbow edge routing used in the editor.
 */
export const ServiceFlowchart: React.FC<ServiceFlowchartProps> = ({ flow, zoom = 1, height = 420 }) => {
  const lanes = useMemo(() => {
    const ls = (Array.isArray(flow?.lanes) && flow.lanes.length)
      ? flow.lanes
      : Array.from(new Set((flow?.nodes || []).map(n => n.lane || 'Flow')));
    return ls;
  }, [flow]);

  const laneIndex: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    lanes.forEach((l, i) => map[l] = i);
    return map;
  }, [lanes]);

  const approxTextWidth = (s: string, size = 10) => Math.max(8, Math.min(140, Math.round(String(s||'').length * (size * 0.6))));
  const measureNode = (label: string) => {
    const base = 85;
    const max = 130;
    const w = Math.min(max, Math.max(base, approxTextWidth(label, 10) + 12));
    const h = 36;
    return { w, h };
  };

  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  if (!nodes.length) return null;

  // Layering columns (same logic as editor; ignores backward/"No" for stability)
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

  // Layout constants - reduced sizes to prevent squeezing with more spacing
  const laneH = 90; const lanePad = 25; const colW = 160; const gPad = 20;

  // Compute positions honoring saved x/y with increased horizontal spacing
  const xy: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n => {
    const li = laneIndex[n.lane || lanes[0]] || 0;
    // Increased spacing: gPad + 80 instead of 60, and use colW spacing
    const autoX = gPad + 80 + (col[n.id] || 0) * colW;
    const autoY = lanePad + li * laneH + laneH/2;
    const x = (typeof n.x === 'number') ? n.x : autoX;
    const y = (typeof n.y === 'number') ? n.y : autoY;
    xy[n.id] = { x, y };
  });

  // Compute canvas bounds
  const bounds = Object.entries(xy).reduce((acc, [id, p]) => {
    const { w, h } = measureNode(nodes.find(n => n.id === id)?.label || '');
    acc.minX = Math.min(acc.minX, p.x - w/2 - gPad);
    acc.maxX = Math.max(acc.maxX, p.x + w/2 + gPad);
    acc.minY = Math.min(acc.minY, p.y - h/2 - gPad);
    acc.maxY = Math.max(acc.maxY, p.y + h/2 + gPad);
    return acc;
  }, { minX: 0, minY: 0, maxX: 800, maxY: Math.max(lanes.length * laneH + lanePad * 2, 400) });
  const width = Math.max(800, bounds.maxX - bounds.minX);
  const svgHeight = Math.max(Math.max(lanes.length * laneH + lanePad * 2, 360), bounds.maxY - bounds.minY);
  const tx = -bounds.minX;
  const ty = -bounds.minY;

  const wrapLabel = (label: string, maxChars = 14): string[] => {
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
      <div style={{ width: `${Math.max(width * zoom, width)}px`, minWidth: '100%' }}>
        <svg viewBox={`0 0 ${width} ${svgHeight}`} style={{ width: `${width * zoom}px`, height, minWidth: '100%' }}>
          <g transform={`translate(${tx}, ${ty})`}>
            {/* Swimlanes */}
            {lanes.map((l, i) => (
              <g key={l}>
                <rect x={0} y={lanePad + i * laneH - laneH/2 + laneH/2} width={width} height={laneH} fill={i % 2 === 0 ? '#fafafa' : '#ffffff'} stroke="#f3f4f6" />
                <text x={12} y={lanePad + i * laneH + 16} fill="#6b7280" fontSize={10} fontWeight={700}>{l}</text>
              </g>
            ))}
            {/* Edges (orthogonal elbows) */}
            <defs>
              <marker id="svc-edge" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M0,0 L0,10 L10,5 z" fill="#9ca3af" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const a = xy[e.from]; const b = xy[e.to]; if (!a || !b) return null;
              const midX = (a.x + b.x) / 2;
              const path = `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
              return (
                <g key={`e-${i}`}>
                  <path d={path} fill="none" stroke="#9ca3af" strokeWidth={2} markerEnd="url(#svc-edge)" />
                  {e.label && (() => {
                    const txl = midX; const tyl = (a.y + b.y) / 2 - 6;
                    const tw = approxTextWidth(String(e.label), 10) + 8; const th = 14;
                    return (
                      <g>
                        <rect x={txl - tw/2} y={tyl - th + 4} width={tw} height={th} rx={3} ry={3} fill="#ffffff" opacity={0.9} />
                        <text x={txl} y={tyl} textAnchor="middle" fill="#6b7280" fontSize="10">{e.label}</text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
            {/* Nodes */}
            {nodes.map(n => {
              const p = xy[n.id]; if (!p) return null;
              const { w, h } = measureNode(n.label);
              const type = n.type || 'process';
              if (type === 'start' || type === 'end') {
                return (
                  <g key={n.id}>
                    <ellipse cx={p.x} cy={p.y} rx={w/2} ry={h/2} fill="#fff" stroke="#e5e7eb" />
                    {wrapLabel(n.label).map((line, i) => (
                      <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 11} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="10" fontWeight={500}>{line}</text>
                    ))}
                  </g>
                );
              }
              if (type === 'decision') {
                const s = 32;
                return (
                  <g key={n.id}>
                    <polygon points={`${p.x},${p.y - s} ${p.x + s},${p.y} ${p.x},${p.y + s} ${p.x - s},${p.y}`} fill="#fff" stroke="#f59e0b" />
                    {wrapLabel(n.label, 14).map((line, i) => (
                      <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label,14).length-1)/2) * 11} dominantBaseline="middle" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight={500}>{line}</text>
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
                      <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 11} dominantBaseline="middle" textAnchor="middle" fill="#0e7490" fontSize="10" fontWeight={500}>{line}</text>
                    ))}
                  </g>
                );
              }
              return (
                <g key={n.id}>
                  <rect x={p.x - w/2} y={p.y - h/2} width={w} height={h} rx={8} ry={8} fill="#fff" stroke="#e5e7eb" />
                  {wrapLabel(n.label).map((line, i) => (
                    <text key={i} x={p.x} y={p.y + (i - (wrapLabel(n.label).length-1)/2) * 11} dominantBaseline="middle" textAnchor="middle" fill="#111827" fontSize="10" fontWeight={500}>{line}</text>
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default ServiceFlowchart;


