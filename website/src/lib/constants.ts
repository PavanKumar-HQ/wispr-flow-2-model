/**
 * VoxQuest Brand Design Tokens
 * Exact hex values specified in Master Engineering Prompt
 */
export const PALETTE = {
  paleCream: '#DFDFD4',
  darkTeal: '#07514C',
  warmAmber: '#DDA44D',
  terracotta: '#DA6C4C',
  mutedSage: '#B8CBC3',
  deepTeal: '#0F5B57',
  charcoal: '#212121',
} as const;

export interface Quest {
  id: string;
  title: string;
  category: 'onboarding' | 'fluency' | 'developer' | 'creator';
  description: string;
  badge: string;
  targetCount: number;
  xpReward: number;
}

export const VOXQUEST_QUESTS: Quest[] = [
  {
    id: 'first-words',
    title: 'Voice Initiate',
    category: 'onboarding',
    description: 'Dictate your first paragraph naturally without lifting hands from keyboard.',
    badge: 'mic',
    targetCount: 1,
    xpReward: 100,
  },
  {
    id: 'clean-slate',
    title: 'Clarity Adept',
    category: 'fluency',
    description: 'Strip 50 filler hesitation words ("um", "uh") with zero meaning loss.',
    badge: 'sparkles',
    targetCount: 50,
    xpReward: 150,
  },
  {
    id: 'custom-vocab',
    title: 'Lexicon Master',
    category: 'developer',
    description: 'Add a custom technical acronym (e.g. "PostgreSQL", "Kubernetes") to your local dictionary.',
    badge: 'scroll',
    targetCount: 1,
    xpReward: 200,
  },
  {
    id: 'deep-flow',
    title: 'Sprint Scribe',
    category: 'creator',
    description: 'Write an entire lecture summary or tech spec in under 5 minutes.',
    badge: 'flame',
    targetCount: 1,
    xpReward: 250,
  },
  {
    id: 'offline-scholar',
    title: 'Sovereign Scribe',
    category: 'developer',
    description: 'Run voice dictation in air-gapped offline mode with zero network packets.',
    badge: 'shield',
    targetCount: 1,
    xpReward: 300,
  },
  {
    id: 'source-cartographer',
    title: 'Guild Contributor',
    category: 'developer',
    description: 'Star the open-source repository or suggest a new dictionary terminology.',
    badge: 'compass',
    targetCount: 1,
    xpReward: 150,
  }
];

export const FAQS = [
  {
    question: 'What is VoxQuest?',
    answer: 'VoxQuest is a provisional open-source project combining the fluid, push-to-talk voice dictation experience of tools like Wispr Flow with original Minecraft-inspired pixel-art aesthetics and Google Cloud Arcade-style exploration milestones.'
  },
  {
    question: 'Is VoxQuest available for download today?',
    answer: 'VoxQuest is currently in active architecture and open-source design development. This website demonstrates the vision, workflow, and design system. Follow the repository for alpha test build announcements.'
  },
  {
    question: 'How is student writing supported?',
    answer: 'Students can turn rapid brainstorming and spoken thought dumps into structured essays, lecture outlines, and study notes without getting bogged down by typing speed or spelling hesitations.'
  },
  {
    question: 'How do developers use VoxQuest?',
    answer: 'Developers can dictate commit messages, PR descriptions, architectural decision records, and technical documentation with automated capitalization and preservation of programming terms (camelCase, Docker, PostgreSQL).'
  },
  {
    question: 'What is the privacy model?',
    answer: 'VoxQuest is architected with a strict zero-retention pledge. Future local releases will leverage on-device Whisper models without sending audio over the public cloud.'
  }
];

