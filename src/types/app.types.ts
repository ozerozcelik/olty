import type { Session } from '@supabase/supabase-js';

import type { Database, Inserts, Tables, Updates, Views } from './database.types';

export type ProfileRow = Tables<'profiles'>;
export type ProfileInsert = Inserts<'profiles'>;
export type ProfileUpdate = Updates<'profiles'>;

export type FishSpeciesRow = Tables<'fish_species'>;

export type CatchRow = Tables<'catches'>;
export type CatchInsert = Omit<
  CatchRow,
  'id' | 'created_at' | 'xp_earned' | 'like_count' | 'comment_count'
>;
export type CatchUpdate = Updates<'catches'>;
export type CatchPublicRow = Views<'catches_public'>;
export type CatchPublicDetailRow = Views<'catches_public_detail'>;
export type ProfileStatsRow = Views<'profile_stats'>;
export type TopSpeciesRow = Database['public']['Functions']['get_top_species']['Returns'][number];

export type FollowRow = Tables<'follows'>;
export type LikeRow = Tables<'likes'>;
export type CommentRow = Tables<'comments'>;
export type XpTransactionRow = Tables<'xp_transactions'>;
export type BadgeDefinitionRow = Tables<'badge_definitions'>;
export type UserBadgeRow = Tables<'user_badges'>;
export type UserConsentRow = Tables<'user_consents'>;
export type GearCategoryRow = Tables<'gear_categories'>;
export type GearItemRow = Tables<'gear_items'>;
export type GearItemInsert = Inserts<'gear_items'>;
export type ReportRow = Tables<'reports'>;
export type NotificationRow = Tables<'notifications'>;
export type DeletionRequestRow = Tables<'deletion_requests'>;
export type UserPushTokenRow = Tables<'user_push_tokens'>;
export type DailyQuestionRow = Tables<'daily_questions'>;
export type DailyQuestionAnswerRow = Tables<'daily_question_answers'>;
export type DailyFishChallengeRow = Tables<'daily_fish_challenges'>;
export type DailyFishAnswerRow = Tables<'daily_fish_answers'>;
export type WeeklyChallengeRow = Tables<'weekly_challenges'>;
export type WeeklyChallengeEntryRow = Tables<'weekly_challenge_entries'>;
export type ConversationRow = Tables<'conversations'>;
export type MessageRow = Tables<'messages'>;
export type TournamentRow = Tables<'tournaments'>;
export type TournamentParticipantRow = Tables<'tournament_participants'>;
export type TournamentCatchRow = Tables<'tournament_catches'>;
export type CatchHighlightRow = Tables<'catch_highlights'>;
export type PostRow = Tables<'posts'>;
export type PostInsert = Inserts<'posts'>;
export type PostUpdate = Updates<'posts'>;
export type PostLikeRow = Tables<'post_likes'>;
export type PostCommentRow = Tables<'post_comments'>;
export type FishingLocationRow = Tables<'fishing_locations'>;
export type FishingLocationInsert = Inserts<'fishing_locations'>;
export type FishingLocationUpdate = Updates<'fishing_locations'>;
export type LocationLikeRow = Tables<'location_likes'>;
export type NotificationType = Database['public']['Enums']['notification_type'];
export type TournamentStatus = Database['public']['Enums']['tournament_status'];
export type PostType = Database['public']['Enums']['post_type'];
export type LocationType = Database['public']['Enums']['location_type'];

export interface FeedProfilePreview {
  username: string;
  avatar_url: string | null;
  level: number;
}

export interface FeedSpeciesPreview {
  name_tr: string;
}

export interface FishSpeciesOption {
  id: number;
  name: string;
  category: string | null;
}

export interface FishdexSpeciesProgress {
  species: FishSpeciesRow;
  discovered: boolean;
  catchCount: number;
  firstCaughtAt: string | null;
  biggestLengthCm: number | null;
  latestPhotoUrl: string | null;
}

export interface FishdexCategoryProgress {
  category: string;
  label: string;
  discovered: number;
  total: number;
}

