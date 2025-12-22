
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EMAILS = 'EMAILS',
  AUDIO_LOGS = 'AUDIO_LOGS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  REVIEWS = 'REVIEWS',
  SETTINGS = 'SETTINGS',
  DIAGNOSTICS = 'DIAGNOSTICS',
}

export interface EmailSummary {
  id: string;
  sender: string;
  subject: string;
  summary: string;
  category: 'URGENT' | 'CUSTOMER' | 'PARTS' | 'ADMIN';
  timestamp: string;
}

export interface AudioLog {
  id: string;
  timestamp: string;
  customerName: string;
  vehicle: string;
  duration: string;
  transcriptPreview: string;
  tags: string[];
  audioUrl?: string;
}

export interface InfrastructureConfig {
  n8nWebhookEmail: string;
  n8nWebhookAudio: string;
  n8nWebhookSocial: string;
  n8nWebhookReview: string;
  supabaseUrl: string;
  supabaseKey: string;
  // Business Profile
  businessName: string;
  businessPhone: string;
  googleMapsLink: string;
}
