import type {
  ApplicationRequest,
  AppUser,
  ChatMessage,
  Gig,
  GigCategory,
  RequestStatus,
  SeedAccount,
  UserRole,
} from '../data/mockData';

export type GigDraft = {
  title: string;
  location: string;
  pay: string;
  duration: string;
  category: Exclude<GigCategory, 'All'>;
  description: string;
};

export type GigReadinessItem = {
  label: string;
  complete: boolean;
};

export type MarketplaceIssue = {
  id: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  detail: string;
};

export type MarketplaceAudit = {
  healthScore: number;
  issues: MarketplaceIssue[];
};

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export const parsePay = (value: string) => {
  const normalized = value.replace(/,/g, '').trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const pay = Number(normalized);

  if (!Number.isFinite(pay) || pay <= 0) {
    return null;
  }

  return Math.round(pay);
};

export const toPublicUser = (account: SeedAccount): AppUser => {
  const { password: _password, ...user } = account;

  return user;
};

export const authenticateUser = ({
  accounts,
  role,
  username,
  password,
}: {
  accounts: SeedAccount[];
  role: UserRole;
  username: string;
  password: string;
}): ServiceResult<AppUser> => {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedUsername || !normalizedPassword) {
    return { ok: false, message: 'Enter your username and password.' };
  }

  const account = accounts.find(
    (user) =>
      user.role === role &&
      user.username.toLowerCase() === normalizedUsername &&
      user.password === normalizedPassword,
  );

  if (!account) {
    return { ok: false, message: 'Login failed. Check the role, username, and password.' };
  }

  return {
    ok: true,
    data: toPublicUser(account),
    message: `Welcome back, ${account.name}.`,
  };
};

export const buildGigReadiness = (draft: GigDraft): GigReadinessItem[] => [
  { label: 'Clear title', complete: Boolean(draft.title.trim()) },
  { label: 'Exact location', complete: Boolean(draft.location.trim()) },
  { label: 'Payout added', complete: parsePay(draft.pay) !== null },
  { label: 'Timing set', complete: Boolean(draft.duration.trim()) },
  { label: 'Detailed scope', complete: draft.description.trim().length >= 40 },
];

export const createGigFromDraft = ({
  draft,
  posterName,
  now,
}: {
  draft: GigDraft;
  posterName: string;
  now: number;
}): ServiceResult<Gig> => {
  const pay = parsePay(draft.pay);

  if (
    !draft.title.trim() ||
    !draft.location.trim() ||
    !draft.pay.trim() ||
    !draft.duration.trim() ||
    !draft.description.trim()
  ) {
    return {
      ok: false,
      message: 'Fill in the title, location, pay, duration, and description before posting.',
    };
  }

  if (pay === null) {
    return { ok: false, message: 'Enter a valid rupee amount for the payout.' };
  }

  return {
    ok: true,
    data: {
      id: `gig-${now}`,
      title: draft.title.trim(),
      category: draft.category,
      location: draft.location.trim(),
      pay,
      duration: draft.duration.trim(),
      applicants: 0,
      postedBy: posterName,
      rating: 5,
      description: draft.description.trim(),
      requirements: [
        'Available for the full short assignment',
        'Can send updates during the job',
        'Ready to start within 24 hours if selected',
      ],
      status: 'Open',
    },
    message: 'Brief published. Applicant requests are open.',
  };
};

export const reconcileGigsWithRequests = (gigs: Gig[], requests: ApplicationRequest[]) =>
  gigs.map((gig) => {
    const relatedRequests = requests.filter((request) => request.gigId === gig.id);

    if (relatedRequests.some((request) => request.status === 'Accepted')) {
      return { ...gig, status: 'Assigned' as const };
    }

    if (gig.status === 'Open' && relatedRequests.some((request) => request.status === 'Pending')) {
      return { ...gig, status: 'Reviewing' as const };
    }

    return gig;
  });

export const calculateGigFitScore = (gig: Gig) =>
  Math.min(98, Math.round(gig.rating * 15 + Math.min(gig.applicants, 18) + (gig.status === 'Open' ? 8 : 3)));

