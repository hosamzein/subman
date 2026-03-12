import Dexie, { type EntityTable } from 'dexie';

interface User {
  id?: number;
  username: string;
  password: string;
  role: 'admin' | 'editor';
  createdAt: string;
}

interface Subscription {
  id?: number;
  service: string;
  name: string;
  email: string;
  facebook: string;
  whatsapp: string;
  startDate: string;
  endDate: string;
  payment: number;
  workspace: string;
  createdAt: string;
}

interface Notification {
  id?: number;
  message: string;
  type: 'info' | 'warning' | 'danger';
  createdAt: number;
}

interface Setting {
  id: string; // e.g., 'whatsapp_message'
  value: string;
}

const db = new Dexie('SubmanDB') as Dexie & {
  subscriptions: EntityTable<Subscription, 'id'>;
  users: EntityTable<User, 'id'>;
  notifications: EntityTable<Notification, 'id'>;
  settings: EntityTable<Setting, 'id'>;
};

// Schema declaration:
db.version(7).stores({
  subscriptions: '++id, service, name, email, whatsapp, facebook, endDate',
  users: '++id, &username',
  notifications: '++id, createdAt',
  settings: 'id'
});

export type { Subscription, User, Notification, Setting };
export { db };
