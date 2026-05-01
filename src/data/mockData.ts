export type GigCategory = 'All' | 'Delivery' | 'Events' | 'Campus' | 'Home Help' | 'Promo';
export type UserRole = 'worker' | 'poster' | 'admin';
export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected';
export type GigStatus = 'Open' | 'Reviewing' | 'Assigned';

export type DemoUser = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  headline: string;
  subline: string;
};

export type ChatMessage = {
  id: string;
  senderRole: 'worker' | 'poster';
  senderName: string;
  text: string;
  timestamp: string;
};

export type Gig = {
  id: string;
  title: string;
  category: Exclude<GigCategory, 'All'>;
  location: string;
  pay: number;
  duration: string;
  applicants: number;
  postedBy: string;
  rating: number;
  description: string;
  requirements: string[];
  status: GigStatus;
};

export type ApplicationRequest = {
  id: string;
  gigId: string;
  gigTitle: string;
  workerName: string;
  workerNote: string;
  status: RequestStatus;
  conversation: ChatMessage[];
};

export const categories: GigCategory[] = ['All', 'Delivery', 'Events', 'Campus', 'Home Help', 'Promo'];

export const postableCategories: Array<Exclude<GigCategory, 'All'>> = [
  'Delivery',
  'Events',
  'Campus',
  'Home Help',
  'Promo',
];

export const demoUsers: DemoUser[] = [
  {
    id: 'user-worker-1',
    name: 'Riya Worker',
    username: 'riya.worker',
    password: 'QuickGig123',
    role: 'worker',
    headline: 'Short gigs that fit your week',
    subline: 'Browse quick work, chat with posters, and confirm the job before heading out.',
  },
  {
    id: 'user-worker-2',
    name: 'Karan S.',
    username: 'karan.worker',
    password: 'QuickGig456',
    role: 'worker',
    headline: 'Fast local work without long commitments',
    subline: 'Apply to short gigs, message the poster, and track every request in one inbox.',
  },
  {
    id: 'user-worker-3',
    name: 'Maya D.',
    username: 'maya.worker',
    password: 'QuickGig789',
    role: 'worker',
    headline: 'Flexible work that starts quickly',
    subline: 'Stay active with mini jobs that match your area and schedule.',
  },
  {
    id: 'user-poster-1',
    name: 'Aarav Sharma',
    username: 'aarav.poster',
    password: 'PosterPass123',
    role: 'poster',
    headline: 'Hire reliable help for 2 to 3 day jobs',
    subline: 'Post gigs, review applicants, and message them before you assign the work.',
  },
  {
    id: 'user-admin-1',
    name: 'Quick Gig Admin',
    username: 'admin.quickgig',
    password: 'AdminPass123',
    role: 'admin',
    headline: 'Keep the marketplace organized and trustworthy',
    subline: 'Watch users, gigs, and request activity from one clean control panel.',
  },
];

export const quickStats = [
  { label: 'Open gigs', value: '120+' },
  { label: 'Average pay', value: 'Rs 1.8k' },
  { label: 'Reply time', value: '< 6 hrs' },
];

export const featuredTips = [
  {
    title: 'Simple login',
    description: 'Each role uses a direct username and password flow without extra clutter.',
  },
  {
    title: 'Request chat',
    description: 'Workers and posters can communicate inside each request before accepting the job.',
  },
  {
    title: 'Cleaner layout',
    description: 'The interface now uses calmer spacing, more focused cards, and clearer visual hierarchy.',
  },
];