export const buildSuggestedRequestNote = (gig: Gig, workerName: string) =>
  `Hi ${gig.postedBy}, I am ${workerName}. I can support ${gig.title.toLowerCase()} in ${gig.location}, stay available for ${gig.duration}, and send clear updates during the assignment.`;

export const submitRequestForGig = ({
  gig,
  requests,
  workerName,
  note,
  now,
}: {
  gig: Gig;
  requests: ApplicationRequest[];
  workerName: string;
  note: string;
  now: number;
}): ServiceResult<{ request: ApplicationRequest; updatedGig?: Gig; duplicate: boolean }> => {
  const existingRequest = requests.find(
    (request) => request.gigId === gig.id && request.workerName === workerName,
  );

  if (existingRequest) {
    return {
      ok: true,
      data: { request: existingRequest, duplicate: true },
      message: 'You already have a request thread for this brief.',
    };
  }

  if (gig.status === 'Assigned') {
    return { ok: false, message: 'This brief has already been assigned.' };
  }

  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return { ok: false, message: 'Write a short introduction before sending your request.' };
  }

  const request: ApplicationRequest = {
    id: `req-${now}`,
    gigId: gig.id,
    gigTitle: gig.title,
    workerName,
    workerNote: trimmedNote,
    status: 'Pending',
    conversation: [
      {
        id: `msg-${now}`,
        senderRole: 'worker',
        senderName: workerName,
        text: trimmedNote,
        timestamp: 'Just now',
      },
    ],
  };

  return {
    ok: true,
    data: {
      request,
      duplicate: false,
      updatedGig: {
        ...gig,
        applicants: gig.applicants + 1,
        status: gig.status === 'Open' ? 'Reviewing' : gig.status,
      },
    },
    message: 'Request sent. The thread is now active.',
  };
};

export const appendChatMessage = ({
  requests,
  requestId,
  senderRole,
  senderName,
  text,
  now,
}: {
  requests: ApplicationRequest[];
  requestId: string;
  senderRole: ChatMessage['senderRole'];
  senderName: string;
  text: string;
  now: number;
}): ServiceResult<ApplicationRequest[]> => {
  const draft = text.trim();

  if (!draft) {
    return { ok: false, message: 'Write a message before sending.' };
  }

  if (!requests.some((request) => request.id === requestId)) {
    return { ok: false, message: 'Request not found.' };
  }

  return {
    ok: true,
    data: requests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            conversation: [
              ...request.conversation,
              {
                id: `msg-${now}-${request.id}`,
                senderRole,
                senderName,
                text: draft,
                timestamp: 'Just now',
              },
            ],
          }
        : request,
    ),
    message: 'Message sent.',
  };
};

const resolveStatusAfterDecision = (gig: Gig, requests: ApplicationRequest[]): Gig['status'] => {
  const relatedRequests = requests.filter((request) => request.gigId === gig.id);

  if (relatedRequests.some((request) => request.status === 'Accepted')) {
    return 'Assigned';
  }

  if (relatedRequests.some((request) => request.status === 'Pending')) {
    return 'Reviewing';
  }

  return gig.status === 'Assigned' ? 'Assigned' : 'Open';
};

