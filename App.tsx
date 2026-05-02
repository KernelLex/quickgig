import { StatusBar } from 'expo-status-bar';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  appUsers,
  categories,
  featuredTips,
  initialGigs,
  initialRequests,
  postableCategories,
  quickStats,
  type ApplicationRequest,
  type AppUser,
  type Gig,
  type GigCategory,
  type UserRole,
} from './src/data/mockData';
import {
  appendChatMessage,
  auditMarketplace,
  authenticateUser,
  buildGigReadiness,
  buildSuggestedRequestNote,
  calculateGigFitScore,
  createGigFromDraft,
  decideRequest,
  reconcileGigsWithRequests,
  submitRequestForGig,
  type GigDraft,
} from './src/backend/marketplace';
import { colors, fonts, radii, shadow, spacing } from './src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type WorkerTab = 'discover' | 'saved' | 'requests' | 'account';
type PosterTab = 'overview' | 'post' | 'requests' | 'account';
type AdminTab = 'overview' | 'gigs' | 'requests' | 'account';

const initialGigForm: GigDraft = {
  title: '',
  location: '',
  pay: '',
  duration: '2 days',
  category: 'Delivery' as Exclude<GigCategory, 'All'>,
  description: '',
};

const initialLoginForm = {
  username: '',
  password: '',
};

const roleOptions: Array<{
  key: UserRole;
  label: string;
  title: string;
  note: string;
  icon: IconName;
}> = [
  {
    key: 'worker',
    label: 'Worker',
    title: 'Find work',
    note: 'Browse paid local briefs',
    icon: 'search-outline',
  },
  {
    key: 'poster',
    label: 'Poster',
    title: 'Hire talent',
    note: 'Post and shortlist fast',
    icon: 'briefcase-outline',
  },
  {
    key: 'admin',
    label: 'Admin',
    title: 'Operate',
    note: 'Monitor marketplace health',
    icon: 'shield-checkmark-outline',
  },
];

const trustSignals: Array<{ label: string; icon: IconName }> = [
  { label: 'Clear payouts', icon: 'card-outline' },
  { label: 'Request threads', icon: 'chatbubbles-outline' },
  { label: 'Local verification', icon: 'checkmark-circle-outline' },
];

const categoryIcons: Record<GigCategory, IconName> = {
  All: 'grid-outline',
  Delivery: 'bicycle-outline',
  Events: 'calendar-clear-outline',
  Campus: 'school-outline',
  'Home Help': 'home-outline',
  Promo: 'megaphone-outline',
};

const quickStatIcons: IconName[] = ['briefcase-outline', 'wallet-outline', 'time-outline'];

const formatPay = (pay: number) => `Rs ${pay.toLocaleString('en-IN')}`;

