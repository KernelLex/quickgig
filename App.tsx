import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  categories,
  demoUsers,
  featuredTips,
  initialGigs,
  initialRequests,
  postableCategories,
  quickStats,
  type ApplicationRequest,
  type DemoUser,
  type Gig,
  type GigCategory,
  type UserRole,
} from './src/data/mockData';
import { colors, radii, shadow, spacing } from './src/theme';

type WorkerTab = 'discover' | 'requests' | 'account';
type PosterTab = 'overview' | 'post' | 'requests' | 'account';
type AdminTab = 'overview' | 'gigs' | 'requests' | 'account';

const initialGigForm = {
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

export default function App() {
  const [authUser, setAuthUser] = useState<DemoUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('discover');
  const [posterTab, setPosterTab] = useState<PosterTab>('overview');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<GigCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [gigs, setGigs] = useState<Gig[]>(initialGigs);
  const [requests, setRequests] = useState<ApplicationRequest[]>(initialRequests);
  const [gigForm, setGigForm] = useState(initialGigForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [requestMessageDraft, setRequestMessageDraft] = useState('');
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

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
    () => demoUsers.filter((user) => user.role === selectedRole),
    [selectedRole],
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

  const activeRequests = authUser?.role === 'worker' ? workerRequests : posterRequests;

  const activeRequest = useMemo(
    () => activeRequests.find((request) => request.id === activeRequestId) ?? null,
    [activeRequestId, activeRequests],
  );

  const adminStats = useMemo(
    () => ({
      totalUsers: demoUsers.length,
      liveGigs: gigs.filter((gig) => gig.status !== 'Assigned').length,
      pendingRequests: requests.filter((request) => request.status === 'Pending').length,
    }),
    [gigs, requests],
  );

  const handleLogin = () => {
    const username = loginForm.username.trim().toLowerCase();
    const password = loginForm.password.trim();

    if (!username || !password) {
      setMessage('Enter your username and password.');
      return;
    }

    const user = demoUsers.find(
      (account) =>
        account.role === selectedRole &&
        account.username.toLowerCase() === username &&
        account.password === password,
    );

    if (!user) {
      setMessage('Login failed. Check the role, username, and password.');
      return;
    }

    setAuthUser(user);
    setLoginForm(initialLoginForm);
    setSelectedGig(null);
    setActiveRequestId(null);
    setRequestMessageDraft('');
    setSearch('');
    setSelectedCategory('All');
    setMessage(`Welcome back, ${user.name}.`);

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
    setMessage('Logged out successfully.');
  };

  const handleCreateGig = () => {
    if (!authUser) {
      return;
    }

    if (
      !gigForm.title.trim() ||
      !gigForm.location.trim() ||
      !gigForm.pay.trim() ||
      !gigForm.description.trim()
    ) {
      setMessage('Fill in the title, location, pay, and description before posting.');
      return;
    }

    const pay = Number(gigForm.pay);

    if (Number.isNaN(pay) || pay <= 0) {
      setMessage('Enter a valid rupee amount for the payout.');
      return;
    }

    const newGig: Gig = {
      id: `gig-${Date.now()}`,
      title: gigForm.title.trim(),
      category: gigForm.category,
      location: gigForm.location.trim(),
      pay,
      duration: gigForm.duration.trim(),
      applicants: 0,
      postedBy: authUser.name,
      rating: 5,
      description: gigForm.description.trim(),
      requirements: [
        'Available for the full short assignment',
        'Can send updates during the job',
        'Ready to start within 24 hours if selected',
      ],
      status: 'Open',
    };

    setGigs((current) => [newGig, ...current]);
    setGigForm(initialGigForm);
    setPosterTab('overview');
    setMessage('Gig published. Workers can now message you through requests.');
  };

  const handleSendRequest = () => {
    if (!selectedGig || !authUser) {
      return;
    }

    if (!requestMessageDraft.trim()) {
      setMessage('Write a short introduction before sending your request.');
      return;
    }

    const newRequest: ApplicationRequest = {
      id: `req-${Date.now()}`,
      gigId: selectedGig.id,
      gigTitle: selectedGig.title,
      workerName: authUser.name,
      workerNote: requestMessageDraft.trim(),
      status: 'Pending',
      conversation: [
        {
          id: `msg-${Date.now()}`,
          senderRole: 'worker',
          senderName: authUser.name,
          text: requestMessageDraft.trim(),
          timestamp: 'Just now',
        },
      ],
    };

    setRequests((current) => [newRequest, ...current]);
    setGigs((current) =>
      current.map((gig) =>
        gig.id === selectedGig.id
          ? { ...gig, applicants: gig.applicants + 1, status: gig.status === 'Open' ? 'Reviewing' : gig.status }
          : gig,
      ),
    );
    setSelectedGig(null);
    setRequestMessageDraft('');
    setActiveRequestId(newRequest.id);
    setWorkerTab('requests');
    setMessage('Request sent. You can continue the conversation in your messages.');
  };

  const handleSendChatMessage = (requestId: string) => {
    if (!authUser) {
      return;
    }

    const draft = (chatDrafts[requestId] ?? '').trim();

    if (!draft) {
      setMessage('Write a message before sending.');
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              conversation: [
                ...request.conversation,
                {
                  id: `msg-${Date.now()}-${request.id}`,
                  senderRole: authUser.role === 'poster' ? 'poster' : 'worker',
                  senderName: authUser.name,
                  text: draft,
                  timestamp: 'Just now',
                },
              ],
            }
          : request,
      ),
    );
    setChatDrafts((current) => ({ ...current, [requestId]: '' }));
  };

  const handleRequestDecision = (requestId: string, decision: 'Accepted' | 'Rejected') => {
    if (!authUser) {
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: decision,
              conversation: [
                ...request.conversation,
                {
                  id: `msg-${Date.now()}-decision`,
                  senderRole: 'poster',
                  senderName: authUser.name,
                  text:
                    decision === 'Accepted'
                      ? 'You have been accepted for this gig. Please check the schedule and be ready to start.'
                      : 'Thank you for applying. We are moving ahead with another worker for this task.',
                  timestamp: 'Just now',
                },
              ],
            }
          : request,
      ),
    );

    const targetRequest = requests.find((request) => request.id === requestId);

    if (targetRequest && decision === 'Accepted') {
      setGigs((current) =>
        current.map((gig) =>
          gig.id === targetRequest.gigId ? { ...gig, status: 'Assigned' } : gig,
        ),
      );
    }

    setMessage(
      decision === 'Accepted'
        ? 'Worker accepted and notified in the chat.'
        : 'Worker rejected and informed in the chat.',
    );
  };

  const renderTopBar = () =>
    authUser ? (
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarName}>{authUser.name}</Text>
          <Text style={styles.topBarRole}>{authUser.role}</Text>
        </View>
        <Pressable style={styles.topBarLogout} onPress={handleLogout}>
          <Text style={styles.topBarLogoutText}>Logout</Text>
        </Pressable>
      </View>
    ) : null;

  const renderRolePicker = () => (
    <View style={styles.roleRow}>
      {[
        { key: 'worker', label: 'Worker' },
        { key: 'poster', label: 'Poster' },
        { key: 'admin', label: 'Admin' },
      ].map((item) => {
        const active = selectedRole === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => {
              setSelectedRole(item.key as UserRole);
              setMessage('');
            }}
            style={[styles.roleChip, active && styles.roleChipActive]}
          >
            <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderLogin = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.loginHero}>
        <Text style={styles.loginEyebrow}>Quick Gig</Text>
        <Text style={styles.loginTitle}>Simple sign in for workers, posters, and admins.</Text>
        <Text style={styles.loginSubtitle}>
          A cleaner login, built-in request chat, and a sharper UI for a more deployment-ready demo.
        </Text>
      </View>

      <View style={styles.loginCard}>
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
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
      </View>

      <View style={styles.miniGrid}>
        {quickStats.map((item) => (
          <View key={item.label} style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{item.value}</Text>
            <Text style={styles.miniCardLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Demo accounts</Text>
        <Text style={styles.sectionText}>Tap one to autofill credentials for quick testing.</Text>
        {roleAccounts.map((account) => (
          <Pressable
            key={account.id}
            style={styles.demoUserRow}
            onPress={() => {
              setLoginForm({ username: account.username, password: account.password });
              setMessage(`Filled credentials for ${account.name}.`);
            }}
          >
            <View>
              <Text style={styles.demoUserName}>{account.name}</Text>
              <Text style={styles.demoUserMeta}>{account.username}</Text>
            </View>
            <Text style={styles.demoUserAction}>Use</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>What changed</Text>
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
        { key: 'discover', label: 'Discover' },
        { key: 'requests', label: 'Messages' },
        { key: 'account', label: 'Account' },
      ].map((tab) => {
        const active = workerTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setWorkerTab(tab.key as WorkerTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderPosterTabs = () => (
    <View style={styles.tabRow}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'post', label: 'Post' },
        { key: 'requests', label: 'Messages' },
        { key: 'account', label: 'Account' },
      ].map((tab) => {
        const active = posterTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setPosterTab(tab.key as PosterTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderAdminTabs = () => (
    <View style={styles.tabRow}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'gigs', label: 'Gigs' },
        { key: 'requests', label: 'Requests' },
        { key: 'account', label: 'Account' },
      ].map((tab) => {
        const active = adminTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setAdminTab(tab.key as AdminTab)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderAccountCard = () => (
    <View style={styles.formCard}>
      <Text style={styles.sectionTitle}>Account</Text>
      <Text style={styles.sectionText}>This demo keeps login simple while preserving role-based access.</Text>
      <View style={styles.accountCard}>
        <Text style={styles.accountLine}>Name: {authUser?.name}</Text>
        <Text style={styles.accountLine}>Username: {authUser?.username}</Text>
        <Text style={styles.accountLine}>Role: {authUser?.role}</Text>
      </View>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.primaryButtonText}>Logout</Text>
      </Pressable>
    </View>
  );

  const renderRequestConversation = (request: ApplicationRequest, canModerate: boolean) => (
    <View style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <View style={styles.activityContent}>
          <Text style={styles.requestGigTitle}>{request.gigTitle}</Text>
          <Text style={styles.chatMeta}>
            {request.workerName} - {request.status}
          </Text>
        </View>
        {canModerate ? (
          <View style={styles.chatDecisionRow}>
            <Pressable style={styles.acceptButton} onPress={() => handleRequestDecision(request.id, 'Accepted')}>
              <Text style={styles.chatDecisionText}>Accept</Text>
            </Pressable>
            <Pressable style={styles.rejectPill} onPress={() => handleRequestDecision(request.id, 'Rejected')}>
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
        <Text style={styles.primaryButtonText}>Send Message</Text>
      </Pressable>
    </View>
  );

  const renderWorkerView = () => (
    <ScrollView contentContainerStyle={styles.appScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerPanel}>
        <Text style={styles.headerEyebrow}>Worker space</Text>
        <Text style={styles.headerTitle}>{authUser?.headline}</Text>
        <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
      </View>
      {renderWorkerTabs()}

      {workerTab === 'discover' ? (
        <View style={styles.sectionStack}>
          <View style={styles.surfaceCard}>
            <Text style={styles.sectionTitle}>Find short gigs</Text>
            <Text style={styles.sectionText}>
              Browse local work, then send a request and continue the conversation in messages.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search gigs or locations"
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
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {filteredGigs.map((gig) => (
            <Pressable key={gig.id} style={styles.jobCard} onPress={() => setSelectedGig(gig)}>
              <View style={styles.jobCardHeader}>
                <View style={styles.activityContent}>
                  <Text style={styles.jobCategory}>{gig.category}</Text>
                  <Text style={styles.jobTitle}>{gig.title}</Text>
                </View>
                <View style={styles.amountPill}>
                  <Text style={styles.amountPillText}>Rs {gig.pay}</Text>
                </View>
              </View>
              <Text style={styles.jobMeta}>
                {gig.location} - {gig.duration} - {gig.applicants} applicants
              </Text>
              <Text style={styles.jobDescription} numberOfLines={2}>
                {gig.description}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {workerTab === 'requests' ? (
        <View style={styles.sectionStack}>
          <View style={styles.messageLayout}>
            <View style={styles.messageListCard}>
              <Text style={styles.sectionTitle}>My messages</Text>
              {workerRequests.map((request) => {
                const selected = activeRequestId === request.id;

                return (
                  <Pressable
                    key={request.id}
                    style={[styles.messageListItem, selected && styles.messageListItemActive]}
                    onPress={() => setActiveRequestId(request.id)}
                  >
                    <Text style={styles.messageListTitle}>{request.gigTitle}</Text>
                    <Text style={styles.messageListMeta}>{request.status}</Text>
                  </Pressable>
                );
              })}
            </View>
            {activeRequest ? (
              renderRequestConversation(activeRequest, false)
            ) : (
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatTitle}>Open a conversation</Text>
                <Text style={styles.emptyChatText}>
                  Choose a request to view your messages with the poster.
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
      <ScrollView contentContainerStyle={styles.appScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPanel}>
          <Text style={styles.headerEyebrow}>Poster space</Text>
          <Text style={styles.headerTitle}>{authUser?.headline}</Text>
          <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
        </View>
        <View style={styles.miniGrid}>
          <View style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{stats.gigs}</Text>
            <Text style={styles.miniCardLabel}>Your gigs</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{stats.open}</Text>
            <Text style={styles.miniCardLabel}>Open</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{stats.requests}</Text>
            <Text style={styles.miniCardLabel}>Pending</Text>
          </View>
        </View>
        {renderPosterTabs()}

        {posterTab === 'overview' ? (
          <View style={styles.surfaceCard}>
            <Text style={styles.sectionTitle}>Your active gigs</Text>
            {posterOwnedGigs.map((gig) => (
              <View key={gig.id} style={styles.activityRow}>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{gig.title}</Text>
                  <Text style={styles.activityMeta}>
                    {gig.location} - {gig.duration} - Rs {gig.pay}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{gig.status}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {posterTab === 'post' ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Post a new gig</Text>
            <TextInput
              value={gigForm.title}
              onChangeText={(value) => setGigForm((current) => ({ ...current, title: value }))}
              placeholder="Gig title"
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
              placeholder="Describe the work clearly"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.cleanInput, styles.largeInput]}
            />
            <Pressable style={styles.primaryButton} onPress={handleCreateGig}>
              <Text style={styles.primaryButtonText}>Publish Gig</Text>
            </Pressable>
          </View>
        ) : null}

        {posterTab === 'requests' ? (
          <View style={styles.messageLayout}>
            <View style={styles.messageListCard}>
              <Text style={styles.sectionTitle}>Worker messages</Text>
              {posterRequests.map((request) => {
                const selected = activeRequestId === request.id;

                return (
                  <Pressable
                    key={request.id}
                    style={[styles.messageListItem, selected && styles.messageListItemActive]}
                    onPress={() => setActiveRequestId(request.id)}
                  >
                    <Text style={styles.messageListTitle}>{request.workerName}</Text>
                    <Text style={styles.messageListMeta}>{request.gigTitle}</Text>
                  </Pressable>
                );
              })}
            </View>
            {activeRequest ? (
              renderRequestConversation(activeRequest, true)
            ) : (
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatTitle}>Open a worker conversation</Text>
                <Text style={styles.emptyChatText}>
                  Choose a request to chat, then accept or reject the worker when you are ready.
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
    <ScrollView contentContainerStyle={styles.appScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerPanel}>
        <Text style={styles.headerEyebrow}>Admin space</Text>
        <Text style={styles.headerTitle}>{authUser?.headline}</Text>
        <Text style={styles.headerSubtitle}>{authUser?.subline}</Text>
      </View>
      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniCardValue}>{adminStats.totalUsers}</Text>
          <Text style={styles.miniCardLabel}>Users</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniCardValue}>{adminStats.liveGigs}</Text>
          <Text style={styles.miniCardLabel}>Live gigs</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniCardValue}>{adminStats.pendingRequests}</Text>
          <Text style={styles.miniCardLabel}>Pending requests</Text>
        </View>
      </View>
      {renderAdminTabs()}

      {adminTab === 'overview' ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Platform overview</Text>
          <Text style={styles.sectionText}>
            This version is structured more like a deployment-ready demo: simpler sign in, clearer messaging, and cleaner role separation.
          </Text>
        </View>
      ) : null}

      {adminTab === 'gigs' ? (
        <View style={styles.surfaceCard}>
          <Text style={styles.sectionTitle}>All gigs</Text>
          {gigs.map((gig) => (
            <View key={gig.id} style={styles.activityRow}>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{gig.title}</Text>
                <Text style={styles.activityMeta}>
                  {gig.postedBy} - {gig.location} - Rs {gig.pay}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{gig.status}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {adminTab === 'requests' ? (
        <View style={styles.surfaceCard}>
          <Text style={styles.sectionTitle}>All requests</Text>
          {requests.map((request) => (
            <View key={request.id} style={styles.activityRow}>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{request.workerName}</Text>
                <Text style={styles.activityMeta}>
                  {request.gigTitle} - {request.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {adminTab === 'account' ? renderAccountCard() : null}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
                    <Pressable onPress={() => setSelectedGig(null)}>
                      <Text style={styles.closeText}>Close</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.modalMeta}>
                    {selectedGig.location} - {selectedGig.duration} - Rs {selectedGig.pay}
                  </Text>
                  <Text style={styles.modalDescription}>{selectedGig.description}</Text>
                  <Text style={styles.modalSectionTitle}>Requirements</Text>
                  {selectedGig.requirements.map((item) => (
                    <Text key={item} style={styles.requirementText}>
                      - {item}
                    </Text>
                  ))}
                  <Text style={styles.modalSectionTitle}>Request message</Text>
                  <TextInput
                    value={requestMessageDraft}
                    onChangeText={setRequestMessageDraft}
                    placeholder="Explain why you fit this gig and ask anything important."
                    placeholderTextColor={colors.muted}
                    multiline
                    textAlignVertical="top"
                    style={[styles.cleanInput, styles.largeInput]}
                  />
                  <View style={styles.modalFooter}>
                    <View>
                      <Text style={styles.modalFooterTitle}>Poster</Text>
                      <Text style={styles.modalFooterText}>{selectedGig.postedBy}</Text>
                    </View>
                    <Pressable style={styles.primaryButton} onPress={handleSendRequest}>
                      <Text style={styles.primaryButtonText}>Send Request</Text>
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
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  topBarRole: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  topBarLogout: {
    backgroundColor: colors.cardStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBarLogoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  appScrollContent: {
    padding: spacing.lg,
    paddingTop: 92,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  loginHero: {
    gap: spacing.sm,
  },
  loginEyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  loginTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
  },
  loginSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleChip: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.cardStrong,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  cleanInput: {
    backgroundColor: colors.backgroundTint,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniCardValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  miniCardLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  surfaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionStack: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  demoUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  demoUserName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  demoUserMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  demoUserAction: {
    color: colors.accent,
    fontWeight: '800',
  },
  tipRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tipRowTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  tipRowText: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  headerPanel: {
    backgroundColor: colors.cardStrong,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerEyebrow: {
    color: colors.accentSoftText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
  },
  headerSubtitle: {
    color: colors.textOnStrongMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  tabLabelActive: {
    color: '#FFFFFF',
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
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.accent,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  jobCategory: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  jobTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  amountPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  amountPillText: {
    color: colors.success,
    fontWeight: '800',
  },
  jobMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  jobDescription: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  messageLayout: {
    gap: spacing.md,
  },
  messageListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageListItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  messageListItemActive: {
    backgroundColor: colors.backgroundTint,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
  },
  messageListTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  messageListMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  chatMeta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chatDecisionRow: {
    gap: spacing.xs,
  },
  chatDecisionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  rejectPill: {
    backgroundColor: colors.error,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
    backgroundColor: colors.cardStrong,
    alignSelf: 'flex-end',
  },
  messageBubbleOther: {
    backgroundColor: colors.backgroundTint,
    alignSelf: 'flex-start',
  },
  messageSender: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  messageSenderOwn: {
    color: '#D2E0F3',
  },
  messageText: {
    color: colors.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  messageTimeOwn: {
    color: '#BCD0EA',
  },
  chatInput: {
    minHeight: 84,
  },
  emptyChatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyChatTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
  },
  emptyChatText: {
    color: colors.textSecondary,
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
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  activityMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 12,
  },
  requestGigTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.cardStrong,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  toastText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 24, 0.34)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: '62%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  closeText: {
    color: colors.accent,
    fontWeight: '800',
  },
  modalMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  modalDescription: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  modalSectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  requirementText: {
    color: colors.textSecondary,
    lineHeight: 20,
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
    fontSize: 12,
    textTransform: 'uppercase',
  },
  modalFooterText: {
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
});