export interface FishdexOverview {
  userId: string;
  totalSpecies: number;
  discoveredSpecies: number;
  completionPercent: number;
  nextMilestone: number | null;
  remainingToNextMilestone: number | null;
  categoryProgress: FishdexCategoryProgress[];
  species: FishdexSpeciesProgress[];
}

export interface FishdexSpeciesDetail {
  userId: string;
  species: FishSpeciesRow;
  discovered: boolean;
  catchCount: number;
  firstCaughtAt: string | null;
  biggestLengthCm: number | null;
  latestPhotoUrl: string | null;
}

export interface CatchFeedItem extends CatchPublicRow {
  profiles: FeedProfilePreview | null;
  fish_species: FeedSpeciesPreview | null;
  is_liked?: boolean;
}

export interface CommentProfilePreview {
  username: string;
  avatar_url: string | null;
}

export interface CommentListItem extends CommentRow {
  profiles: CommentProfilePreview | null;
}

export interface PostAuthorPreview {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
}

export interface PostCardItem extends PostRow {
  profiles: PostAuthorPreview | null;
  is_liked: boolean;
}

export interface PostComment extends PostCommentRow {
  profiles: CommentProfilePreview | null;
}

export interface PostDetail extends PostRow {
  profiles: PostAuthorPreview | null;
  is_liked: boolean;
}

export interface CatchDetail extends CatchRow {
  profiles: FeedProfilePreview | null;
  fish_species: FeedSpeciesPreview | null;
  is_liked: boolean;
}

export interface MapCatchItem {
  id: string;
  latitude: number;
  longitude: number;
  speciesName: string;
  lengthCm: number | null;
  photoUrl: string | null;
  username: string;
  createdAt: string;
}

export interface FishingLocationMapItem extends FishingLocationRow {
  latitude: number;
  longitude: number;
  is_liked: boolean;
  username: string | null;
}

