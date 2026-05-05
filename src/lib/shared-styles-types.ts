// Comprehensive customization types for campaign shared styles

export type DashboardBlockType = 'metrics' | 'mediaValueRac' | 'genderDistribution' | 'ageGroups';
export type DashboardOrientation = 'portrait' | 'landscape';

export interface DashboardBlock {
  id: string;
  type: DashboardBlockType;
  title: string;
  visible: boolean;
  order: number;
}

export type MetricType = 
  | 'uniqueContacts'
  | 'realtimeAccurateContacts'
  | 'aggregatedAudience'
  | 'viewFrequency'
  | 'visitFrequency'
  | 'viewTime'
  | 'viewTimeTotal'
  | 'shareOfVoice';

export interface MetricConfig {
  id: string;
  type: MetricType;
  name: string;
  visible: boolean;
  order: number;
}

export interface CampaignSharedStyles {
  _id?: string;
  campaignId: string;
  
  // Background customization
  backgroundColor: string;
  backgroundGradient?: {
    enabled: boolean;
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number; // for linear gradient
  };
  
  // Text customization
  textColor: string;
  headingColor?: string;
  secondaryTextColor?: string;
  
  // Font customization
  primaryFont: string;
  headingFont?: string;
  fontSize: {
    base: string;
    heading: string;
    small: string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    bold: string;
  };
  
  // Logo customization
  logo: {
    url: string;
    width?: string;
    height?: string;
    position?: 'left' | 'center' | 'right';
    marginTop?: string;
  };

  // Footer customization
  footer: {
    backgroundUrl?: string;
    backgroundColor?: string;
  };

  // Metrics caps (for data adjustment)
  metricsCaps?: {
    totalHumanCap?: number;
    uniqueContactsCap?: number;
  };

  // Fallback data settings
  useFallbackData?: boolean;
  
  // Additional color scheme
  colorScheme: {
    primary: string;
    secondary: string;
    accent?: string;
    border?: string;
  };
  
  // Box styling
  boxStyle: {
    backgroundColor: string;
    borderRadius: string;
    borderWidth: string;
    borderColor: string;
    shadow: string;
  };
  
  // Spacing
  spacing: {
    sectionGap: string;
    contentPadding: string;
  };
  
  // Dashboard layout
  orientation: DashboardOrientation;
  blocks: DashboardBlock[];
  
  // Metrics configuration
  metrics: MetricConfig[];
  
  // Custom CSS
  customCSS?: string;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignSharedStylesInput = Omit<CampaignSharedStyles, '_id' | 'createdAt' | 'updatedAt'>;

// Available font options
export const availableFonts = [
  { name: 'Geist', value: 'Geist, sans-serif' },
  { name: 'Geist Mono', value: 'Geist Mono, monospace' },
  { name: '7-Eleven', value: 'sevenEleven, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { name: 'Items', value: 'Items, sans-serif' },
  { name: 'Oldschool', value: 'Oldschool, sans-serif' },
  { name: 'PP Neue Montreal', value: 'PP Neue Montreal, sans-serif' },
  { name: 'Eidra Sans', value: 'Eidra Sans, sans-serif' },
] as const;

// Default blocks
export const defaultBlocks: DashboardBlock[] = [
  {
    id: 'metrics',
    type: 'metrics',
    title: 'Metrics',
    visible: true,
    order: 0,
  },
  {
    id: 'mediaValueRac',
    type: 'mediaValueRac',
    title: 'Media value RAC',
    visible: true,
    order: 1,
  },
  {
    id: 'genderDistribution',
    type: 'genderDistribution',
    title: 'Contacts by gender',
    visible: true,
    order: 2,
  },
  {
    id: 'ageGroups',
    type: 'ageGroups',
    title: 'Age groups',
    visible: true,
    order: 3,
  },
];

// Default metrics configuration
export const defaultMetrics: MetricConfig[] = [
  {
    id: 'uniqueContacts',
    type: 'uniqueContacts',
    name: 'Unique Contacts',
    visible: true,
    order: 0,
  },
  {
    id: 'realtimeAccurateContacts',
    type: 'realtimeAccurateContacts',
    name: 'Realtime Accurate Contacts',
    visible: true,
    order: 1,
  },
  {
    id: 'aggregatedAudience',
    type: 'aggregatedAudience',
    name: 'Aggregated Audience',
    visible: true,
    order: 2,
  },
  {
    id: 'viewFrequency',
    type: 'viewFrequency',
    name: 'View Frequency (avr.)',
    visible: true,
    order: 3,
  },
  {
    id: 'visitFrequency',
    type: 'visitFrequency',
    name: 'Visit Frequency (avr.)',
    visible: true,
    order: 4,
  },
  {
    id: 'viewTime',
    type: 'viewTime',
    name: 'View Time (avr.)',
    visible: true,
    order: 5,
  },
  {
    id: 'viewTimeTotal',
    type: 'viewTimeTotal',
    name: 'View Time (Total)',
    visible: true,
    order: 6,
  },
  {
    id: 'shareOfVoice',
    type: 'shareOfVoice',
    name: 'Share of Voice',
    visible: true,
    order: 7,
  },
];

// Default styles
export const defaultSharedStyles: CampaignSharedStylesInput = {
  campaignId: '',
  backgroundColor: '#316a53',
  backgroundGradient: {
    enabled: false,
    type: 'linear',
    colors: ['#316a53', '#ff6c00'],
    angle: 135,
  },
  textColor: '#000000',
  headingColor: '#ffffff',
  secondaryTextColor: '#666666',
  primaryFont: 'Eidra Sans, sans-serif',
  headingFont: 'Eidra Sans, sans-serif',
  fontSize: {
    base: '16px',
    heading: '24px',
    small: '14px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    bold: '700',
  },
  logo: {
    url: '/visualart-x-aspace.svg',
    width: 'auto',
    height: '120px',
    position: 'center',
    marginTop: '70px',
  },
  footer: {
    backgroundUrl: '/footer-background.svg',
    backgroundColor: undefined,
  },
  metricsCaps: {
    totalHumanCap: undefined,
    uniqueContactsCap: undefined,
  },
  useFallbackData: false,
  colorScheme: {
    primary: '#316a53',
    secondary: '#ff6c00',
    accent: '#ffffff',
    border: '#a1a1a1',
  },
  boxStyle: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    borderWidth: '0px',
    borderColor: 'transparent',
    shadow: 'none',
  },
  spacing: {
    sectionGap: '20px',
    contentPadding: '40px',
  },
  orientation: 'landscape',
  blocks: defaultBlocks,
  metrics: defaultMetrics,
};

