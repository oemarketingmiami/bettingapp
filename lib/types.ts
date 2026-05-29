// Mirrors pick_schema.json — the card contract produced by generate-card.

export type SlateQuality = "Strong" | "Medium" | "Weak" | "Pass";
export type DayType = "straight" | "prop" | "parlay" | "pass";
export type CardType = "safer" | "aggressive" | "longshot" | "prop" | "total";
export type EdgeRating = "Small" | "Moderate" | "Strong" | "Elite";

export interface Pick {
  sport: string;
  matchup: string;
  market: string;
  pick: string;
  line_or_odds: string;
  card_type: CardType;
  bet_grade: number;
  est_win_prob: number;
  confidence: number;
  edge_rating: EdgeRating;
  suggested_units: number;
  reasoning: string;
  risk_flags: string[];
  alternatives_rejected?: string[];
}

export interface ParlayLeg {
  pick: string;
  grade: number;
  prob: number;
  justification: string;
}

export interface Parlay {
  legs: ParlayLeg[];
  weakest_leg: string;
  overall_risk: string;
}

export interface PayoutRow {
  stake: number;
  to_win: number;
  total_return: number;
}

export interface FinalVerdict {
  summary: string;
  best_bet: string;
  discipline_note: string;
}

export interface Card {
  slate_date: string;
  slate_quality: SlateQuality;
  day_type: DayType;
  five_leg_justified?: boolean;
  picks: Pick[];
  parlay?: Parlay | null;
  bets_to_avoid: { matchup: string; market: string; reason: string }[];
  payout_table: PayoutRow[];
  final_verdict: FinalVerdict;
}
