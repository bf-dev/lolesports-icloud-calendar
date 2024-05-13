import axiod from "https://deno.land/x/axiod@0.26.2/mod.ts";
export enum EventType {
  Match = "match",
  Show = "show",
}

export enum Flag {
  HasVod = "hasVod",
  IsSpoiler = "isSpoiler",
  HasRecap = "hasRecap",
}

export enum Outcome {
  Loss = "loss",
  Win = "win",
}

export enum Provider {
  Trovo = "trovo",
  Twitch = "twitch",
  Youtube = "youtube",
}

export enum State {
  Completed = "completed",
  InProgress = "inProgress",
  Unstarted = "unstarted",
}

export enum StrategyType {
  BestOf = "bestOf",
  PlayAll = "playAll",
}

export interface DisplayPriority {
  position: number;
  status: string;
}

export interface League {
  id: string;
  slug: string;
  name: string;
  region: string;
  image: string;
  priority: number;
  displayPriority: DisplayPriority;
}

export interface EsportEvent {
  id: string;
  startTime: Date;
  state: State;
  type: EventType;
  blockName: string;
  league: League;
  match?: Match;
}

export interface Match {
  id: string;
  flags: Flag[];
  teams: Team[];
  strategy: Strategy;
}

export interface Pages {
  older: string;
  newer: string;
}

export interface Record {
  wins: number;
  losses: number;
}

export interface Result {
  outcome?: Outcome;
  gameWins: number;
}

export interface Schedule {
  events: EsportEvent[];
  pages: Pages;
}

export interface Strategy {
  type: StrategyType;
  count: number;
}

export interface Stream {
  parameter: string;
  locale: string;
  provider: Provider;
  countries: string[];
  offset: number;
}

export interface Team {
  name: string;
  code: string;
  image: string;
  result: Result;
  record: Record;
}

export interface Tournament {
  id: string;
}

export interface LolEsportsResponse<T> {
  data: T;
}

export class LolEsportsClient {
  private readonly httpClient: typeof axiod;
  private leagues: League[] | null = null;

  constructor(httpClient: typeof axiod) {
    this.httpClient = httpClient;
    this.getLeagues().then((leagues) => (this.leagues = leagues));
  }

  public async getLeagues(): Promise<League[]> {
    const response = await this.getData<
      LolEsportsResponse<{ leagues: League[] }>
    >("/persisted/gw/getLeagues" + this.queryString());
    this.leagues = response.data.leagues;
    return this.leagues;
  }

  public getLeagueByName(leagueName: string): League | null {
    if (!this.leagues) {
      return null;
    }
    return (
      this.leagues.find(
        (league) =>
          league.name === leagueName || league.slug === leagueName.toLowerCase()
      ) || null
    );
  }

  public async getSchedule(): Promise<EsportEvent[]> {
    const response = await this.getData<
      LolEsportsResponse<{ schedule: Schedule }>
    >("/persisted/gw/getSchedule" + this.queryString());
    return response.data.schedule.events;
  }

  public async getScheduleByLeague(league: League): Promise<EsportEvent[]> {
    const response = await this.getData<
      LolEsportsResponse<{ schedule: Schedule }>
    >("/persisted/gw/getSchedule" + this.queryString({ leagueId: league.id }));
    return response.data.schedule.events;
  }

  public async getAllScheduleByLeague(league: League): Promise<EsportEvent[]> {
    const events: EsportEvent[] = [];
    const initialResponse = await this.getData<
      LolEsportsResponse<{ schedule: Schedule }>
    >("/persisted/gw/getSchedule" + this.queryString({ leagueId: league.id }));
    events.push(...initialResponse.data.schedule.events);

    let older: null | string = initialResponse.data.schedule.pages.older;

    while (older) {
      const pageResponse: LolEsportsResponse<{ schedule: Schedule }> =
        await this.getData<LolEsportsResponse<{ schedule: Schedule }>>(
          "/persisted/gw/getSchedule" + this.queryString({ pageToken: older, leagueId: league.id })
        );

      events.push(...pageResponse.data.schedule.events);
      older = pageResponse.data.schedule.pages.older;
    }

    return events;
  }

  private async getData<T>(path: string): Promise<T> {
    const response = await this.httpClient.get<T>(path);
    return response.data;
  }

  private queryString(query: { [key: string]: string } = {}): string {
    const params = new URLSearchParams({ hl: "en-GB", ...query });
    return `?${params.toString()}`;
  }
}