export const initialGigs: Gig[] = [
  {
    id: 'gig-1',
    title: 'Market Delivery Runner',
    category: 'Delivery',
    location: 'Indiranagar, Bengaluru',
    pay: 2200,
    duration: '2 days',
    applicants: 14,
    postedBy: 'Fresh Basket Co.',
    rating: 4.8,
    description:
      'Deliver grocery orders to nearby apartments during evening slots. Ideal for someone who knows the area well and can handle multiple quick drop-offs.',
    requirements: [
      'Two-wheeler preferred',
      'Basic smartphone skills for route updates',
      'Available from 4 PM to 9 PM',
    ],
    status: 'Open',
  },
  {
    id: 'gig-2',
    title: 'College Fest Booth Helper',
    category: 'Events',
    location: 'Vellore Institute Campus',
    pay: 1800,
    duration: '3 days',
    applicants: 9,
    postedBy: 'Pulse Events',
    rating: 4.7,
    description:
      'Help set up booths, guide visitors, and keep supplies organized during the annual campus fest. Friendly communication matters more than prior event experience.',
    requirements: [
      'Comfortable speaking with students and guests',
      'Can lift light boxes and banners',
      'Available for morning briefing each day',
    ],
    status: 'Reviewing',
  },
  {
    id: 'gig-3',
    title: 'Apartment Move Packing Assist',
    category: 'Home Help',
    location: 'Madhapur, Hyderabad',
    pay: 2500,
    duration: '2 days',
    applicants: 6,
    postedBy: 'Aarav Sharma',
    rating: 4.9,
    description:
      'Need help sorting household items, packing fragile goods carefully, and labeling boxes room by room for a weekend move.',
    requirements: [
      'Careful with delicate items',
      'Can work from 10 AM to 6 PM',
      'Prior packing or shifting help is a plus',
    ],
    status: 'Open',
  },
  {
    id: 'gig-4',
    title: 'Campus Promo Crew',
    category: 'Promo',
    location: 'Anna University, Chennai',
    pay: 1600,
    duration: '2 days',
    applicants: 11,
    postedBy: 'Spark Mobile',
    rating: 4.6,
    description:
      'Promote a student discount campaign, share QR cards, and explain the offer to peers at high-footfall spots across campus.',
    requirements: [
      'Confident communication',
      'Neat and presentable appearance',
      'Comfortable standing outdoors for short periods',
    ],
    status: 'Assigned',
  },
];

export const initialRequests: ApplicationRequest[] = [
  {
    id: 'req-1',
    gigId: 'gig-3',
    gigTitle: 'Apartment Move Packing Assist',
    workerName: 'Riya Worker',
    workerNote:
      'Hi, I have helped two families with packing and shifting. I am free for the full 2 days and can start tomorrow morning.',
    status: 'Pending',
    conversation: [
      {
        id: 'msg-1',
        senderRole: 'worker',
        senderName: 'Riya Worker',
        text: 'Hi, I have helped two families with packing and shifting. I am free for the full 2 days and can start tomorrow morning.',
        timestamp: 'Today, 9:15 AM',
      },
    ],
  },
  {
    id: 'req-2',
    gigId: 'gig-3',
    gigTitle: 'Apartment Move Packing Assist',
    workerName: 'Karan S.',
    workerNote:
      'I can bring extra packing tape and labels. Let me know if fragile kitchen items need separate handling.',
    status: 'Pending',
    conversation: [
      {
        id: 'msg-2',
        senderRole: 'worker',
        senderName: 'Karan S.',
        text: 'I can bring extra packing tape and labels. Let me know if fragile kitchen items need separate handling.',
        timestamp: 'Today, 8:40 AM',
      },
      {
        id: 'msg-3',
        senderRole: 'poster',
        senderName: 'Aarav Sharma',
        text: 'Thanks Karan. What time can you reach on Saturday?',
        timestamp: 'Today, 9:05 AM',
      },
    ],
  },
  {
    id: 'req-3',
    gigId: 'gig-1',
    gigTitle: 'Market Delivery Runner',
    workerName: 'Maya D.',
    workerNote:
      'I know the area well and already do local courier runs. I can handle evening deliveries for both days.',
    status: 'Accepted',
    conversation: [
      {
        id: 'msg-4',
        senderRole: 'worker',
        senderName: 'Maya D.',
        text: 'I know the area well and already do local courier runs. I can handle evening deliveries for both days.',
        timestamp: 'Yesterday, 6:10 PM',
      },
      {
        id: 'msg-5',
        senderRole: 'poster',
        senderName: 'Fresh Basket Co.',
        text: 'Accepted for tomorrow evening slot. Please carry your ID proof.',
        timestamp: 'Yesterday, 6:25 PM',
      },
    ],
  },
];
