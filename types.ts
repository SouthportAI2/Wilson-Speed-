
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EMAILS = 'EMAILS',
  AUDIO_LOGS = 'AUDIO_LOGS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  REVIEWS = 'REVIEWS',
  SETTINGS = 'SETTINGS',
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

export interface SocialPost {
  id: string;
  platform: 'Facebook' | 'Instagram';
  content: string;
  status: 'Published' | 'Scheduled' | 'Draft';
  scheduledFor?: string;
  engagement?: string;
  imageUrl?: string;
}

export interface ReviewRequest {
  email: string;
  status: 'Sent' | 'Pending';
  generatedContent?: string;
  sentAt?: string;
}