export const decideRequest = ({
  gigs,
  requests,
  requestId,
  decision,
  posterName,
  now,
}: {
  gigs: Gig[];
  requests: ApplicationRequest[];
  requestId: string;
  decision: Extract<RequestStatus, 'Accepted' | 'Rejected'>;
  posterName: string;
  now: number;
}): ServiceResult<{ gigs: Gig[]; requests: ApplicationRequest[] }> => {
  const targetRequest = requests.find((request) => request.id === requestId);

  if (!targetRequest) {
    return { ok: false, message: 'Request not found.' };
  }

  if (targetRequest.status !== 'Pending') {
    return { ok: false, message: `This request is already ${targetRequest.status.toLowerCase()}.` };
  }

  const targetGig = gigs.find((gig) => gig.id === targetRequest.gigId);

  if (!targetGig) {
    return { ok: false, message: 'The related brief could not be found.' };
  }

  if (targetGig.postedBy !== posterName) {
    return { ok: false, message: 'Only the poster who owns this brief can make that decision.' };
  }

  if (
    decision === 'Accepted' &&
    requests.some(
      (request) =>
        request.gigId === targetRequest.gigId &&
        request.id !== requestId &&
        request.status === 'Accepted',
    )
  ) {
    return { ok: false, message: 'This brief already has an accepted worker.' };
  }

  const nextRequests = requests.map((request) => {
    if (request.id === requestId) {
      return {
        ...request,
        status: decision,
        conversation: [
          ...request.conversation,
          {
            id: `msg-${now}-${request.id}-decision`,
            senderRole: 'poster' as const,
            senderName: posterName,
            text:
              decision === 'Accepted'
                ? 'You have been accepted for this gig. Please check the schedule and be ready to start.'
                : 'Thank you for applying. We are moving ahead with another worker for this task.',
            timestamp: 'Just now',
          },
        ],
      };
    }

    if (
      decision === 'Accepted' &&
      request.gigId === targetRequest.gigId &&
      request.status === 'Pending'
    ) {
      return {
        ...request,
        status: 'Rejected' as const,
        conversation: [
          ...request.conversation,
          {
            id: `msg-${now}-${request.id}-auto-close`,
            senderRole: 'poster' as const,
            senderName: posterName,
            text: 'This brief has now been assigned. Thanks for applying and staying available.',
            timestamp: 'Just now',
          },
        ],
      };
    }

    return request;
  });

  const nextGigs = gigs.map((gig) =>
    gig.id === targetRequest.gigId
      ? {
          ...gig,
          status: resolveStatusAfterDecision(gig, nextRequests),
        }
      : gig,
  );

  return {
    ok: true,
    data: { gigs: nextGigs, requests: nextRequests },
    message:
      decision === 'Accepted'
        ? 'Worker accepted. Other pending requests for this brief were closed.'
        : 'Worker rejected and informed in the chat.',
  };
};

export const auditMarketplace = (gigs: Gig[], requests: ApplicationRequest[]): MarketplaceAudit => {
  const issues: MarketplaceIssue[] = [];

  gigs.forEach((gig) => {
    const relatedRequests = requests.filter((request) => request.gigId === gig.id);
    const acceptedRequests = relatedRequests.filter((request) => request.status === 'Accepted');
    const pendingRequests = relatedRequests.filter((request) => request.status === 'Pending');

    if (acceptedRequests.length > 0 && gig.status !== 'Assigned') {
      issues.push({
        id: `accepted-status-${gig.id}`,
        severity: 'High',
        title: 'Accepted worker without assigned status',
        detail: `${gig.title} has an accepted request but is not marked assigned.`,
      });
    }

    if (gig.status === 'Assigned' && acceptedRequests.length === 0) {
      issues.push({
        id: `assignment-record-${gig.id}`,
        severity: 'Medium',
        title: 'Assignment record needs review',
        detail: `${gig.title} is assigned but has no accepted request thread.`,
      });
    }

    if (gig.status === 'Assigned' && pendingRequests.length > 0) {
      issues.push({
        id: `pending-assigned-${gig.id}`,
        severity: 'High',
        title: 'Pending requests on assigned brief',
        detail: `${gig.title} still has pending worker requests.`,
      });
    }

    if (gig.description.trim().length < 40) {
      issues.push({
        id: `short-description-${gig.id}`,
        severity: 'Low',
        title: 'Brief could use more detail',
        detail: `${gig.title} has a short scope description.`,
      });
    }
  });

  const seenRequestKeys = new Set<string>();

  requests.forEach((request) => {
    const key = `${request.gigId}:${request.workerName}`;

    if (seenRequestKeys.has(key)) {
      issues.push({
        id: `duplicate-${request.id}`,
        severity: 'High',
        title: 'Duplicate worker request',
        detail: `${request.workerName} has more than one request for ${request.gigTitle}.`,
      });
    }

    seenRequestKeys.add(key);
  });

  const penalty = issues.reduce((total, issue) => {
    if (issue.severity === 'High') {
      return total + 18;
    }
    if (issue.severity === 'Medium') {
      return total + 10;
    }
    return total + 4;
  }, 0);

  return {
    healthScore: Math.max(70, 100 - penalty),
    issues,
  };
};
