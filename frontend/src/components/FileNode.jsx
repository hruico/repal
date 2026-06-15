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

export function nodeSize(loc) {
  if (loc > 600) return 96;
  if (loc > 400) return 84;
  if (loc > 250) return 72;
  if (loc > 150) return 62;
  if (loc > 80)  return 52;
  if (loc > 30)  return 44;
  return 36;
}

// ── Smart middle-truncation ───────────────────────────────────────────────────
function smartTruncate(name, maxLen) {
  if (name.length <= maxLen) return name;
  const keep = maxLen - 1;
  const front = Math.ceil(keep * 0.6);
  const back = keep - front;
  return `${name.slice(0, front)}…${name.slice(-back)}`;
}

export default function FileNode({ data, selected, colorMode = 'ext' }) {
  const [hovered, setHovered] = useState(false);

  const color = data.in_cycle ? T.red : nodeColor(data, colorMode);
  const size  = nodeSize(data.loc);

  const locColor =
    data.loc > 300 ? T.red :
    data.loc > 150 ? T.amber :
    T.textSecondary;

  const maxChars = Math.floor(size / 8);
  const base  = data.label.replace(/\.[^.]+$/, '');
  const label = smartTruncate(base, maxChars);

  const fontSize   = size >= 72 ? 10 : size >= 52 ? 9 : 8;
  const handleSize = size >= 72 ? 7 : 6;

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: selected
          ? `radial-gradient(circle at 38% 32%, ${color}35 0%, #1a2035 60%, ${T.bg0} 100%)`
          : `radial-gradient(circle at 38% 32%, ${color}18 0%, ${T.bg1}cc 55%, ${T.bg0}aa 100%)`,
        border: `${selected ? 2.5 : 1.5}px solid ${selected ? color : color + '55'}`,
        boxShadow: selected
          ? `0 0 0 4px ${color}20, 0 0 28px ${color}35, inset 0 1px 0 ${color}30`
          : hovered
            ? `0 0 18px ${color}40, inset 0 1px 0 ${color}30`
            : `0 0 14px ${color}18, inset 0 1px 0 ${color}18`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        transform: selected ? 'scale(1.08)' : hovered ? 'scale(1.04)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{
        background: color, width: handleSize, height: handleSize,
        border: `2px solid ${T.bg0}`, top: -(handleSize / 2),
        boxShadow: `0 0 6px ${color}90`,
      }} />

      {/* Name */}
      <span style={{
        fontSize, fontWeight: 600,
        color: selected ? T.textPrimary : '#c9d1d9',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center', lineHeight: 1.25,
        maxWidth: size - 12, overflow: 'hidden',
        letterSpacing: '-0.01em', padding: '0 4px',
      }}>
        {label}
      </span>

      {/* LoC */}
      <span style={{
        fontSize: Math.max(7, fontSize - 1),
        color: locColor, fontFamily: 'var(--font-mono)',
        marginTop: 2, opacity: 0.9,
      }}>
        {data.loc}L
      </span>

      {/* CC — only on larger circles */}
      {data.complexity != null && size >= 62 && (
        <span style={{
          fontSize: 7,
          color: data.complexity > 10 ? T.red : data.complexity > 5 ? T.amber : T.green,
          fontFamily: 'var(--font-mono)', opacity: 0.85,
        }}>
          cc{data.complexity}
        </span>
      )}

      {/* Risk badge — only in risk mode on larger circles */}
      {colorMode === 'risk' && data.risk_score != null && size >= 52 && (
        <span style={{
          fontSize: 7,
          color: T.heatRisk(data.risk_score),
          fontFamily: 'var(--font-mono)', fontWeight: 700,
          opacity: 0.95, letterSpacing: '0.01em',
        }}>
          ⚠{(data.risk_score * 100).toFixed(0)}
        </span>
      )}

      {/* Cycle dot */}
      {data.in_cycle && (
        <span style={{
          position: 'absolute', top: 1, right: 1,
          width: 9, height: 9, borderRadius: '50%',
          background: T.red, border: `2px solid ${T.bg0}`,
          boxShadow: `0 0 8px ${T.red}`,
        }} />
      )}

      {/* Extension label */}
      <span style={{
        position: 'absolute',
        bottom: -(size >= 62 ? 18 : 15),
        fontSize: size >= 62 ? 9 : 8, color,
        fontFamily: 'var(--font-mono)', fontWeight: 700,
        whiteSpace: 'nowrap', letterSpacing: '0.03em',
        opacity: 0.85, pointerEvents: 'none',
      }}>
        {data.extension}
      </span>

      {/* ── Hover tooltip ─────────────────────────────────────────────────── */}
      {hovered && !selected && (
        <div style={{
          position: 'absolute',
          bottom: size + 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: '6px 10px',
          minWidth: 160,
          maxWidth: 240,
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Full path */}
          <div style={{
            fontSize: 10, color: T.textPrimary,
            fontFamily: 'var(--font-mono)', fontWeight: 600,
            wordBreak: 'break-all', lineHeight: 1.5,
            marginBottom: 5,
          }}>
            {data.full_path}
          </div>
          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 10,
            fontSize: 9, fontFamily: 'var(--font-mono)',
          }}>
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
          {/* Arrow pointing down to node */}
          <div style={{
            position: 'absolute', bottom: -5, left: '50%',
            transform: 'translateX(-50%)',
            width: 8, height: 8,
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{
        background: color, width: handleSize, height: handleSize,
        border: `2px solid ${T.bg0}`, bottom: -(handleSize / 2),
        boxShadow: `0 0 6px ${color}90`,
      }} />
    </div>
  );
}
