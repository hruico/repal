import { useState } from 'react';
import { T } from '../theme';

// File icons by extension
const FILE_ICONS = {
  '.py':   { icon: '🐍', color: '#3b82f6' },
  '.js':   { icon: 'JS', color: '#fbbf24', text: true },
  '.ts':   { icon: 'TS', color: '#818cf8', text: true },
  '.jsx':  { icon: 'JX', color: '#fb923c', text: true },
  '.tsx':  { icon: 'TX', color: '#a78bfa', text: true },
  '.cpp':  { icon: 'C+', color: '#34d399', text: true },
  '.c':    { icon: 'C',  color: '#34d399', text: true },
  '.h':    { icon: 'H',  color: '#10b981', text: true },
  '.java': { icon: '☕', color: '#f87171' },
  '.go':   { icon: 'Go', color: '#2dd4bf', text: true },
  '.rs':   { icon: '⚙', color: '#fb923c' },
};

function FileIcon({ ext }) {
  const cfg = FILE_ICONS[ext] || { icon: '·', color: T.textMuted };
  if (cfg.text) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 3,
        background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`,
        fontSize: 8, fontWeight: 800, color: cfg.color,
        fontFamily: 'var(--font-mono)', flexShrink: 0,
        letterSpacing: '-0.5px',
      }}>
        {cfg.icon}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1 }}>{cfg.icon}</span>
  );
}

function TreeNode({ node, depth, onFileClick, activeId }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === 'file') {
    const isActive = node.id === activeId;
    return (
      <div
        onClick={() => onFileClick(node.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 8px 3px',
          paddingLeft: depth * 14 + 8,
          cursor: 'pointer',
          borderRadius: 4,
          background: isActive ? `${T.indigo}18` : 'transparent',
          color: isActive ? T.indigo : T.textSecondary,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = T.bg2;
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        <FileIcon ext={node.extension} />
        <span style={{
          fontSize: 12, fontFamily: 'var(--font-mono)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {node.name}
        </span>
      </div>
    );
  }

  // Directory
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 8px',
          paddingLeft: depth * 14 + 8,
          cursor: 'pointer',
          borderRadius: 4,
          color: T.textSecondary,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke={T.textMuted} strokeWidth="2.5"
          style={{
            flexShrink: 0, transition: 'transform 0.15s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
        {/* Folder icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            fill={open ? `${T.amber}30` : `${T.textMuted}18`}
            stroke={open ? T.amber : T.textMuted} strokeWidth="1.5"/>
        </svg>
        <span style={{
          fontSize: 12, fontFamily: 'var(--font-mono)',
          color: open ? T.textPrimary : T.textSecondary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {node.name}
        </span>
        <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 'auto', flexShrink: 0 }}>
          {node.children?.filter(c => c.type === 'file').length || ''}
        </span>
      </div>

      {open && node.children?.map((child, i) => (
        <TreeNode
          key={i}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          activeId={activeId}
        />
      ))}
    </div>
  );
}

export default function FolderTree({ node, onFileClick, activeId }) {
  if (!node) return null;
  return (
    <div style={{ fontSize: 12, userSelect: 'none' }}>
      {node.children?.map((child, i) => (
        <TreeNode
          key={i}
          node={child}
          depth={0}
          onFileClick={onFileClick}
          activeId={activeId}
        />
      ))}
    </div>
  );
}
