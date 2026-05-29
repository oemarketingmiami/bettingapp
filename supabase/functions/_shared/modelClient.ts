// Client for the Python forecasting service (§6). Pure fetch — works in Deno and
// Node. generate-card uses this to turn Elo ratings + market odds into edges.

export interface PredictResult {
  home_team: string;
  away_team: string;
  home_win_prob: number;
  away_win_prob: number;
  calibrated: boolean;
  model_version: string;
}

export interface EdgeOutcomeIn {
  label: string;
  model_prob: number;
  american_odds?: number;
  decimal_odds?: number;
}
export interface EdgeOutcomeOut extends EdgeOutcomeIn {
  decimal_odds: number;
  implied_prob: number;
  no_vig_prob: number;
  edge: number;
  ev_per_unit: number;
  recommend: boolean;
}
export interface EdgeResult { outcomes: EdgeOutcomeOut[]; market_hold: number }

async function post<T>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`model ${path} ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function predict(
  base: string,
  g: { home_team: string; away_team: string; home_rating: number; away_rating: number; neutral?: boolean },
): Promise<PredictResult> {
  return post<PredictResult>(base, "/v1/predict", { neutral: false, ...g });
}

export function computeEdge(base: string, outcomes: EdgeOutcomeIn[]): Promise<EdgeResult> {
  return post<EdgeResult>(base, "/v1/edge", { outcomes });
}