export interface ConversationParticipant {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface ConversationItem extends ConversationRow {
  otherParticipant: ConversationParticipant;
  unreadCount: number;
}

export interface MessageItem extends MessageRow {
  sender: ConversationParticipant | null;
}

export interface TournamentListItem extends TournamentRow {
  participantCount: number;
}

export interface TournamentDetail extends TournamentRow {
  participantCount: number;
  isJoined: boolean;
  canSubmitCatch: boolean;
  creator: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  bestScore: number;
  submittedCatchCount: number;
}

export interface TournamentCatchCandidate {
  id: string;
  speciesName: string;
  lengthCm: number | null;
  weightG: number | null;
  createdAt: string;
}

export interface TournamentInsert {
  title: string;
  description?: string | null;
  city?: string | null;
  fishing_type?: string | null;
  scoring_type: string;
  starts_at: string;
  ends_at: string;
  max_participants?: number | null;
  prize_description?: string | null;
}

export interface HighlightItem extends CatchHighlightRow {
  photo_url: string | null;
  species_name: string;
  length_cm: number | null;
  created_at: string;
}

export interface FishingScoreFactor {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface TideEvent {
  time: string;
  type: 'high' | 'low';
  height: number;
}

export interface TideData {
  currentState: 'rising' | 'falling' | 'slack';
  nextEvent: TideEvent | null;
  events: TideEvent[];
}

export interface SpeciesRecommendation {
  speciesId: number;
  speciesName: string;
  confidence: number;
  reason: string;
  bestTime: 'morning' | 'midday' | 'evening' | 'night' | 'any';
}

export interface GoldenHourInfo {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  isActive: boolean;
  nextGoldenHour: string | null;
}

export interface BestFishingTime {
  time: string;
  score: number;
  label: string;
  reason: string;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
}

export interface HourlyWaveDatum {
  time: string;
  waveHeight: number;
  waveDirection: number;
  wavePeriod: number;
}

export interface HourlyForecastDatum {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  precipitationProbability: number | null;
  waveHeight: number | null;
}

export interface WeatherForecastDay {
  date: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  pressure: number;
  pressureTrend: 'rising' | 'falling' | 'stable' | null;
  humidity: number;
  weatherCode: number;
  weatherLabel: string;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  waveHeight: number | null;
  waveDirection: number | null;
  seaTemp: number | null;
  moonPhase: { phase: number; label: string; emoji: string };
  fishingScore: number;
  fishingScoreLabel: string;
  fishingScoreFactors: FishingScoreFactor[];
  tideData: TideData | null;
  goldenHour: GoldenHourInfo;
  bestTimes: BestFishingTime[];
  speciesRecommendations: SpeciesRecommendation[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  locationLabel: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  pressure: number;
  pressureTrend: 'rising' | 'falling' | 'stable' | null;
  humidity: number;
  weatherCode: number;
  weatherLabel: string;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  waveHeight: number | null;
  waveDirection: number | null;
  seaTemp: number | null;
  seaDepth: number | null;
  seaDepthSource: string | null;
  seaDepthIsApproximate: boolean;
  moonPhase: { phase: number; label: string; emoji: string };
  fishingScore: number;
  fishingScoreLabel: string;
  fishingScoreFactors: FishingScoreFactor[];
  dailyForecast: DailyForecastItem[];
  hourlyWaveData: HourlyWaveDatum[];
  hourlyForecastData: HourlyForecastDatum[];
  forecastDays: WeatherForecastDay[];
  tideData: TideData | null;
  goldenHour: GoldenHourInfo;
  bestTimes: BestFishingTime[];
  speciesRecommendations: SpeciesRecommendation[];
  tomorrowTrend: 'better' | 'worse' | 'same' | null;
}

export interface WeatherLocationSelection {
  latitude: number;
  longitude: number;
  label: string;
}

export interface FishIdResult {
  speciesName: string | null;
  speciesNameTr: string | null;
  confidence: number;
  description: string;
  funFact: string;
  isEdible: boolean;
  averageSize: string;
  iNaturalistId?: number;
  iNaturalistUrl?: string | null;
}

export interface AuthSessionState {
  session: Session | null;
}

export interface ConsentMeta {
  ip: string;
  userAgent: string;
}

export interface ConsentValues {
  kvkk: boolean;
  marketing: boolean;
}

export type FishingType = 'olta' | 'fly' | 'kiyi' | 'tekne' | 'buz';

export type LeaderboardType =
  | 'weekly_catch_count'
  | 'weekly_biggest_fish'
  | 'all_time_xp';

export type LeaderboardScope = 'country' | 'city';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  city: string | null;
  level: number;
  value: number;
}

export interface NotificationActorPreview {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface NotificationListItem extends NotificationRow {
  actor: NotificationActorPreview | null;
}

export interface GearCategoryItem extends GearCategoryRow {
  items: GearItemRow[];
}

export interface GearItemDetail extends GearItemRow {
  categoryMeta: GearCategoryRow | null;
}

export interface DailyQuestionResult {
  alreadyAnswered: boolean;
  chosenIndex: number;
  isCorrect: boolean | null;
  xpEarned: number;
}

export interface DailyFishChallengeResult {
  alreadyAnswered: boolean;
  isCorrect: boolean;
  correctOption: string;
  funFact: string | null;
  xpEarned: number;
}

export interface WeeklyChallengeEntryWithProfile extends WeeklyChallengeEntryRow {
  profiles: FeedProfilePreview | null;
}

export interface AdminStats {
  hasTodayQuestion: boolean;
  hasTodayFishChallenge: boolean;
  currentWeeklyChallengeTitle: string | null;
  activeUsers: number;
}

export interface DailyQuestionUpsert {
  question_tr: string;
  question_type: string;
  options: string[];
  correct_index?: number | null;
  reveal_at: string;
  source_note?: string | null;
}

export interface FishChallengeUpsert {
  catch_id?: string | null;
  photo_url: string;
  correct_species_id?: number | null;
  correct_species_name: string;
  options: string[];
  fun_fact_tr?: string | null;
}

export interface WeeklyChallengeInsert {
  week_start: string;
  title_tr: string;
  description_tr: string;
  challenge_type: string;
  target_species_id?: number | null;
  min_length_cm?: number | null;
  xp_reward?: number;
  badge_slug?: string | null;
  ends_at: string;
}

export interface ReportWithCatch extends ReportRow {
  reporter: { username: string } | null;
  catches: { id: string; photo_url: string | null } | null;
}
