export const T = {
  // Backgrounds
  bg0:    '#0d1117',   // page / canvas
  bg1:    '#161b22',   // cards, panels
  bg2:    '#21262d',   // inputs, hover states
  border: '#30363d',   // all borders

  // Accents
  indigo:    '#818cf8',
  indigoDim: '#312e81',
  amber:     '#fbbf24',
  green:     '#34d399',
  red:       '#f87171',
  teal:      '#2dd4bf',

  // Text
  textPrimary:   '#e6edf3',
  textSecondary: '#8b949e',
  textMuted:     '#484f58',

  // Extension node colors
  ext: {
    '.py':   '#3b82f6',
    '.js':   '#fbbf24',
    '.ts':   '#818cf8',
    '.jsx':  '#fb923c',
    '.tsx':  '#a78bfa',
    '.cpp':  '#34d399',
    '.c':    '#34d399',
    '.h':    '#10b981',
    '.java': '#f87171',
    '.go':   '#2dd4bf',
    '.rs':   '#fb923c',
  },

  // Heatmap ramps
  heatLoc: (loc) => {
    if (loc > 400) return '#f87171';
    if (loc > 200) return '#fbbf24';
    if (loc > 80)  return '#34d399';
    return '#818cf8';
  },
  heatCC: (cc) => {
    if (!cc)     return '#484f58';
    if (cc > 10) return '#f87171';
    if (cc > 5)  return '#fbbf24';
    return '#34d399';
  },
  // Continuous risk heat: 0 (green) → 0.5 (amber) → 1 (red)
  heatRisk: (score) => {
    if (score == null) return '#484f58';
    const t = Math.max(0, Math.min(1, score));
    const r = Math.round(255 * Math.min(1, t * 2));
    const g = Math.round(200 * Math.min(1, (1 - t) * 2));
    return `rgb(${r}, ${g}, 30)`;
  },
};
