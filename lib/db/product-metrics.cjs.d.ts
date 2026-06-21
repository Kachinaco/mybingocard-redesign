import type { Db } from "mongodb";

export declare const CREATOR_ACTIVATION_EVENTS: readonly string[];
export declare const EVENT_READY_EVENTS: readonly string[];
export declare const EVENT_COMPLETION_EVENTS: readonly string[];
export declare const LIVE_GAME_EVENTS: readonly string[];
export declare const REVENUE_EVENTS: readonly string[];
export declare const OPERATOR_EVENTS: readonly string[];

export interface ProductMetrics {
  windowDays: number;
  generatedAt: Date;
  activation: {
    reportableCreators: number;
    activatedCreators: number;
    activationRate: number;
    eventReadyCreators: number;
    eventReadyRate: number;
    completedCreators: number;
    medianTimeToFirstCardMinutes: number | null;
    p75TimeToFirstCardMinutes: number | null;
    medianTimeToEventReadyMinutes: number | null;
    p75TimeToEventReadyMinutes: number | null;
  };
  events: {
    eventReadyEvents: number;
    completedEvents: number;
    completionRate: number;
    eventReadyEventsByType: Record<string, number>;
    completedEventsByType: Record<string, number>;
  };
  liveGames: {
    gamesCreated: number;
    playersJoined: number;
    gamesStarted: number;
    gamesCompleted: number;
    uniqueRoomsJoined: number;
    uniqueRoomsStarted: number;
    uniqueRoomsCompleted: number;
    joinedToStartedRate: number;
    startedToCompletedRate: number;
    averagePlayersPerJoinedRoom: number;
  };
  revenue: {
    totalRevenue: number;
    revenueEvents: number;
    revenuePerEventReadyCreator: number;
    revenuePerCompletedEvent: number;
    revenueEventsByType: Record<string, number>;
  };
  operators: {
    active30d: number;
    active90d: number;
    repeatCreators30d: number;
    seasonalReturnCreators: number;
    seasonalReturnEligible: number;
    seasonalReturnRate: number;
    operatorReturn30dRate: number;
    operatorReturn90dRate: number;
  };
  segments: {
    guestPlayers: number;
    casualCreators: number;
    operators: number;
  };
}

export interface ProductMetricsOptions {
  now?: Date;
  windowDays?: number;
}

export declare function getProductMetrics(
  db: Db,
  options?: ProductMetricsOptions
): Promise<ProductMetrics>;

export declare function isReportableCreator(user: Record<string, unknown>): boolean;
