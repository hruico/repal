import { Handle, Position } from 'reactflow';
import { T } from '../theme';

export const EXT_COLORS = T.ext;

export function nodeColor(data, colorMode = 'ext') {
  if (colorMode === 'loc') return T.heatLoc(data.loc);
  if (colorMode === 'cc')  return T.heatCC(data.complexity);
  return T.ext[data.extension] || T.textMuted;
}

// Continuous size scale based on LoC — much wider range
export function nodeSize(loc) {
  if (loc > 600) return 96;
  if (loc > 400) return 84;
  if (loc > 250) return 72;
  if (loc > 150) return 62;
  if (loc > 80)  return 52;
  if (loc > 30)  return 44;
  return 36;
}

export default function FileNode({ data, selected, colorMode = 'ext' }) {
  const color = data.in_cycle ? T.red : nodeColor(data, colorMode);
  const size  = nodeSize(data.loc);

  const locColor =
    data.loc > 300 ? T.red :
    data.loc > 150 ? T.amber :
    T.textSecondary;

  // Trim filename — more chars for bigger circles
  const maxChars = Math.floor(size / 9);
  const base  = data.label.replace(/\.[^.]+$/, '');
  const label = base.length > maxChars ? base.slice(0, maxChars) + '…' : base;

  const fontSize = size >= 72 ? 10 : size >= 52 ? 9 : 8;
  const handleSize = size >= 72 ? 7 : 6;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: selected
        ? `radial-gradient(circle at 38% 32%, ${color}35 0%, #1a2035 60%, ${T.bg0} 100%)`
        : `radial-gradient(circle at 38% 32%, ${color}18 0%, ${T.bg1}cc 55%, ${T.bg0}aa 100%)`,
      border: `${selected ? 2.5 : 1.5}px solid ${selected ? color : color + '55'}`,
      boxShadow: selected
        ? `0 0 0 4px ${color}20, 0 0 28px ${color}35, inset 0 1px 0 ${color}30`
        : `0 0 14px ${color}18, inset 0 1px 0 ${color}18`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      position: 'relative',
      transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
      transform: selected ? 'scale(1.08)' : 'scale(1)',
    }}>
      <Handle type="target" position={Position.Top} style={{
        background: color, width: handleSize, height: handleSize,
        border: `2px solid ${T.bg0}`, top: -(handleSize / 2),
        boxShadow: `0 0 6px ${color}90`,
      }} />

      {/* Name */}
      <span style={{
        fontSize,
        fontWeight: 600,
        color: selected ? T.textPrimary : '#c9d1d9',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
        lineHeight: 1.25,
        maxWidth: size - 12,
        overflow: 'hidden',
        letterSpacing: '-0.01em',
        padding: '0 4px',
      }}>
        {label}
      </span>

      {/* LoC */}
      <span style={{
        fontSize: Math.max(7, fontSize - 1),
        color: locColor,
        fontFamily: 'var(--font-mono)',
        marginTop: 2,
        opacity: 0.9,
      }}>
        {data.loc}L
      </span>

      {/* CC — only on larger circles */}
      {data.complexity != null && size >= 62 && (
        <span style={{
          fontSize: 7,
          color: data.complexity > 10 ? T.red : data.complexity > 5 ? T.amber : T.green,
          fontFamily: 'var(--font-mono)',
          opacity: 0.85,
        }}>
          cc{data.complexity}
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

      {/* Extension label — outside circle at bottom */}
      <span style={{
        position: 'absolute',
        bottom: -(size >= 62 ? 18 : 15),
        fontSize: size >= 62 ? 9 : 8,
        color: color,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
        opacity: 0.85,
        pointerEvents: 'none',
      }}>
        {data.extension}
      </span>

      <Handle type="source" position={Position.Bottom} style={{
        background: color, width: handleSize, height: handleSize,
        border: `2px solid ${T.bg0}`, bottom: -(handleSize / 2),
        boxShadow: `0 0 6px ${color}90`,
      }} />
    </div>
  );
}