const IconGlyph = ({
  name,
  size = 18,
  color = colors.textSecondary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;

export default function App() {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;
  const compactContentWidth = { width: Math.max(width - spacing.lg * 2, 0) };
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('discover');
  const [posterTab, setPosterTab] = useState<PosterTab>('overview');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<GigCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [gigs, setGigs] = useState<Gig[]>(() => reconcileGigsWithRequests(initialGigs, initialRequests));
  const [requests, setRequests] = useState<ApplicationRequest[]>(initialRequests);
  const [gigForm, setGigForm] = useState(initialGigForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [requestMessageDraft, setRequestMessageDraft] = useState('');
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [savedGigIds, setSavedGigIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const webDocument = globalThis.document;

    if (!webDocument) {
      return;
    }

    const previousHtmlBackground = webDocument.documentElement.style.backgroundColor;
    const previousBodyBackground = webDocument.body.style.backgroundColor;
    const previousBodyMargin = webDocument.body.style.margin;

    webDocument.documentElement.style.backgroundColor = colors.background;
    webDocument.body.style.backgroundColor = colors.background;
    webDocument.body.style.margin = '0';

    return () => {
      webDocument.documentElement.style.backgroundColor = previousHtmlBackground;
      webDocument.body.style.backgroundColor = previousBodyBackground;
      webDocument.body.style.margin = previousBodyMargin;
    };
  }, []);

  const filteredGigs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return gigs.filter((gig) => {
      const matchesCategory = selectedCategory === 'All' || gig.category === selectedCategory;
      const matchesQuery =
        !query ||
        gig.title.toLowerCase().includes(query) ||
        gig.location.toLowerCase().includes(query) ||
        gig.description.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [gigs, search, selectedCategory]);

  const roleAccounts = useMemo(
    () => appUsers.filter((user) => user.role === selectedRole),
    [selectedRole],
  );

  const savedGigs = useMemo(
    () => gigs.filter((gig) => savedGigIds.includes(gig.id)),
    [gigs, savedGigIds],
  );

  const posterOwnedGigs = useMemo(() => {
    if (!authUser) {
      return [];
    }

    return gigs.filter((gig) => gig.postedBy === authUser.name);
  }, [authUser, gigs]);

  const posterRequests = useMemo(
    () => requests.filter((request) => posterOwnedGigs.some((gig) => gig.id === request.gigId)),
    [posterOwnedGigs, requests],
  );

  const workerRequests = useMemo(() => {
    if (!authUser) {
      return [];
    }

    return requests.filter((request) => request.workerName === authUser.name);
  }, [authUser, requests]);

  const requestedGigIds = useMemo(
    () => new Set(workerRequests.map((request) => request.gigId)),
    [workerRequests],
  );

  const activeRequests = authUser?.role === 'worker' ? workerRequests : posterRequests;

  const activeRequest = useMemo(
    () => activeRequests.find((request) => request.id === activeRequestId) ?? null,
    [activeRequestId, activeRequests],
  );

  const adminStats = useMemo(
    () => ({
      totalUsers: appUsers.length,
      liveGigs: gigs.filter((gig) => gig.status !== 'Assigned').length,
      pendingRequests: requests.filter((request) => request.status === 'Pending').length,
      assignedGigs: gigs.filter((gig) => gig.status === 'Assigned').length,
    }),
    [gigs, requests],
  );

  const marketplaceAudit = useMemo(() => auditMarketplace(gigs, requests), [gigs, requests]);

  const gigReadinessItems = useMemo(
    () => buildGigReadiness(gigForm),
    [gigForm],
  );
  const gigReadinessCount = gigReadinessItems.filter((item) => item.complete).length;
  const gigReadinessPercent = Math.round((gigReadinessCount / gigReadinessItems.length) * 100);

  const handleLogin = () => {
    const loginResult = authenticateUser({
      accounts: appUsers,
      role: selectedRole,
      username: loginForm.username,
      password: loginForm.password,
    });

    if (!loginResult.ok) {
      setMessage(loginResult.message);
      return;
    }

    const user = loginResult.data;

    setAuthUser(user);
    setLoginForm(initialLoginForm);
    setSelectedGig(null);
    setActiveRequestId(null);
    setRequestMessageDraft('');
    setSavedGigIds([]);
    setSearch('');
    setSelectedCategory('All');
    setMessage(loginResult.message);

    if (user.role === 'worker') {
      setWorkerTab('discover');
    }
    if (user.role === 'poster') {
      setPosterTab('overview');
    }
    if (user.role === 'admin') {
      setAdminTab('overview');
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setSelectedGig(null);
    setActiveRequestId(null);
    setRequestMessageDraft('');
    setChatDrafts({});
    setSavedGigIds([]);
    setMessage('Logged out successfully.');
  };

  const toggleSavedGig = (gigId: string) => {
    setSavedGigIds((current) =>
      current.includes(gigId) ? current.filter((savedGigId) => savedGigId !== gigId) : [gigId, ...current],
    );
  };

  const handleCreateGig = () => {
    if (!authUser) {
      return;
    }

    const createResult = createGigFromDraft({
      draft: gigForm,
      posterName: authUser.name,
      now: Date.now(),
    });

    if (!createResult.ok) {
      setMessage(createResult.message);
      return;
    }

    setGigs((current) => [createResult.data, ...current]);
    setGigForm(initialGigForm);
    setPosterTab('overview');
    setMessage(createResult.message);
  };

  const handleSendRequest = () => {
    if (!selectedGig || !authUser) {
      return;
    }

    const requestResult = submitRequestForGig({
      gig: selectedGig,
      requests,
      workerName: authUser.name,
      note: requestMessageDraft,
      now: Date.now(),
    });

    if (!requestResult.ok) {
      setMessage(requestResult.message);
      return;
    }

    if (requestResult.data.duplicate) {
      setSelectedGig(null);
      setRequestMessageDraft('');
      setActiveRequestId(requestResult.data.request.id);
      setWorkerTab('requests');
      setMessage(requestResult.message);
      return;
    }

    const { request, updatedGig } = requestResult.data;

    setRequests((current) => [request, ...current]);
    setGigs((current) => current.map((gig) => (updatedGig && gig.id === updatedGig.id ? updatedGig : gig)));
    setSelectedGig(null);
    setRequestMessageDraft('');
    setActiveRequestId(request.id);
    setWorkerTab('requests');
    setMessage(requestResult.message);
  };

  const handleSendChatMessage = (requestId: string) => {
    if (!authUser) {
      return;
    }

    const chatResult = appendChatMessage({
      requests,
      requestId,
      senderRole: authUser.role === 'poster' ? 'poster' : 'worker',
      senderName: authUser.name,
      text: chatDrafts[requestId] ?? '',
      now: Date.now(),
    });

    if (!chatResult.ok) {
      setMessage(chatResult.message);
      return;
    }

    setRequests(chatResult.data);
    setChatDrafts((current) => ({ ...current, [requestId]: '' }));
  };

  const handleRequestDecision = (requestId: string, decision: 'Accepted' | 'Rejected') => {
    if (!authUser) {
      return;
    }

    const decisionResult = decideRequest({
      gigs,
      requests,
      requestId,
      decision,
      posterName: authUser.name,
      now: Date.now(),
    });

    if (!decisionResult.ok) {
      setMessage(decisionResult.message);
      return;
    }

    setGigs(decisionResult.data.gigs);
    setRequests(decisionResult.data.requests);
    setActiveRequestId(requestId);
    setMessage(decisionResult.message);
  };

  const renderStatusBadge = (status: Gig['status'] | ApplicationRequest['status']) => {
    const statusStyle =
      status === 'Open'
        ? styles.statusBadgeOpen
        : status === 'Accepted'
          ? styles.statusBadgeAccepted
          : status === 'Rejected'
            ? styles.statusBadgeRejected
            : status === 'Assigned'
              ? styles.statusBadgeAssigned
              : styles.statusBadgePending;

    const statusTextStyle =
      status === 'Open' || status === 'Accepted'
        ? styles.statusBadgeTextPositive
        : status === 'Rejected'
          ? styles.statusBadgeTextRejected
          : status === 'Assigned'
            ? styles.statusBadgeTextAssigned
            : styles.statusBadgeTextPending;
    const statusIcon: IconName =
      status === 'Open'
        ? 'radio-button-on-outline'
        : status === 'Accepted'
          ? 'checkmark-circle-outline'
          : status === 'Rejected'
            ? 'close-circle-outline'
            : status === 'Assigned'
              ? 'ribbon-outline'
              : 'hourglass-outline';
    const statusIconColor =
      status === 'Open' || status === 'Accepted'
        ? colors.success
        : status === 'Rejected'
          ? colors.error
          : status === 'Assigned'
            ? colors.blueText
            : colors.badgeText;

    return (
      <View style={[styles.statusBadge, statusStyle]}>
        <IconGlyph name={statusIcon} size={12} color={statusIconColor} />
        <Text style={[styles.statusBadgeText, statusTextStyle]}>{status}</Text>
      </View>
    );
  };

  const renderPanelHeader = (eyebrow: string, title: string, action?: string) => (
    <View style={styles.panelHeader}>
      <View style={styles.activityContent}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.panelAction}>{action}</Text> : null}
    </View>
  );

  const renderTopBar = () =>
    authUser ? (
      <View style={styles.topBar}>
        <View style={styles.topBarBrand}>
          <View style={styles.brandMarkSmall}>
            <IconGlyph name="flash-outline" size={17} color={colors.textOnAccent} />
          </View>
          <Text style={styles.topBarBrandText}>QuickGig</Text>
        </View>
        <View style={styles.topBarIdentity}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{authUser.name.slice(0, 1)}</Text>
          </View>
          <View>
            <Text style={styles.topBarName}>{authUser.name}</Text>
            <Text style={styles.topBarRole}>{authUser.role}</Text>
          </View>
        </View>
        <Pressable style={styles.topBarLogout} onPress={handleLogout}>
          <Text style={styles.topBarLogoutText}>Logout</Text>
        </Pressable>
      </View>
    ) : null;

  const renderRolePicker = () => (
    <View style={[styles.roleRow, isWideLayout && styles.roleRowWide]}>
      {roleOptions.map((item) => {
        const active = selectedRole === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => {
              setSelectedRole(item.key);
              setMessage('');
            }}
            style={[styles.roleChip, active && styles.roleChipActive]}
          >
            <View style={styles.roleIconRow}>
              <View style={[styles.roleIconBubble, active && styles.roleIconBubbleActive]}>
                <IconGlyph
                  name={item.icon}
                  size={17}
                  color={active ? colors.textOnAccent : colors.accentHover}
                />
              </View>
              <Text style={[styles.roleChipLabel, active && styles.roleChipTextActive]}>{item.label}</Text>
            </View>
            <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{item.title}</Text>
            <Text style={[styles.roleChipNote, active && styles.roleChipNoteActive]}>{item.note}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderLogin = () => (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        !isWideLayout && compactContentWidth,
        isWideLayout && styles.scrollContentWide,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.marketHero, !isWideLayout && styles.marketHeroCompact]}>
        <View style={[styles.loginNav, !isWideLayout && styles.loginNavCompact]}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <IconGlyph name="flash-outline" size={22} color={colors.textOnAccent} />
            </View>
            <View>
              <Text style={styles.loginEyebrow}>QuickGig</Text>
              <Text style={styles.brandSubline}>Local work marketplace</Text>
            </View>
          </View>
          <View style={styles.navBadge}>
            <IconGlyph name="location-outline" size={13} color={colors.accentSoftText} />
            <Text style={styles.navBadgeText}>Bengaluru beta</Text>
          </View>
        </View>

        <View style={[styles.heroGrid, isWideLayout && styles.heroGridWide]}>
          <View style={[styles.loginHero, !isWideLayout && styles.loginHeroCompact]}>
            <Text style={styles.heroKicker}>Short-term jobs. Real conversations. Fast hiring.</Text>
            <Text style={[styles.loginTitle, !isWideLayout && styles.loginTitleCompact]}>
              The marketplace for trusted local gigs.
            </Text>
            <Text style={styles.loginSubtitle}>
              Find paid assignments, post work briefs, and manage requests from one polished workspace.
            </Text>
            <View style={styles.trustRow}>
              {trustSignals.map((signal) => (
                <View key={signal.label} style={styles.trustPill}>
                  <IconGlyph name={signal.icon} size={15} color={colors.accentHover} />
                  <Text style={styles.trustText}>{signal.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.loginCard, isWideLayout && styles.loginCardWide, !isWideLayout && styles.loginCardCompact]}>
            <Text style={styles.loginCardTitle}>Access workspace</Text>
            <Text style={styles.loginCardText}>{roleOptions.find((role) => role.key === selectedRole)?.note}</Text>
            {renderRolePicker()}
            <TextInput
              value={loginForm.username}
              onChangeText={(value) => setLoginForm((current) => ({ ...current, username: value }))}
              placeholder="Username"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.cleanInput}
            />
            <TextInput
              value={loginForm.password}
              onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.cleanInput}
            />
            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonText}>Sign in</Text>
                <IconGlyph name="arrow-forward-outline" size={17} color={colors.textOnAccent} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.categoryShowcase}>
          {postableCategories.map((category) => (
            <View key={category} style={styles.categoryShowcaseItem}>
              <IconGlyph name={categoryIcons[category]} size={15} color={colors.textSecondary} />
              <Text style={styles.categoryShowcaseText}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.miniGrid}>
        {quickStats.map((item, index) => (
          <View key={item.label} style={styles.miniCard}>
            <View style={styles.statIconBubble}>
              <IconGlyph name={quickStatIcons[index]} size={18} color={colors.accentHover} />
            </View>
            <Text style={styles.miniCardValue}>{item.value}</Text>
            <Text style={styles.miniCardLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        {renderPanelHeader('Workspaces', 'Continue with a saved profile', `${roleAccounts.length} available`)}
        {roleAccounts.map((account) => (
          <Pressable
            key={account.id}
            style={styles.workspaceRow}
            onPress={() => {
              setLoginForm({ username: account.username, password: account.password });
              setMessage(`Filled credentials for ${account.name}.`);
            }}
          >
            <View>
              <Text style={styles.workspaceName}>{account.name}</Text>
              <Text style={styles.workspaceMeta}>
                @{account.username} - {account.role}
              </Text>
            </View>
            <Text style={styles.workspaceAction}>Open</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formCard}>
        {renderPanelHeader('Marketplace quality', 'Built for short-term hiring')}
        {featuredTips.map((tip) => (
          <View key={tip.title} style={styles.tipRow}>
            <Text style={styles.tipRowTitle}>{tip.title}</Text>
            <Text style={styles.tipRowText}>{tip.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderWorkerTabs = () => (
    <View style={styles.tabRow}>
      {[
        { key: 'discover', label: 'Discover', icon: 'compass-outline' as IconName },
        { key: 'saved', label: 'Saved', icon: 'bookmark-outline' as IconName },
        { key: 'requests', label: 'Messages', icon: 'chatbubble-ellipses-outline' as IconName },
        { key: 'account', label: 'Account', icon: 'person-circle-outline' as IconName },
      ].map((tab) => {
        const active = workerTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setWorkerTab(tab.key as WorkerTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <IconGlyph name={tab.icon} size={16} color={active ? colors.accentHover : colors.textMuted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderPosterTabs = () => (
    <View style={styles.tabRow}>
      {[
        { key: 'overview', label: 'Overview', icon: 'analytics-outline' as IconName },
        { key: 'post', label: 'Post', icon: 'add-circle-outline' as IconName },
        { key: 'requests', label: 'Messages', icon: 'mail-unread-outline' as IconName },
        { key: 'account', label: 'Account', icon: 'person-circle-outline' as IconName },
      ].map((tab) => {
        const active = posterTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setPosterTab(tab.key as PosterTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <IconGlyph name={tab.icon} size={16} color={active ? colors.accentHover : colors.textMuted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderAdminTabs = () => (
    <View style={styles.tabRow}>
      {[
        { key: 'overview', label: 'Overview', icon: 'speedometer-outline' as IconName },
        { key: 'gigs', label: 'Briefs', icon: 'documents-outline' as IconName },
        { key: 'requests', label: 'Requests', icon: 'git-pull-request-outline' as IconName },
        { key: 'account', label: 'Account', icon: 'person-circle-outline' as IconName },
      ].map((tab) => {
        const active = adminTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setAdminTab(tab.key as AdminTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <IconGlyph name={tab.icon} size={16} color={active ? colors.accentHover : colors.textMuted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderAccountCard = () => (
    <View style={styles.formCard}>
      {renderPanelHeader('Profile', 'Account details')}
      <View style={styles.accountCard}>
        <Text style={styles.accountLine}>Name: {authUser?.name}</Text>
        <Text style={styles.accountLine}>Username: {authUser?.username}</Text>
        <Text style={styles.accountLine}>Role: {authUser?.role}</Text>
      </View>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <View style={styles.buttonContent}>
          <IconGlyph name="log-out-outline" size={17} color={colors.textOnAccent} />
          <Text style={styles.primaryButtonText}>Logout</Text>
        </View>
      </Pressable>
    </View>
  );

  const renderRequestConversation = (request: ApplicationRequest, canModerate: boolean) => (
    <View style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <View style={styles.activityContent}>
          <Text style={styles.requestGigTitle}>{request.gigTitle}</Text>
          <Text style={styles.chatMeta}>
            {request.workerName}
          </Text>
        </View>
        {renderStatusBadge(request.status)}
        {canModerate && request.status === 'Pending' ? (
          <View style={styles.chatDecisionRow}>
            <Pressable style={styles.acceptButton} onPress={() => handleRequestDecision(request.id, 'Accepted')}>
              <IconGlyph name="checkmark-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.chatDecisionText}>Accept</Text>
            </Pressable>
            <Pressable style={styles.rejectPill} onPress={() => handleRequestDecision(request.id, 'Rejected')}>
              <IconGlyph name="close-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.chatDecisionText}>Reject</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.conversationFeed}>
        {request.conversation.map((entry) => {
          const ownMessage = entry.senderName === authUser?.name;

          return (
            <View
              key={entry.id}
              style={[styles.messageBubble, ownMessage ? styles.messageBubbleOwn : styles.messageBubbleOther]}
            >
              <Text style={[styles.messageSender, ownMessage && styles.messageSenderOwn]}>{entry.senderName}</Text>
              <Text style={[styles.messageText, ownMessage && styles.messageTextOwn]}>{entry.text}</Text>
              <Text style={[styles.messageTime, ownMessage && styles.messageTimeOwn]}>{entry.timestamp}</Text>
            </View>
          );
        })}
      </View>

      <TextInput
        value={chatDrafts[request.id] ?? ''}
        onChangeText={(value) => setChatDrafts((current) => ({ ...current, [request.id]: value }))}
        placeholder="Type a message..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
        style={[styles.cleanInput, styles.chatInput]}
      />
      <Pressable style={styles.primaryButton} onPress={() => handleSendChatMessage(request.id)}>
        <View style={styles.buttonContent}>
          <IconGlyph name="send-outline" size={17} color={colors.textOnAccent} />
          <Text style={styles.primaryButtonText}>Send Message</Text>
        </View>
      </Pressable>
    </View>
  );

  const renderGigCard = (gig: Gig) => {
    const saved = savedGigIds.includes(gig.id);
    const requested = requestedGigIds.has(gig.id);
    const matchScore = calculateGigFitScore(gig);

    return (
      <View key={gig.id} style={[styles.jobCard, requested && styles.jobCardHighlighted]}>
        <View style={styles.jobCardTop}>
          <View style={styles.posterMini}>
            <View style={styles.posterAvatar}>
              <IconGlyph name="business-outline" size={18} color={colors.textPrimary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.jobPoster}>{gig.postedBy}</Text>
              <Text style={styles.jobTrust}>Rated {gig.rating.toFixed(1)} by local workers</Text>
            </View>
          </View>
          <View style={styles.cardActionRow}>
            <View style={styles.scorePill}>
              <IconGlyph name="sparkles-outline" size={13} color={colors.accentHover} />
              <Text style={styles.scorePillText}>{matchScore}% fit</Text>
            </View>
            <Pressable
              accessibilityLabel={saved ? 'Remove saved brief' : 'Save brief'}
              onPress={() => toggleSavedGig(gig.id)}
              style={[styles.saveButton, saved && styles.saveButtonActive]}
            >
              <IconGlyph
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={17}
                color={saved ? colors.textOnAccent : colors.accentHover}
              />
            </Pressable>
            {renderStatusBadge(gig.status)}
          </View>
        </View>
        <View style={styles.jobCardHeader}>
          <View style={styles.activityContent}>
            <Text style={styles.jobCategory}>{gig.category}</Text>
            <Text style={styles.jobTitle}>{gig.title}</Text>
            <Text style={styles.jobDescription} numberOfLines={2}>
              {gig.description}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <View style={styles.amountLabelRow}>
              <IconGlyph name="cash-outline" size={13} color={colors.textMuted} />
              <Text style={styles.amountLabel}>Fixed payout</Text>
            </View>
            <Text style={styles.amountPillText}>{formatPay(gig.pay)}</Text>
          </View>
        </View>
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaPill}>
            <IconGlyph name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.jobMetaPillText}>{gig.location}</Text>
          </View>
          <View style={styles.jobMetaPill}>
            <IconGlyph name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.jobMetaPillText}>{gig.duration}</Text>
          </View>
          <View style={styles.jobMetaPill}>
            <IconGlyph name="people-outline" size={14} color={colors.textMuted} />
            <Text style={styles.jobMetaPillText}>{gig.applicants} applicants</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardFooterMeta}>
            <IconGlyph
              name={requested ? 'checkmark-done-outline' : 'shield-checkmark-outline'}
              size={15}
              color={requested ? colors.success : colors.textMuted}
            />
            <Text style={styles.cardFooterText}>
              {requested ? 'Request thread active' : 'Shortlist-ready local brief'}
            </Text>
          </View>
          <Pressable style={styles.cardFooterButton} onPress={() => setSelectedGig(gig)}>
            <Text style={styles.cardFooterAction}>{requested ? 'Open brief' : 'View brief'}</Text>
            <IconGlyph name="arrow-forward-outline" size={15} color={colors.accentHover} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderWorkerView = () => (
    <ScrollView
      contentContainerStyle={[
        styles.appScrollContent,
        !isWideLayout && compactContentWidth,
        isWideLayout && styles.appScrollContentWide,
      ]}
      showsVerticalScrollIndicator={false}
    >
        <View style={styles.headerPanel}>
          <View style={styles.headerTopLine}>
            <Text style={styles.headerEyebrow}>Worker marketplace</Text>
            <View style={styles.headerBadge}>
              <IconGlyph name="pulse-outline" size={13} color={colors.accentSoftText} />
              <Text style={styles.headerBadgeText}>Live briefs</Text>
            </View>
          </View>
        <Text style={styles.headerTitle}>{authUser?.headline}</Text>
        <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
      </View>
      {renderWorkerTabs()}

      {workerTab === 'discover' ? (
        <View style={styles.sectionStack}>
          <View style={styles.searchPanel}>
            {renderPanelHeader('Explore', 'Recommended gigs', `${filteredGigs.length} matches`)}
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by skill, location, or task"
              placeholderTextColor={colors.muted}
              style={styles.cleanInput}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  >
                    <IconGlyph
                      name={categoryIcons[category]}
                      size={15}
                      color={selected ? colors.accentHover : colors.textMuted}
                    />
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {filteredGigs.length > 0 ? (
            filteredGigs.map(renderGigCard)
          ) : (
            <View style={styles.emptyStateCard}>
              <IconGlyph name="search-outline" size={22} color={colors.textMuted} />
              <Text style={styles.emptyChatTitle}>No briefs found</Text>
              <Text style={styles.emptyChatText}>Try a broader search or switch categories.</Text>
            </View>
          )}
        </View>
      ) : null}

      {workerTab === 'saved' ? (
        <View style={styles.sectionStack}>
          <View style={styles.surfaceCard}>
            {renderPanelHeader('Saved', 'Briefs you are considering', `${savedGigs.length} saved`)}
            <Text style={styles.sectionText}>
              Compare payout, timing, and poster quality before sending a request.
            </Text>
          </View>
          {savedGigs.length > 0 ? (
            savedGigs.map(renderGigCard)
          ) : (
            <View style={styles.emptyStateCard}>
              <IconGlyph name="bookmark-outline" size={22} color={colors.textMuted} />
              <Text style={styles.emptyChatTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyChatText}>Saved briefs will appear here for quick comparison.</Text>
            </View>
          )}
        </View>
      ) : null}

      {workerTab === 'requests' ? (
        <View style={styles.sectionStack}>
          <View style={styles.messageLayout}>
            <View style={styles.messageListCard}>
              {renderPanelHeader('Inbox', 'Request threads', `${workerRequests.length} active`)}
              {workerRequests.map((request) => {
                const selected = activeRequestId === request.id;

                return (
                  <Pressable
                    key={request.id}
                    style={[styles.messageListItem, selected && styles.messageListItemActive]}
                    onPress={() => setActiveRequestId(request.id)}
                  >
                    <View style={styles.messageListTop}>
                      <IconGlyph
                        name="chatbubble-ellipses-outline"
                        size={16}
                        color={selected ? colors.accentHover : colors.textMuted}
                      />
                      <Text style={styles.messageListTitle}>{request.gigTitle}</Text>
                    </View>
                    <Text style={styles.messageListMeta}>{request.status} - {request.workerName}</Text>
                  </Pressable>
                );
              })}
            </View>
            {activeRequest ? (
              renderRequestConversation(activeRequest, false)
            ) : (
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatTitle}>No thread selected</Text>
                <Text style={styles.emptyChatText}>
                  Request history, poster notes, and replies stay grouped by gig.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {workerTab === 'account' ? renderAccountCard() : null}
    </ScrollView>
  );

  const renderPosterView = () => {
    const stats = {
      gigs: posterOwnedGigs.length,
      open: posterOwnedGigs.filter((gig) => gig.status !== 'Assigned').length,
      requests: posterRequests.filter((request) => request.status === 'Pending').length,
    };

    return (
      <ScrollView
        contentContainerStyle={[
          styles.appScrollContent,
          !isWideLayout && compactContentWidth,
          isWideLayout && styles.appScrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerPanel}>
          <View style={styles.headerTopLine}>
            <Text style={styles.headerEyebrow}>Poster workspace</Text>
            <View style={styles.headerBadge}>
              <IconGlyph name="briefcase-outline" size={13} color={colors.accentSoftText} />
              <Text style={styles.headerBadgeText}>Hiring board</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>{authUser?.headline}</Text>
          <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
        </View>
        <View style={styles.miniGrid}>
          <View style={styles.miniCard}>
            <View style={styles.statIconBubble}>
              <IconGlyph name="briefcase-outline" size={18} color={colors.accentHover} />
            </View>
            <Text style={styles.miniCardValue}>{stats.gigs}</Text>
            <Text style={styles.miniCardLabel}>Your gigs</Text>
          </View>
          <View style={styles.miniCard}>
            <View style={styles.statIconBubble}>
              <IconGlyph name="radio-button-on-outline" size={18} color={colors.accentHover} />
            </View>
            <Text style={styles.miniCardValue}>{stats.open}</Text>
            <Text style={styles.miniCardLabel}>Open</Text>
          </View>
          <View style={styles.miniCard}>
            <View style={styles.statIconBubble}>
              <IconGlyph name="people-outline" size={18} color={colors.accentHover} />
            </View>
            <Text style={styles.miniCardValue}>{stats.requests}</Text>
            <Text style={styles.miniCardLabel}>Pending</Text>
          </View>
        </View>
        {renderPosterTabs()}

        {posterTab === 'overview' ? (
          <View style={styles.surfaceCard}>
            {renderPanelHeader('Manage', 'Your active briefs', `${posterOwnedGigs.length} listed`)}
            {posterOwnedGigs.map((gig) => (
              <View key={gig.id} style={styles.managementCard}>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{gig.title}</Text>
                  <Text style={styles.activityMeta}>
                    {gig.location} - {gig.duration}
                  </Text>
                </View>
                <View style={styles.managementSide}>
                  <Text style={styles.managementAmount}>{formatPay(gig.pay)}</Text>
                  {renderStatusBadge(gig.status)}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {posterTab === 'post' ? (
          <View style={styles.formCard}>
            {renderPanelHeader('Create', 'Post a new work brief')}
            <View style={styles.readinessCard}>
              <View style={styles.readinessTop}>
                <View>
                  <Text style={styles.readinessLabel}>Brief readiness</Text>
                  <Text style={styles.readinessTitle}>{gigReadinessPercent}% complete</Text>
                </View>
                <View style={styles.readinessScore}>
                  <IconGlyph name="checkmark-done-outline" size={15} color={colors.accentHover} />
                  <Text style={styles.readinessScoreText}>
                    {gigReadinessCount}/{gigReadinessItems.length}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${gigReadinessPercent}%` }]} />
              </View>
              <View style={styles.readinessList}>
                {gigReadinessItems.map((item) => (
                  <View key={item.label} style={[styles.readinessItem, item.complete && styles.readinessItemDone]}>
                    <IconGlyph
                      name={item.complete ? 'checkmark-circle-outline' : 'ellipse-outline'}
                      size={14}
                      color={item.complete ? colors.success : colors.textMuted}
                    />
                    <Text style={[styles.readinessItemText, item.complete && styles.readinessItemTextDone]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <TextInput
              value={gigForm.title}
              onChangeText={(value) => setGigForm((current) => ({ ...current, title: value }))}
              placeholder="Brief title"
              placeholderTextColor={colors.muted}
              style={styles.cleanInput}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {postableCategories.map((category) => {
                const selected = gigForm.category === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setGigForm((current) => ({ ...current, category }))}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  >
                    <IconGlyph
                      name={categoryIcons[category]}
                      size={15}
                      color={selected ? colors.accentHover : colors.textMuted}
                    />
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              value={gigForm.location}
              onChangeText={(value) => setGigForm((current) => ({ ...current, location: value }))}
              placeholder="Location"
              placeholderTextColor={colors.muted}
              style={styles.cleanInput}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                value={gigForm.pay}
                onChangeText={(value) => setGigForm((current) => ({ ...current, pay: value }))}
                placeholder="Pay in rupees"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={[styles.cleanInput, styles.inlineField]}
              />
              <TextInput
                value={gigForm.duration}
                onChangeText={(value) => setGigForm((current) => ({ ...current, duration: value }))}
                placeholder="Duration"
                placeholderTextColor={colors.muted}
                style={[styles.cleanInput, styles.inlineField]}
              />
            </View>
            <TextInput
              value={gigForm.description}
              onChangeText={(value) => setGigForm((current) => ({ ...current, description: value }))}
              placeholder="Scope, timing, expectations, and selection criteria"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.cleanInput, styles.largeInput]}
            />
            <Pressable style={styles.primaryButton} onPress={handleCreateGig}>
              <View style={styles.buttonContent}>
                <IconGlyph name="cloud-upload-outline" size={17} color={colors.textOnAccent} />
                <Text style={styles.primaryButtonText}>Publish Brief</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {posterTab === 'requests' ? (
          <View style={styles.messageLayout}>
            <View style={styles.messageListCard}>
              {renderPanelHeader('Applicants', 'Worker messages', `${posterRequests.length} threads`)}
              {posterRequests.map((request) => {
                const selected = activeRequestId === request.id;

                return (
                  <Pressable
                    key={request.id}
                    style={[styles.messageListItem, selected && styles.messageListItemActive]}
                    onPress={() => setActiveRequestId(request.id)}
                  >
                    <View style={styles.messageListTop}>
                      <IconGlyph
                        name="person-outline"
                        size={16}
                        color={selected ? colors.accentHover : colors.textMuted}
                      />
                      <Text style={styles.messageListTitle}>{request.workerName}</Text>
                    </View>
                    <Text style={styles.messageListMeta}>{request.gigTitle} - {request.status}</Text>
                  </Pressable>
                );
              })}
            </View>
            {activeRequest ? (
              renderRequestConversation(activeRequest, true)
            ) : (
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatTitle}>No applicant selected</Text>
                <Text style={styles.emptyChatText}>
                  Applicant notes, decisions, and poster replies stay attached to each brief.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {posterTab === 'account' ? renderAccountCard() : null}
      </ScrollView>
    );
  };

  const renderAdminView = () => (
    <ScrollView
      contentContainerStyle={[
        styles.appScrollContent,
        !isWideLayout && compactContentWidth,
        isWideLayout && styles.appScrollContentWide,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerPanel}>
        <View style={styles.headerTopLine}>
          <Text style={styles.headerEyebrow}>Operations</Text>
          <View style={styles.headerBadge}>
            <IconGlyph name="shield-checkmark-outline" size={13} color={colors.accentSoftText} />
            <Text style={styles.headerBadgeText}>Admin control</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>{authUser?.headline}</Text>
        <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
      </View>
      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <View style={styles.statIconBubble}>
            <IconGlyph name="people-outline" size={18} color={colors.accentHover} />
          </View>
          <Text style={styles.miniCardValue}>{adminStats.totalUsers}</Text>
          <Text style={styles.miniCardLabel}>Users</Text>
        </View>
        <View style={styles.miniCard}>
          <View style={styles.statIconBubble}>
            <IconGlyph name="storefront-outline" size={18} color={colors.accentHover} />
          </View>
          <Text style={styles.miniCardValue}>{adminStats.liveGigs}</Text>
          <Text style={styles.miniCardLabel}>Live gigs</Text>
        </View>
        <View style={styles.miniCard}>
          <View style={styles.statIconBubble}>
            <IconGlyph name="speedometer-outline" size={18} color={colors.accentHover} />
          </View>
          <Text style={styles.miniCardValue}>{marketplaceAudit.healthScore}</Text>
          <Text style={styles.miniCardLabel}>Health score</Text>
        </View>
      </View>
      {renderAdminTabs()}

      {adminTab === 'overview' ? (
        <View style={styles.formCard}>
          {renderPanelHeader('Overview', 'Marketplace health', `${adminStats.pendingRequests} pending`)}
          <Text style={styles.sectionText}>
            Live supply, request quality, and fulfillment status across the marketplace.
          </Text>
          <View style={styles.auditGrid}>
            <View style={styles.auditScoreCard}>
              <IconGlyph name="shield-checkmark-outline" size={20} color={colors.accentHover} />
              <View>
                <Text style={styles.auditScoreValue}>{marketplaceAudit.healthScore}/100</Text>
                <Text style={styles.auditScoreLabel}>Operational score</Text>
              </View>
            </View>
            <View style={styles.auditScoreCard}>
              <IconGlyph name="ribbon-outline" size={20} color={colors.accentHover} />
              <View>
                <Text style={styles.auditScoreValue}>{adminStats.assignedGigs}</Text>
                <Text style={styles.auditScoreLabel}>Assigned briefs</Text>
              </View>
            </View>
          </View>
          <View style={styles.auditList}>
            {marketplaceAudit.issues.slice(0, 4).map((issue) => (
              <View key={issue.id} style={styles.auditIssueRow}>
                <View style={styles.auditIssueIcon}>
                  <IconGlyph
                    name={issue.severity === 'High' ? 'alert-circle-outline' : 'information-circle-outline'}
                    size={15}
                    color={issue.severity === 'High' ? colors.error : colors.badgeText}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.auditIssueTitle}>{issue.title}</Text>
                  <Text style={styles.auditIssueText}>{issue.detail}</Text>
                </View>
                <Text style={styles.auditSeverity}>{issue.severity}</Text>
              </View>
            ))}
            {marketplaceAudit.issues.length === 0 ? (
              <View style={styles.auditIssueRow}>
                <View style={styles.auditIssueIcon}>
                  <IconGlyph name="checkmark-circle-outline" size={15} color={colors.success} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.auditIssueTitle}>No operational issues</Text>
                  <Text style={styles.auditIssueText}>Requests and brief statuses are in sync.</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {adminTab === 'gigs' ? (
        <View style={styles.surfaceCard}>
          {renderPanelHeader('Supply', 'All work briefs', `${gigs.length} total`)}
          {gigs.map((gig) => (
            <View key={gig.id} style={styles.managementCard}>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{gig.title}</Text>
                <Text style={styles.activityMeta}>
                  {gig.postedBy} - {gig.location} - {formatPay(gig.pay)}
                </Text>
              </View>
              {renderStatusBadge(gig.status)}
            </View>
          ))}
        </View>
      ) : null}

      {adminTab === 'requests' ? (
        <View style={styles.surfaceCard}>
          {renderPanelHeader('Demand', 'All requests', `${requests.length} total`)}
          {requests.map((request) => (
            <View key={request.id} style={styles.managementCard}>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{request.workerName}</Text>
                <Text style={styles.activityMeta}>
                  {request.gigTitle}
                </Text>
              </View>
              {renderStatusBadge(request.status)}
            </View>
          ))}
        </View>
      ) : null}

      {adminTab === 'account' ? renderAccountCard() : null}
    </ScrollView>
  );

  const selectedGigAlreadyRequested = selectedGig ? requestedGigIds.has(selectedGig.id) : false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appShell}>
        {renderTopBar()}
        {!authUser ? renderLogin() : null}
        {authUser?.role === 'worker' ? renderWorkerView() : null}
        {authUser?.role === 'poster' ? renderPosterView() : null}
        {authUser?.role === 'admin' ? renderAdminView() : null}

        {message ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{message}</Text>
          </View>
        ) : null}

        <Modal
          visible={Boolean(selectedGig)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedGig(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {selectedGig ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.activityContent}>
                      <Text style={styles.jobCategory}>{selectedGig.category}</Text>
                      <Text style={styles.modalTitle}>{selectedGig.title}</Text>
                    </View>
                    <Pressable style={styles.closeButton} onPress={() => setSelectedGig(null)}>
                      <IconGlyph name="close-outline" size={17} color={colors.accentHover} />
                      <Text style={styles.closeText}>Close</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.modalMeta}>
                    {selectedGig.location} - {selectedGig.duration} - {formatPay(selectedGig.pay)}
                  </Text>
                  <Text style={styles.modalDescription}>{selectedGig.description}</Text>
                  <Text style={styles.modalSectionTitle}>Requirements</Text>
                  {selectedGig.requirements.map((item) => (
                    <Text key={item} style={styles.requirementText}>
                      - {item}
                    </Text>
                  ))}
                  {selectedGigAlreadyRequested ? (
                    <View style={styles.noticeCard}>
                      <IconGlyph name="checkmark-done-outline" size={18} color={colors.success} />
                      <View style={styles.activityContent}>
                        <Text style={styles.noticeTitle}>Request already active</Text>
                        <Text style={styles.noticeText}>The existing thread is ready in Messages.</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>Request note</Text>
                      <Pressable
                        style={styles.assistButton}
                        onPress={() =>
                          setRequestMessageDraft(buildSuggestedRequestNote(selectedGig, authUser?.name ?? ''))
                        }
                      >
                        <IconGlyph name="create-outline" size={15} color={colors.accentHover} />
                        <Text style={styles.assistButtonText}>Draft a polished note</Text>
                      </Pressable>
                      <TextInput
                        value={requestMessageDraft}
                        onChangeText={setRequestMessageDraft}
                        placeholder="Share fit, availability, and questions for the poster"
                        placeholderTextColor={colors.muted}
                        multiline
                        textAlignVertical="top"
                        style={[styles.cleanInput, styles.largeInput]}
                      />
                    </>
                  )}
                  <View style={styles.modalFooter}>
                    <View>
                      <View style={styles.modalFooterTitleRow}>
                        <IconGlyph name="business-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.modalFooterTitle}>Poster</Text>
                      </View>
                      <Text style={styles.modalFooterText}>{selectedGig.postedBy}</Text>
                    </View>
                    <Pressable style={styles.primaryButton} onPress={handleSendRequest}>
                      <View style={styles.buttonContent}>
                        <IconGlyph
                          name={selectedGigAlreadyRequested ? 'chatbubble-ellipses-outline' : 'paper-plane-outline'}
                          size={17}
                          color={colors.textOnAccent}
                        />
                        <Text style={styles.primaryButtonText}>
                          {selectedGigAlreadyRequested ? 'Open Thread' : 'Send Request'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: NativeStatusBar.currentHeight ?? 0,
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(11, 17, 24, 0.96)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  topBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  brandMarkSmall: {
    width: 32,
    height: 32,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBrandText: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '900',
    fontSize: 15,
  },
  topBarIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  userAvatarText: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  topBarName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  topBarRole: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  topBarLogout: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  topBarLogoutText: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    maxWidth: 1120,
    alignSelf: 'stretch',
  },
  scrollContentWide: {
    width: '78%',
    alignSelf: 'center',
  },
  appScrollContent: {
    padding: spacing.lg,
    paddingTop: 92,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    maxWidth: 980,
    alignSelf: 'stretch',
  },
  appScrollContentWide: {
    width: '78%',
    alignSelf: 'center',
  },
  marketHero: {
    backgroundColor: colors.cardStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadow.card,
  },
  marketHeroCompact: {
    padding: spacing.lg,
  },
  loginNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  loginNavCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  loginHero: {
    gap: spacing.md,
    flex: 1.1,
  },
  loginHeroCompact: {
    alignSelf: 'stretch',
  },
  heroGrid: {
    flexDirection: 'column',
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  heroGridWide: {
    flexDirection: 'row',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginEyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: fonts.display,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  navBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBadgeText: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '800',
  },
  heroKicker: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  brandSubline: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  loginTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 52,
    maxWidth: 620,
  },
  loginTitleCompact: {
    fontSize: 32,
    lineHeight: 39,
    maxWidth: '100%',
  },
  loginSubtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 680,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trustText: {
    color: colors.textSecondary,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '800',
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  loginCardWide: {
    flex: 1,
    minWidth: 340,
  },
  loginCardCompact: {
    alignSelf: 'stretch',
  },
  roleRow: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  roleRowWide: {
    flexDirection: 'row',
  },
  roleChip: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 88,
  },
  roleChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  roleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleIconBubble: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleIconBubbleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleChipLabel: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  roleChipText: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  roleChipTextActive: {
    color: colors.accentSoftText,
  },
  roleChipNote: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  roleChipNoteActive: {
    color: colors.textSecondary,
  },
  cleanInput: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  miniGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
    justifyContent: 'center',
    ...shadow.card,
  },
  statIconBubble: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  miniCardValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  miniCardLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  loginCardTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '900',
  },
  loginCardText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  categoryShowcase: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryShowcaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryShowcaseText: {
    color: colors.textSecondary,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '800',
  },
  surfaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionStack: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  panelAction: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  auditGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  auditScoreCard: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  auditScoreValue: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '900',
  },
  auditScoreLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  auditList: {
    gap: spacing.sm,
  },
  auditIssueRow: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  auditIssueIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditIssueTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '900',
  },
  auditIssueText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  auditSeverity: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  workspaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  workspaceName: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 16,
  },
  workspaceMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  workspaceAction: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  tipRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tipRowTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  tipRowText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  headerPanel: {
    backgroundColor: colors.cardStrongMuted,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  headerTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: fonts.display,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerBadgeText: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 38,
  },
  headerSubtitle: {
    color: colors.textOnStrongMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.pill,
    padding: 4,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 12,
  },
  tabLabelActive: {
    color: colors.accentHover,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  categoryChip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundTint,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontFamily: fonts.display,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.accentHover,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  jobCardHighlighted: {
    borderColor: colors.accent,
    backgroundColor: colors.cardStrongMuted,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  scorePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scorePillText: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '900',
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundTint,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  saveButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  posterMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  posterAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  jobPoster: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '900',
  },
  jobTrust: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  jobCategory: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: fonts.display,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountBlock: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    minWidth: 128,
  },
  amountLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  jobTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: spacing.xs,
  },
  amountPillText: {
    color: colors.success,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  jobDescription: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  jobMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  jobMetaPill: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobMetaPillText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundTint,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cardFooterText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  cardFooterAction: {
    color: colors.accentHover,
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '900',
  },
  messageLayout: {
    gap: spacing.md,
  },
  messageListCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  messageListItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  messageListItemActive: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderBottomColor: 'transparent',
  },
  messageListTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  messageListTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  messageListMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  chatCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  chatMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: spacing.xs,
  },
  chatDecisionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chatDecisionText: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 12,
  },
  rejectPill: {
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
  },
  conversationFeed: {
    gap: spacing.sm,
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  messageBubbleOwn: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
  },
  messageBubbleOther: {
    backgroundColor: colors.surfaceElevated,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageSender: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.display,
    fontWeight: '700',
  },
  messageSenderOwn: {
    color: colors.textOnAccent,
  },
  messageText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: colors.textOnAccent,
  },
  messageTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.body,
  },
  messageTimeOwn: {
    color: '#0B3F38',
  },
  chatInput: {
    minHeight: 84,
  },
  emptyChatCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  emptyChatTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 20,
  },
  emptyChatText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineField: {
    flex: 1,
  },
  largeInput: {
    minHeight: 112,
  },
  assistButton: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  assistButtonText: {
    color: colors.accentHover,
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '900',
  },
  readinessCard: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  readinessTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  readinessLabel: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  readinessScore: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  readinessScoreText: {
    color: colors.accentSoftText,
    fontFamily: fonts.display,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  readinessList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  readinessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  readinessItemDone: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  readinessItemText: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '800',
  },
  readinessItemTextDone: {
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.success,
  },
  accountCard: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLine: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 16,
  },
  managementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  managementSide: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  managementAmount: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '900',
  },
  activityMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 11,
  },
  statusBadgeOpen: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  statusBadgeAccepted: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  statusBadgeRejected: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
  },
  statusBadgeAssigned: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blueText,
  },
  statusBadgePending: {
    backgroundColor: colors.badgeSoft,
    borderColor: colors.badge,
  },
  statusBadgeTextPositive: {
    color: colors.success,
  },
  statusBadgeTextRejected: {
    color: colors.error,
  },
  statusBadgeTextAssigned: {
    color: colors.blueText,
  },
  statusBadgeTextPending: {
    color: colors.badgeText,
  },
  requestGigTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '800',
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    ...shadow.card,
  },
  toastText: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 5, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: '62%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  closeText: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  modalDescription: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  modalSectionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  requirementText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  noticeCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '900',
  },
  noticeText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    lineHeight: 20,
    marginTop: 2,
  },
  modalFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalFooterTitle: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  modalFooterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalFooterText: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
});
