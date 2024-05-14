import axiod from "https://deno.land/x/axiod@0.26.2/mod.ts";
import { Event, Calendar } from "https://deno.land/x/simple_ics@0.1.1/mod.ts";
import { LolEsportsClient } from "./api.ts";
import { EsportEvent } from "./api.ts";

const requestClient = axiod.create({
  baseURL: "https://esports-api.lolesports.com",
  headers: {
    Referer: "https://lolesports.com/",
    "X-APi-Key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
  },
});

function addHoursToDate(date: Date, hoursToAdd: number): Date {
  const newDate = new Date(date);
  newDate.setTime(date.getTime() + hoursToAdd * 60 * 60 * 1000);
  return newDate;
}
function eventToIcs(event: EsportEvent): Event | null {
  if (!event.match) {
    return null;
  }
  const date = new Date(event.startTime);
  return new Event({
    title: `${event.match?.teams[0].code} vs ${event.match?.teams[1].code}`,
    beginDate: date,
    endDate: addHoursToDate(date, event.match.strategy.count * 0.5),
    desc: `${event.league.name} ${event.blockName}: ${event.match?.teams[0].name} ${event.match.teams[0].result.gameWins} : ${event.match.teams[0].result.gameWins} ${event.match?.teams[1].name}`,
    zone: "utc",
  });
}

if (import.meta.main) {
  const esportsClient = new LolEsportsClient(requestClient);
  const leagues = await esportsClient.getLeagues();
  leagues.forEach(async (league) => {
    const schedule = await esportsClient.getAllScheduleByLeague(league);
    //filter null
    const icsEvents = schedule
      .map(eventToIcs)
      .filter((event) => event !== null) as Event[];
    const calendar = new Calendar(icsEvents);
    const result = calendar.toString().split("\n");
    result.splice(2, 1, "PRODID:bf-dev/lolesports-icloud-calendar");
    result.splice(2, 0, `NAME:${league.name}`);
    result.splice(2, 0, `X-WR-CALNAME:${league.name}`);

    await Deno.writeTextFile(
      `./build/calendars/${league.slug}.ics`,
      result.join("\n")
    );
  });
  const calendarsInfo = leagues.map((league) => ({
    name: league.name,
    description: null,
    url: `https://lolesports.calendar.devbf.com/calendars/${league.slug}.ics`,
    image: league.image,
  }));

  await Deno.writeTextFile(
    `./build/calendars.json`,
    JSON.stringify(calendarsInfo, null, 2)
  );
}
