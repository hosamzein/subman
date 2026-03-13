import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabaseAuthRedirectUrl = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'admin' | 'user';
export type DbUserRole = 'admin' | 'editor' | 'user';
export type ProfileStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionDuration = 'monthly' | 'quarterly' | 'yearly';

export type DbProfile = {
  id: string;
  username: string;
  role: DbUserRole;
  status: ProfileStatus;
};

export type Profile = {
  id: string;
  username: string;
  role: UserRole;
  status: ProfileStatus;
};

export type DbSubscription = {
  id: number;
  user_id: string;
  service: string;
  category?: string;
  duration: SubscriptionDuration;
  name: string;
  email: string;
  whatsapp: string;
  facebook: string;
  countrycode: string;
  startdate: string;
  enddate: string;
  payment: number;
  workspace: string;
  createdat: string;
};

export type Subscription = {
  id: number;
  user_id: string;
  service: string;
  category?: string;
  duration: SubscriptionDuration;
  name: string;
  email: string;
  whatsapp: string;
  facebook: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  payment: number;
  workspace: string;
  createdAt: string;
};

export type DbNotificationRecord = {
  id: number;
  user_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  createdat: string;
};

export type NotificationRecord = {
  id: number;
  user_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  createdAt: string;
};

export type SettingRecord = {
  id: string;
  value: string;
};
