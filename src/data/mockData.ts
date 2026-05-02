export type GigCategory = 'All' | 'Delivery' | 'Events' | 'Campus' | 'Home Help' | 'Promo';
export type UserRole = 'worker' | 'poster' | 'admin';
export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected';
export type GigStatus = 'Open' | 'Reviewing' | 'Assigned';

export type AppUser = {
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

export const appUsers: AppUser[] = [
  {
    id: 'user-worker-1',
    name: 'Riya Mehta',
    username: 'riya.worker',
    password: 'QuickGig123',
    role: 'worker',
    headline: 'Find reliable short-term work from local teams',
    subline: 'Curated briefs, clear pay, and one request thread for every opportunity.',
  },
  {
    id: 'user-worker-2',
    name: 'Karan Shah',
    username: 'karan.worker',
    password: 'QuickGig456',
    role: 'worker',
    headline: 'Pick up local gigs without long commitments',
    subline: 'Compare payout, distance, and timing before sending a request.',
  },
  {
    id: 'user-worker-3',
    name: 'Maya Desai',
    username: 'maya.worker',
    password: 'QuickGig789',
    role: 'worker',
    headline: 'Flexible assignments that start quickly',
    subline: 'Keep every application, poster message, and update in one place.',
  },
  {
    id: 'user-poster-1',
    name: 'Aarav Sharma',
    username: 'aarav.poster',
    password: 'PosterPass123',
    role: 'poster',
    headline: 'Hire dependable short-term help in minutes',
    subline: 'Publish a brief, shortlist applicants, and confirm fit before assigning work.',
  },
  {
    id: 'user-admin-1',
    name: 'QuickGig Ops',
    username: 'admin.quickgig',
    password: 'AdminPass123',
    role: 'admin',
    headline: 'Monitor marketplace quality and activity',
    subline: 'Track users, live briefs, request volume, and fulfillment status.',
  },
];

export const quickStats = [
  { label: 'Active briefs', value: '120+' },
  { label: 'Average payout', value: 'Rs 1.8k' },
  { label: 'Median reply', value: '< 6 hrs' },
];

export const featuredTips = [
  {
    title: 'Verified local briefs',
    description: 'Every listing shows payout, duration, poster, and applicant interest up front.',
  },
  {
    title: 'Built-in request threads',
    description: 'Shortlists and questions stay attached to the exact gig they belong to.',
  },
  {
    title: 'Clean marketplace operations',
    description: 'Posters and admins can review status without digging through disconnected screens.',
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
    workerName: 'Riya Mehta',
    workerNote:
      'Hi, I have helped two families with packing and shifting. I am free for the full 2 days and can start tomorrow morning.',
    status: 'Pending',
    conversation: [
      {
        id: 'msg-1',
        senderRole: 'worker',
        senderName: 'Riya Mehta',
        text: 'Hi, I have helped two families with packing and shifting. I am free for the full 2 days and can start tomorrow morning.',
        timestamp: 'Today, 9:15 AM',
      },
    ],
  },
  {
    id: 'req-2',
    gigId: 'gig-3',
    gigTitle: 'Apartment Move Packing Assist',
    workerName: 'Karan Shah',
    workerNote:
      'I can bring extra packing tape and labels. Let me know if fragile kitchen items need separate handling.',
    status: 'Pending',
    conversation: [
      {
        id: 'msg-2',
        senderRole: 'worker',
        senderName: 'Karan Shah',
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
    workerName: 'Maya Desai',
    workerNote:
      'I know the area well and already do local courier runs. I can handle evening deliveries for both days.',
    status: 'Accepted',
    conversation: [
      {
        id: 'msg-4',
        senderRole: 'worker',
        senderName: 'Maya Desai',
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
