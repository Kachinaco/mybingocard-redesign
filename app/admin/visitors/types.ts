export type AdminVisitorIdentityType = "known" | "anonymous" | "session";

export type AdminVisitorEvent = {
  event: string;
  pathname: string | null;
  createdAt: string;
  sessionId: string | null;
  tabId: string | null;
  trafficClass: string | null;
  isHuman: boolean | null;
};

export type AdminVisitorSummary = {
  visitorKey: string;
  identityType: AdminVisitorIdentityType;
  visitorLabel: string;
  visitorName: string | null;
  visitorEmail: string | null;
  myBingoCardUserId: string | null;
  anonymousId: string | null;
  sessionIds: string[];
  tabIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  lastPresenceAt: string | null;
  lastInteractionAt: string | null;
  lastPathname: string | null;
  lastEvent: string | null;
  eventCount: number;
  pageViews: number;
  uniquePages: string[];
  isActive: boolean;
  isEngaged: boolean;
  isVisible: boolean | null;
  isFocused: boolean | null;
  recentEvents: AdminVisitorEvent[];
};

export type AdminVisitorsStats = {
  activeVisitors: number;
  activeKnownVisitors: number;
  activeAnonymousVisitors: number;
  engagedVisitors: number;
  visibleVisitors: number;
  visitors24h: number;
  knownVisitors24h: number;
  anonymousVisitors24h: number;
  sessions24h: number;
  events24h: number;
};

export type AdminVisitorsData = {
  domain: string;
  generatedAt: string;
  liveWindowMinutes: number;
  periodHours: number;
  filters: {
    anonymousId: string | null;
    sessionId: string | null;
    visitorKey: string | null;
  };
  stats: AdminVisitorsStats;
  activeVisitors: AdminVisitorSummary[];
  visitors: AdminVisitorSummary[];
};
