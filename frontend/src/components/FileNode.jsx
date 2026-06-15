import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { T } from '../theme';

export const EXT_COLORS = T.ext;

export function nodeColor(data, colorMode = 'ext') {
  if (colorMode === 'loc')  return T.heatLoc(data.loc);
  if (colorMode === 'cc')   return T.heatCC(data.complexity);
  if (colorMode === 'risk') return T.heatRisk(data.risk_score);
  return T.ext[data.extension] || T.textMuted;
}

// Nodes are now fixed-width cards; height scales slightly with content
export function nodeSize() {
  return { w: 130, h: 52 };
}

function smartTruncate(name, maxLen) {
  if (name.length <= maxLen) return name;
  const keep = maxLen - 1;
  const front = Math.ceil(keep * 0.6);
  const back = keep - front;
  return `${name.slice(0, front)}…${name.slice(-back)}`;
}

// Small coloured square representing file extension
function ExtPip({ color }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: 2,
      background: color, flexShrink: 0, display: 'inline-block',
    }} />
  );
}

export default function FileNode({ data, selected, colorMode = 'ext' }) {
  const [hovered, setHovered] = useState(false);

  const accent = data.in_cycle ? T.red : nodeColor(data, colorMode);
  const { w, h } = nodeSize();

  const label = smartTruncate(data.label.replace(/\.[^.]+$/, ''), 16);

  const locColor =
    data.loc > 300 ? T.red :
    data.loc > 150 ? T.amber :
    T.textMuted;

  // Handle dot size
  const HS = 7;

  return (
    <div
      style={{
        width: w,
        minHeight: h,
        borderRadius: 8,
        background: selected
          ? `rgba(20,22,30,0.98)`
          : hovered
            ? `rgba(18,20,28,0.98)`
            : `rgba(14,16,22,0.96)`,
        border: selected
          ? `1px solid ${accent}90`
          : `1px solid rgba(255,255,255,0.09)`,
        boxShadow: selected
          ? `0 0 0 1px ${accent}40, 0 4px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)`
          : hovered
            ? `0 2px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 1px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'visible',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent bar — accent colour, 2px */}
      <div style={{
        height: 2, borderRadius: '8px 8px 0 0',
        background: selected || hovered
          ? `linear-gradient(90deg, ${accent} 0%, ${accent}60 100%)`
          : `linear-gradient(90deg, ${accent}50 0%, transparent 100%)`,
        transition: 'opacity 0.15s',
      }} />

      {/* Content */}
      <div style={{ padding: '6px 9px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Row 1: pip + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ExtPip color={accent} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: selected ? T.textPrimary : 'rgba(220,228,236,0.88)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        </div>

        {/* Row 2: extension tag + LoC */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{
            fontSize: 9, color: `${accent}cc`,
            fontFamily: 'var(--font-mono)', fontWeight: 600,
            background: `${accent}12`,
            border: `1px solid ${accent}28`,
            padding: '1px 5px', borderRadius: 3,
            letterSpacing: '0.02em',
          }}>
            {data.extension}
          </span>
          <span style={{ fontSize: 9, color: locColor, fontFamily: 'var(--font-mono)' }}>
            {data.loc}L
          </span>
        </div>

        {/* Row 3: complexity + risk (conditional) */}
        {(data.complexity != null || (colorMode === 'risk' && data.risk_score != null)) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {data.complexity != null && (
              <span style={{
                fontSize: 8, fontFamily: 'var(--font-mono)',
                color: data.complexity > 10 ? T.red : data.complexity > 5 ? T.amber : T.textMuted,
              }}>
                cc {data.complexity}
              </span>
            )}
            {colorMode === 'risk' && data.risk_score != null && (
              <span style={{
                fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: T.heatRisk(data.risk_score),
              }}>
                ⚠ {(data.risk_score * 100).toFixed(0)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cycle indicator — right edge red stripe */}
      {data.in_cycle && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 3, height: '100%',
          background: T.red,
          borderRadius: '0 8px 8px 0',
          boxShadow: `0 0 8px ${T.red}80`,
        }} />
      )}

      {/* ── Hover tooltip ── */}
      {hovered && !selected && (
        <div style={{
          position: 'absolute',
          bottom: h + 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,11,16,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '7px 11px',
          minWidth: 170,
          maxWidth: 240,
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: 10, color: T.textPrimary,
            fontFamily: 'var(--font-mono)', fontWeight: 600,
            wordBreak: 'break-all', lineHeight: 1.5, marginBottom: 5,
          }}>
            {data.full_path}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: data.loc > 300 ? T.red : data.loc > 150 ? T.amber : T.green }}>
              {data.loc}L
            </span>
            {data.complexity != null && (
              <span style={{ color: data.complexity > 10 ? T.red : data.complexity > 5 ? T.amber : T.green }}>
                CC {data.complexity}
              </span>
            )}
            {data.risk_score != null && (
              <span style={{ color: T.heatRisk(data.risk_score) }}>
                risk {(data.risk_score * 100).toFixed(0)}
              </span>
            )}
            <span style={{ color: T.textMuted }}>
              ↑{data.out_degree} ↓{data.in_degree}
            </span>
          </div>
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute', bottom: -5, left: '50%',
            width: 8, height: 8,
            background: 'rgba(10,11,16,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

      {/* Handles — small grey dots, React Flow style */}
      <Handle type="target" position={Position.Left} style={{
        width: HS, height: HS,
        background: hovered || selected ? accent : 'rgba(100,110,130,0.6)',
        border: `2px solid rgba(14,16,22,0.9)`,
        left: -(HS / 2),
        transition: 'background 0.15s',
        boxShadow: selected ? `0 0 6px ${accent}80` : 'none',
      }} />
      <Handle type="source" position={Position.Right} style={{
        width: HS, height: HS,
        background: hovered || selected ? accent : 'rgba(100,110,130,0.6)',
        border: `2px solid rgba(14,16,22,0.9)`,
        right: -(HS / 2),
        transition: 'background 0.15s',
        boxShadow: selected ? `0 0 6px ${accent}80` : 'none',
      }} />
    </div>
  );
}
