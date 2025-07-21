import type { NavigationItem } from '../client/components/NavBar/NavBar';
import { DocsUrl, BlogUrl } from '../shared/common';
import daBoiAvatar from '../client/static/da-boi.webp';
import avatarPlaceholder from '../client/static/avatar-placeholder.webp';
import { CompositionData } from '../packages/editor';

export const landingCompositionData: CompositionData = {
  "pages": [
    {
      "id": "page-1752612414825",
      "name": "Page 1",
      "duration": 150,
      "backgroundColor": "white",
      "elements": [
        {
          "id": "element-1752613970969",
          "type": "image",
          "left": 0,
          "top": 0,
          "width": 1920,
          "height": 1080,
          "src": "/editor-screenshot.png",
          "opacity": 1,
          "zIndex": 1,
          "rotation": 0,
          "startTime": 0,
          "endTime": 5
        },
        {
          "id": "element-1752613971289",
          "type": "text",
          "left": 0,
          "top": 0,
          "width": 1920,
          "height": 1080,
          "fontSize": 60,
          "color": "red",
          "textAlign": "center",
          "text": "Vibe Editor",
          "zIndex": 2,
          "animation": {
            "props": {
              "scale": [
                1,
                1.2
              ]
            },
            "duration": 1000,
            "ease": "easeInOut",
            "alternate": true,
            "loop": true,
            "autoplay": true
          }
        }
      ]
    }
  ],
  "fps": 30,
  "width": 1920,
  "height": 1080
}

export const landingPageNavigationItems: NavigationItem[] = [
  { name: 'Vibe Editor', to: '/vibe' },
  { name: 'Features', to: '#features' },
  // { name: 'Pricing', to: routes.PricingPageRoute.to },
  { name: 'Documentation', to: DocsUrl },
  { name: 'Blog', to: BlogUrl },
];
export const features = [
  {
    name: 'Vibe Editor',
    description: 'Like vibe coding, you describe what you want and let AI do the rest. No video editing skills required, just chat with our AI assistant.',
    icon: '🎬',
    href: DocsUrl,
  },
  {
    name: 'Multiple-Media Support',
    description: 'Create videos with any combination of images, videos, text, and audio. Import your media assets and let the AI help arrange them perfectly.',
    icon: '�️',
    href: DocsUrl,
  },
  {
    name: 'Real-time Preview',
    description: 'Instantly see your changes as you make them. Preview your video at any stage of the creation process to ensure it matches your vision.',
    icon: '👁️',
    href: DocsUrl,
  },
  {
    name: 'Open Source',
    description: 'The editor, the JSON schema, and the video renderer are all open source. Contribute to the project or build your own applications on top of our technology.',
    icon: '🌟',
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
    answer: 'InkyCut is an Open-Source video editor allowing users to edit videos with just a chat.',
    href: '',
  },
  {
    id: 2,
    question: 'Do I need to know video editing?',
    answer: 'Nope! Just describe what you want, AI does the video editing for you.',
    href: '',
  },
  {
    id: 3,
    question: 'Do I need to pay?',
    answer: 'No, InkyCut Vibe Editor is free forever. We believe in free and open-source software. Premium features will be available but the core functionality will always be free.',
    href: '',
  },
  {
    id: 3,
    question: 'Why do I need an OpenAI API Key?',
    answer: 'We are in an early stage of development and using OpenAI to power the AI features. Your API key is used only for your account and is only stored on our local browser. We will not ask for user to provide an OpenAI key for premium users.',
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
