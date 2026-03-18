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
  subscriptionmail?: string;
  subscription_mail?: string;
  subscriptionpassword?: string;
  subscription_password?: string;
  whatsapp: string;
  facebook: string;
  twofactorsecret?: string | null;
  twofactorcode?: string | null;
  two_factor_secret?: string | null;
  two_factor_code?: string | null;
  countrycode: string;
  startdate: string;
  enddate: string;
  payment: number;
  workspace: string;
  createdat: string;
  updatedat?: string | null;
  updatedby?: string | null;
};

export type Subscription = {
  id: number;
  user_id: string;
  service: string;
  category?: string;
  duration: SubscriptionDuration;
  name: string;
  email: string;
  subscriptionMail: string;
  subscriptionPassword: string;
  whatsapp: string;
  facebook: string;
  twoFactorSecret?: string;
  twoFactorCode?: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  payment: number;
  workspace: string;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
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

export type UserAuthMethod = 'email' | 'google' | 'email+google' | 'unknown';

export type UserAuthMethodRow = {
  user_id: string;
  providers: string[] | null;
};

export type SettingRecord = {
  id: string;
  value: string;
};
