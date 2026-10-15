export type Theme = {
  id: string;
  name: string;
  premium: boolean;
  /** Screen background gradient (top → bottom) */
  background: [string, string];
  /** Die face gradient (top-left → bottom-right) */
  dieFace: [string, string];
  pip: string;
  dieBorder: string;
  /** Primary text color */
  text: string;
  /** Secondary / muted text color */
  muted: string;
  /** Roll button + highlights */
  accent: string;
  /** Text drawn on top of the accent color */
  onAccent: string;
  /** Translucent card / panel color */
  card: string;
  /** Status bar icon style */
  statusBar: 'light' | 'dark';
  /** 3D die material */
  die3d: {
    body: string;
    roughness: number;
    metalness: number;
    clearcoat: number;
    opacity?: number;
    /** Pips glow (unlit, bright) instead of being painted */
    pipGlow?: boolean;
  };
};

export const THEMES: Theme[] = [
  // ---------- Free ----------
  {
    id: 'classic',
    name: 'Classic',
    premium: false,
    background: ['#F4F1EA', '#E7E1D4'],
    dieFace: ['#FFFFFF', '#F1EEE8'],
    pip: '#1E1E1E',
    dieBorder: '#D9D3C6',
    text: '#1E1E1E',
    muted: '#7A7468',
    accent: '#C8372D',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.65)',
    statusBar: 'dark',
    die3d: { body: '#FBF9F4', roughness: 0.35, metalness: 0, clearcoat: 0.6 },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    premium: false,
    background: ['#141824', '#0A0C12'],
    dieFace: ['#2B3245', '#1D2232'],
    pip: '#F2F4F8',
    dieBorder: '#3A4360',
    text: '#F2F4F8',
    muted: '#8A93AB',
    accent: '#6C8CFF',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.06)',
    statusBar: 'light',
    die3d: { body: '#262C3E', roughness: 0.3, metalness: 0.1, clearcoat: 0.8 },
  },
  {
    id: 'mint',
    name: 'Mint',
    premium: false,
    background: ['#E3F6EE', '#C9EBDD'],
    dieFace: ['#FFFFFF', '#EEFAF5'],
    pip: '#11624A',
    dieBorder: '#A9DCC6',
    text: '#0E3B2E',
    muted: '#4E7D6E',
    accent: '#14866A',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.6)',
    statusBar: 'dark',
    die3d: { body: '#F4FCF8', roughness: 0.35, metalness: 0, clearcoat: 0.6 },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    premium: false,
    background: ['#FFB38A', '#F06A6A'],
    dieFace: ['#FFF7F0', '#FFE6D6'],
    pip: '#7A1F2B',
    dieBorder: '#FFD2BA',
    text: '#3D0E14',
    muted: '#7A3A3A',
    accent: '#7A1F2B',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.35)',
    statusBar: 'dark',
    die3d: { body: '#FFF1E6', roughness: 0.35, metalness: 0, clearcoat: 0.6 },
  },

  // ---------- Premium ----------
  {
    id: 'neon',
    name: 'Neon Arcade',
    premium: true,
    background: ['#1A0533', '#07010F'],
    dieFace: ['#2A0B4D', '#120424'],
    pip: '#39FFB6',
    dieBorder: '#FF2BD6',
    text: '#F7E9FF',
    muted: '#B48AD6',
    accent: '#FF2BD6',
    onAccent: '#1A0533',
    card: 'rgba(255,43,214,0.10)',
    statusBar: 'light',
    die3d: { body: '#24083F', roughness: 0.25, metalness: 0.2, clearcoat: 1, pipGlow: true },
  },
  {
    id: 'gold',
    name: 'Gold Luxe',
    premium: true,
    background: ['#1B1712', '#0B0A08'],
    dieFace: ['#F3D98B', '#C99A3B'],
    pip: '#231A0B',
    dieBorder: '#E7C46A',
    text: '#F6E7C1',
    muted: '#A9926A',
    accent: '#E2B957',
    onAccent: '#1B1712',
    card: 'rgba(226,185,87,0.10)',
    statusBar: 'light',
    die3d: { body: '#EDC768', roughness: 0.3, metalness: 0.35, clearcoat: 0.8 },
  },
  {
    id: 'ocean',
    name: 'Ocean Glass',
    premium: true,
    background: ['#0F6E8C', '#062A40'],
    dieFace: ['rgba(255,255,255,0.92)', 'rgba(198,236,247,0.85)'],
    pip: '#0A4A63',
    dieBorder: '#9FE3F5',
    text: '#EAFBFF',
    muted: '#9CCFDD',
    accent: '#5FE0FF',
    onAccent: '#06303F',
    card: 'rgba(255,255,255,0.10)',
    statusBar: 'light',
    die3d: { body: '#BFEAF6', roughness: 0.08, metalness: 0, clearcoat: 1, opacity: 0.82 },
  },
  {
    id: 'wood',
    name: 'Walnut',
    premium: true,
    background: ['#3B2A1E', '#22170F'],
    dieFace: ['#E9D3B0', '#CDAE82'],
    pip: '#3A2414',
    dieBorder: '#B8925F',
    text: '#F3E3C8',
    muted: '#B39A78',
    accent: '#D08C3E',
    onAccent: '#22170F',
    card: 'rgba(243,227,200,0.08)',
    statusBar: 'light',
    die3d: { body: '#D9BC92', roughness: 0.7, metalness: 0, clearcoat: 0.15 },
  },
  {
    id: 'candy',
    name: 'Candy Pop',
    premium: true,
    background: ['#FFD6EC', '#C7E3FF'],
    dieFace: ['#FFFFFF', '#FFF0F8'],
    pip: '#FF4FA3',
    dieBorder: '#FFB3D9',
    text: '#4A1838',
    muted: '#8C5577',
    accent: '#7B5CFF',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.55)',
    statusBar: 'dark',
    die3d: { body: '#FFF4FA', roughness: 0.25, metalness: 0, clearcoat: 1 },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    premium: true,
    background: ['#2C1A5E', '#05030F'],
    dieFace: ['#3E2A8A', '#160F3A'],
    pip: '#FFE27A',
    dieBorder: '#7C6BFF',
    text: '#EEE9FF',
    muted: '#A39BD1',
    accent: '#FFE27A',
    onAccent: '#1A1040',
    card: 'rgba(255,255,255,0.07)',
    statusBar: 'light',
    die3d: { body: '#2E2070', roughness: 0.2, metalness: 0.3, clearcoat: 1, pipGlow: true },
  },
  {
    id: 'lava',
    name: 'Lava',
    premium: true,
    background: ['#2A0A04', '#0D0302'],
    dieFace: ['#1F1F1F', '#0A0A0A'],
    pip: '#FF5A1F',
    dieBorder: '#FF7A2E',
    text: '#FFE6D9',
    muted: '#C08068',
    accent: '#FF5A1F',
    onAccent: '#1A0602',
    card: 'rgba(255,90,31,0.10)',
    statusBar: 'light',
    die3d: { body: '#161616', roughness: 0.3, metalness: 0.2, clearcoat: 0.9, pipGlow: true },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    premium: true,
    background: ['#F5FAFF', '#D6E6F5'],
    dieFace: ['#FFFFFF', '#E6F1FB'],
    pip: '#2E6FB0',
    dieBorder: '#B9D4EE',
    text: '#14324F',
    muted: '#5A7A99',
    accent: '#2E6FB0',
    onAccent: '#FFFFFF',
    card: 'rgba(255,255,255,0.7)',
    statusBar: 'dark',
    die3d: { body: '#F7FBFF', roughness: 0.15, metalness: 0, clearcoat: 1 },
  },
];

export const DEFAULT_THEME_ID = 'classic';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
