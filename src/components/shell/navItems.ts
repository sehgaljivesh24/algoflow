import { ALL_ENTRIES } from '../../data/catalog';
import { ALL_PATTERNS } from '../../data/patterns';

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  /** Route for features that exist; items without it are roadmap placeholders (rendered disabled). */
  to?: string;
  /** Count chip on the right. */
  count?: number;
  /** Own accent colour (see the .tone-* rules in styles-library.css). */
  tone?: 'purple' | 'amber' | 'sky' | 'emerald' | 'teal';
  /** Purple NEW pill. */
  isNew?: boolean;
}

export const EXPLORE: NavItem[] = [
  { id: 'problems', icon: '📦', label: 'Animated Problems', to: '/', count: ALL_ENTRIES.length },
  { id: 'revision', icon: '🎬', label: 'DSA Revision', isNew: true },
  { id: 'patterns', icon: '🧩', label: 'Common Patterns', to: '/patterns', count: ALL_PATTERNS.length },
  { id: 'interview', icon: '💬', label: 'Interview Questions', tone: 'purple' },
  { id: 'system-design', icon: '🏗', label: 'System Design', tone: 'amber' },
  { id: 'sql', icon: '🗄', label: 'SQL Visualizer', tone: 'sky', isNew: true },
  { id: 'tricks', icon: '⚙️', label: 'Code Tricks', to: '/cheatsheet' },
  { id: 'cheatsheets', icon: '📑', label: 'Cheatsheets', to: '/cheatsheets', isNew: true },
  { id: 'edge', icon: '⚠️', label: 'Edge Cases', to: '/edge-cases' },
  { id: 'jobs', icon: '💼', label: 'Jobs', tone: 'emerald' },
  { id: 'quiz', icon: '🎯', label: 'Pattern Quiz', to: '/quiz', tone: 'teal' },
  { id: 'java', icon: '🤖', label: 'AI Java Backend Course', tone: 'amber' },
  { id: 'java-interview', icon: '☕', label: 'Java Developer Interview Questions', isNew: true },
];

export const SUPPORT: NavItem[] = [
  { id: 'about', icon: 'ℹ️', label: 'About' },
  { id: 'contact', icon: '📮', label: 'Contact Us' },
  { id: 'privacy', icon: '🔒', label: 'Privacy Policy' },
  { id: 'terms', icon: '📄', label: 'Terms of Use' },
  { id: 'feedback', icon: '💬', label: 'Feedback' },
];
