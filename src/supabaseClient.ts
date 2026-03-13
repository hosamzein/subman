import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhszkqnksnyppmumssog.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoc3prcW5rc255cHBtdW1zc29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTU2NDksImV4cCI6MjA4ODk3MTY0OX0.2rUYgegZz4zIORn6U9X7DeEb2VCacmdsiRsfkozb-24';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  role: 'admin' | 'editor';
  status: 'pending' | 'approved' | 'rejected';
};

export type Subscription = {
  id: number;
  user_id: string;
  service: string;
  category?: string;
  duration: 'monthly' | 'quarterly' | 'yearly';
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
