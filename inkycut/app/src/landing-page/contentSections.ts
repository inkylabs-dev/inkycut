import type { NavigationItem } from '../client/components/NavBar/NavBar';
import { routes } from 'wasp/client/router';
import { DocsUrl, BlogUrl } from '../shared/common';
import daBoiAvatar from '../client/static/da-boi.webp';
import avatarPlaceholder from '../client/static/avatar-placeholder.webp';

export const landingPageNavigationItems: NavigationItem[] = [
  { name: 'Features', to: '#features' },
  { name: 'Pricing', to: routes.PricingPageRoute.to },
  { name: 'Documentation', to: DocsUrl },
  { name: 'Blog', to: BlogUrl },
];
export const features = [
  {
    name: 'Prompt-to-Video with Prebuilt Libraries',
    description: 'Instantly generate full videos using one prompt. Our curated libraries include scenes, characters, audio, and animations—ready to remix with your story.',
    icon: '🎬',
    href: DocsUrl,
  },
  {
    name: 'Viral Video Templates',
    description: 'Use proven video formats (reaction, parody, explainers, challenges) designed to hook viewers on TikTok, YouTube Shorts, and Instagram Reels.',
    icon: '🔥',
    href: DocsUrl,
  },
  {
    name: 'Custom Libraries for Your Brand or Style',
    description: 'Upload your own assets to build personal or team libraries. Reuse consistent characters, settings, and animations across videos with ease.',
    icon: '🎨',
    href: DocsUrl,
  },
  {
    name: 'Smart Script-to-Scene Mapping',
    description: 'Each script line intelligently maps to dynamic visuals, transitions, and sound effects—no editing skills required.',
    icon: '🧠',
    href: DocsUrl,
  },
];
export const testimonials = [
  {
    name: '@soasme',
    role: 'VTuber',
    avatarSrc: daBoiAvatar,
    socialUrl: 'https://twitter.com/soasme',
    quote: "I love how easy it is to create engaging content with this tool!",
  },
  {
    name: '@coofykids',
    role: 'VTuber',
    avatarSrc: '/logos/coofykids_logo.jpg',
    socialUrl: 'https://youtube.com/@coofykids',
    quote: "This product makes me cooler than I already am.  I don't use Canva or CapCut anymore.",
  },
  {
    name: '@enqueuezero',
    role: "Content Creator",
    avatarSrc: avatarPlaceholder,
    socialUrl: '#',
    quote: "It's like having a personal video editor that understands my style.",
  },
];

export const faqs = [
  {
    id: 1,
    question: 'What is InkyCut?',
    answer: 'InkyCut is an AI-powered video creation platform where you can remix iconic scenes and visuals with your own story prompts. It lets creators generate full videos—scripts, voices, scenes, and all—using smart libraries and remix tools.',
    href: '',
  },
  {
    id: 2,
    question: 'Do I need to know video editing?',
    answer: 'Nope! InkyCut is designed for storytellers, not editors. With just a prompt, you can generate an entire video using our curated libraries and remix tools—no timeline or software skills required.',
    href: '',
  },
  {
    id: 3,
    question: 'Can I create my own video library?',
    answer: 'Yes! You can upload your own characters, backgrounds, sound effects, or animations to build a custom video library—great for brands, educators, or creators with a signature style.',
    href: '',
  },
  {
    id: 4,
    question: 'Are the videos copyright-safe?',
    answer: 'Yes, videos made with InkyCut are AI-generated and transformative. You\'re not copying original assets but remixing styles and concepts. However, it\'s still your responsibility to follow platform policies (like TikTok or YouTube) when publishing content.',
    href: '',
  },
];
export const footerNavigation = {
  app: [
    { name: 'Documentation', href:  DocsUrl},
    { name: 'Blog', href: BlogUrl },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms of Service', href: '/tos' },
  ],
};
