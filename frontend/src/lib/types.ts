export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: User;
  session_expires_at?: string;
}

export interface LoginResponse {
  user: User;
  session_expires_at: string;
}

export interface FileMetadata {
  id: string;
  owner_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  storage_reference: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityItem {
  id: number;
  event_type: string;
  action: string;
  description: string;
  timestamp: string;
  status: string;
}

export interface DashboardData {
  user: User;
  file_count: number;
  storage_used: number;
  recent_files: FileMetadata[];
  recent_activity: ActivityItem[];
}

export interface EmailStatus {
  provider: string;
  configured: boolean;
  sender: string;
}
