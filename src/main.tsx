import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type CountCategory = "3PTM" | "PTS" | "REB" | "AST" | "ST" | "BLK" | "TO";
type PercentCategory = "FG%" | "FT%";
type Category = PercentCategory | CountCategory;
type DraftStatus = "available" | "mine" | "others";
type SortKey =
  | "rank"
  | "name"
  | "pos"
  | "team"
  | "total"
  | "fgImpact"
  | "ftImpact"
  | Category;

type Player = {
  id: string;
  name: string;
  pos: string;
  team: string;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  threes: number;
  pts: number;
  reb: number;
  ast: number;
  st: number;
  blk: number;
  to: number;
};

type RatedPlayer = Player & {
  rank: number;
  fgPct: number;
  ftPct: number;
  fgImpact: number;
  ftImpact: number;
  scores: Record<Category, number>;
  total: number;
  draftStatus: DraftStatus;
};

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const categories: Category[] = ["FG%", "FT%", "3PTM", "PTS", "REB", "AST", "ST", "BLK", "TO"];
const countCategories: CountCategory[] = ["3PTM", "PTS", "REB", "AST", "ST", "BLK", "TO"];

const emptyWeights: Record<Category, number> = {
  "FG%": 1,
  "FT%": 1,
  "3PTM": 1,
  PTS: 1,
  REB: 1,
  AST: 1,
  ST: 1,
  BLK: 1,
  TO: 1,
};

const sampleCsv = `Player,Pos,Team,FGM,FGA,FTM,FTA,3PTM,PTS,REB,AST,ST,BLK,TO
Nikola Jokic,C,DEN,11.1,18.8,5.2,6.3,1.2,28.6,12.7,9.9,1.4,0.8,3.4
Shai Gilgeous-Alexander,PG,OKC,10.5,20.3,7.8,8.8,2.1,30.9,5.6,6.5,1.8,0.9,2.4
Victor Wembanyama,PF/C,SAS,9.7,20.8,5.1,6.2,2.3,26.8,11.4,4.2,1.3,3.7,3.6
Luka Doncic,PG,LAL,10.2,22.3,6.8,8.7,4.1,31.3,8.8,9.2,1.4,0.5,3.9
Giannis Antetokounmpo,PF/C,MIL,12.4,21.1,7.1,11.0,0.4,32.3,11.9,6.4,1.2,1.1,3.5
Anthony Edwards,SG/SF,MIN,9.2,20.4,4.6,5.5,3.2,26.2,5.7,5.1,1.3,0.6,3.0
Jayson Tatum,SF/PF,BOS,9.0,19.8,5.3,6.3,3.1,26.4,8.6,4.8,1.1,0.6,2.7
Tyrese Haliburton,PG,IND,7.4,15.9,3.1,3.6,3.0,20.9,3.8,10.7,1.4,0.6,2.3
Stephen Curry,PG,GSW,8.4,18.9,4.5,4.9,4.6,25.9,4.4,6.2,1.0,0.4,3.1
Anthony Davis,PF/C,DAL,9.1,16.5,5.1,6.3,0.5,23.8,11.8,3.2,1.2,2.3,2.1
Trae Young,PG,ATL,8.0,18.5,7.2,8.1,3.0,26.2,3.0,10.5,1.3,0.2,4.1
Donovan Mitchell,PG/SG,CLE,9.1,20.0,4.4,5.1,3.4,26.0,4.8,5.5,1.5,0.4,2.8
LaMelo Ball,PG,CHA,8.4,20.2,4.2,4.9,3.7,24.7,5.2,8.1,1.6,0.3,3.6
Devin Booker,SG/SF,PHX,9.0,19.5,5.6,6.3,2.4,26.0,4.2,6.8,1.0,0.3,2.8
Jalen Brunson,PG,NYK,9.5,20.4,5.0,5.8,2.6,26.6,3.3,6.7,0.9,0.2,2.4
Bam Adebayo,C,MIA,7.4,14.4,4.5,5.7,0.2,19.5,10.4,4.1,1.1,0.9,2.3
Domantas Sabonis,PF/C,SAC,7.8,13.2,3.5,4.8,0.6,19.7,13.2,7.1,0.9,0.6,3.1
Jaren Jackson Jr.,PF/C,MEM,7.3,15.8,5.1,6.0,1.9,21.6,5.8,1.7,1.1,1.8,2.3
Mikal Bridges,SG/SF,NYK,6.6,14.2,2.5,3.0,2.4,18.1,4.1,3.5,1.1,0.6,1.6
Chet Holmgren,PF/C,OKC,7.1,13.9,3.1,3.7,1.7,19.0,8.9,2.8,0.8,2.4,2.1
Fred VanVleet,PG,HOU,6.1,15.0,3.0,3.5,3.0,18.2,3.9,7.9,1.5,0.7,2.0
Jamal Murray,PG/SG,DEN,7.7,16.6,3.1,3.5,2.6,21.1,4.0,6.2,1.0,0.6,2.2
De'Aaron Fox,PG,SAS,9.2,19.9,4.2,5.4,2.0,24.6,4.4,6.1,1.6,0.4,2.7
Evan Mobley,PF/C,CLE,7.0,12.9,3.3,4.4,0.7,18.0,9.4,3.3,0.9,1.7,2.1`;

const rosterSlots = ["PG", "SG", "G", "SF", "PF", "F", "C", "FC", "Util", "Util", "BN", "BN", "BN", "IL", "IL"];
const slotNeeds = rosterSlots.reduce<Record<string, number>>((acc, slot) => {
  acc[slot] = (acc[slot] ?? 0) + 1;
  return acc;
}, {});

const aliases: Record<string, string[]> = {
  name: ["player", "player name", "name"],
  pos: ["pos", "position", "positions"],
  team: ["team", "tm", "nba team"],
  fgm: ["fgm", "fg made", "field goals made"],
  fga: ["fga", "fg attempts", "field goals attempted"],
  ftm: ["ftm", "ft made", "free throws made"],
  fta: ["fta", "ft attempts", "free throws attempted"],
  threes: ["3ptm", "3pm", "3p", "3pt", "3-pointers made", "threepm"],
  pts: ["pts", "points"],
  reb: ["reb", "rebounds", "trb"],
  ast: ["ast", "assists"],
  st: ["st", "stl", "steals"],
  blk: ["blk", "blocks"],
  to: ["to", "tov", "turnovers"],
};

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field.trim());
      field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[%._-]/g, "").replace(/\s+/g, " ").trim();
}

function getValue(row: Record<string, string>, key: keyof typeof aliases): string {
  const normalized = new Map(Object.keys(row).map((header) => [normalizeHeader(header), row[header]]));
  const match = aliases[key].map(normalizeHeader).find((alias) => normalized.has(alias));
  return match ? normalized.get(match) ?? "" : "";
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsToPlayers(rows: Record<string, string>[]): Player[] {
  return rows
    .map((row, index) => ({
      id: `${getValue(row, "name") || "Player"}-${index}`,
      name: getValue(row, "name") || `Player ${index + 1}`,
      pos: getValue(row, "pos") || "Util",
      team: getValue(row, "team") || "-",
      fgm: toNumber(getValue(row, "fgm")),
      fga: toNumber(getValue(row, "fga")),
      ftm: toNumber(getValue(row, "ftm")),
      fta: toNumber(getValue(row, "fta")),
      threes: toNumber(getValue(row, "threes")),
      pts: toNumber(getValue(row, "pts")),
      reb: toNumber(getValue(row, "reb")),
      ast: toNumber(getValue(row, "ast")),
      st: toNumber(getValue(row, "st")),
      blk: toNumber(getValue(row, "blk")),
      to: toNumber(getValue(row, "to")),
    }))
    .filter((player) => player.name.trim().length > 0);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[]): number {
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) || 1;
}

function zScore(value: number, mean: number, sd: number): number {
  return (value - mean) / (sd || 1);
}

function statValue(player: Player, category: CountCategory): number {
  if (category === "3PTM") return player.threes;
  if (category === "PTS") return player.pts;
  if (category === "REB") return player.reb;
  if (category === "AST") return player.ast;
  if (category === "ST") return player.st;
  if (category === "BLK") return player.blk;
  return player.to;
}

function ratePlayers(
  players: Player[],
  weights: Record<Category, number>,
  clampNegatives: boolean,
  draftStatuses: Record<string, DraftStatus>,
): RatedPlayer[] {
  const firstPass = players.map((player) => {
    const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
    const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
    const proxyTotal =
      player.pts +
      player.reb * 1.2 +
      player.ast * 1.4 +
      player.st * 3 +
      player.blk * 3 +
      player.threes * 2 -
      player.to;
    return { player, proxyTotal, fgPct, ftPct };
  });

  const baseline = [...firstPass].sort((a, b) => b.proxyTotal - a.proxyTotal).slice(0, Math.min(150, firstPass.length));
  const fgAttempts = baseline.reduce((sum, item) => sum + item.player.fga, 0) || 1;
  const ftAttempts = baseline.reduce((sum, item) => sum + item.player.fta, 0) || 1;
  const leagueFg = baseline.reduce((sum, item) => sum + item.player.fgm, 0) / fgAttempts;
  const leagueFt = baseline.reduce((sum, item) => sum + item.player.ftm, 0) / ftAttempts;

  const fgImpacts = baseline.map((item) => (item.fgPct - leagueFg) * item.player.fga);
  const ftImpacts = baseline.map((item) => (item.ftPct - leagueFt) * item.player.fta);
  const fgMean = average(fgImpacts);
  const fgSd = standardDeviation(fgImpacts);
  const ftMean = average(ftImpacts);
  const ftSd = standardDeviation(ftImpacts);

  const countBaselines = countCategories.reduce<Record<CountCategory, { mean: number; sd: number }>>((acc, category) => {
    const values = baseline.map((item) => statValue(item.player, category));
    acc[category] = { mean: average(values), sd: standardDeviation(values) };
    return acc;
  }, {} as Record<CountCategory, { mean: number; sd: number }>);

  return firstPass
    .map(({ player, fgPct, ftPct }) => {
      const fgImpact = (fgPct - leagueFg) * player.fga;
      const ftImpact = (ftPct - leagueFt) * player.fta;
      const rawScores: Record<Category, number> = {
        "FG%": zScore(fgImpact, fgMean, fgSd),
        "FT%": zScore(ftImpact, ftMean, ftSd),
        "3PTM": zScore(player.threes, countBaselines["3PTM"].mean, countBaselines["3PTM"].sd),
        PTS: zScore(player.pts, countBaselines.PTS.mean, countBaselines.PTS.sd),
        REB: zScore(player.reb, countBaselines.REB.mean, countBaselines.REB.sd),
        AST: zScore(player.ast, countBaselines.AST.mean, countBaselines.AST.sd),
        ST: zScore(player.st, countBaselines.ST.mean, countBaselines.ST.sd),
        BLK: zScore(player.blk, countBaselines.BLK.mean, countBaselines.BLK.sd),
        TO: zScore(countBaselines.TO.mean - player.to, 0, countBaselines.TO.sd),
      };

      const scores = categories.reduce<Record<Category, number>>((acc, category) => {
        const score = clampNegatives ? Math.max(0, rawScores[category]) : rawScores[category];
        acc[category] = score * weights[category];
        return acc;
      }, {} as Record<Category, number>);

      return {
        ...player,
        fgPct,
        ftPct,
        fgImpact,
        ftImpact,
        scores,
        total: categories.reduce((sum, category) => sum + scores[category], 0),
        rank: 0,
        draftStatus: draftStatuses[player.id] ?? "available",
      };
    })
    .sort((a, b) => b.total - a.total)
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function formatPct(value: number): string {
  return value > 0 ? value.toFixed(3).replace(/^0/, "") : "-";
}

function eligibleSlots(pos: string): string[] {
  const positions = pos
    .split(/[\/, ]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const direct = new Set<string>();

  positions.forEach((position) => {
    if (["PG", "SG", "SF", "PF", "C"].includes(position)) direct.add(position);
    if (position === "PG" || position === "SG") direct.add("G");
    if (position === "SF" || position === "PF") direct.add("F");
    if (position === "PF" || position === "C") direct.add("FC");
  });

  direct.add("Util");
  return [...direct];
}

function buildRoster(players: RatedPlayer[]): Record<string, RatedPlayer[]> {
  const roster = Object.keys(slotNeeds).reduce<Record<string, RatedPlayer[]>>((acc, slot) => {
    acc[slot] = [];
    return acc;
  }, {});

  players
    .filter((player) => player.draftStatus === "mine")
    .sort((a, b) => b.total - a.total)
    .forEach((player) => {
      const options = eligibleSlots(player.pos).sort((a, b) => slotNeeds[a] - roster[a].length - (slotNeeds[b] - roster[b].length));
      const target = options.find((slot) => roster[slot].length < slotNeeds[slot]);
      if (target) {
        roster[target].push(player);
      } else if (roster.BN.length < slotNeeds.BN) {
        roster.BN.push(player);
      }
    });

  return roster;
}

function App() {
  const [players, setPlayers] = useState<Player[]>(() => rowsToPlayers(parseCsv(sampleCsv)));
  const [fileName, setFileName] = useState("sample projections");
  const [weights, setWeights] = useState<Record<Category, number>>(emptyWeights);
  const [clampNegatives, setClampNegatives] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, DraftStatus>>({});
  const [view, setView] = useState<"available" | "all" | "mine" | "others">("available");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "total", direction: "desc" });

  const ratedPlayers = useMemo(
    () => ratePlayers(players, weights, clampNegatives, draftStatuses),
    [players, weights, clampNegatives, draftStatuses],
  );

  const visiblePlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = ratedPlayers.filter((player) => {
      const statusMatch = view === "all" || player.draftStatus === view;
      const textMatch =
        !term ||
        player.name.toLowerCase().includes(term) ||
        player.team.toLowerCase().includes(term) ||
        player.pos.toLowerCase().includes(term);
      return statusMatch && textMatch;
    });

    return [...filtered].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (typeof left === "string" || typeof right === "string") {
        return String(left).localeCompare(String(right)) * direction;
      }
      return (left - Number(right)) * direction;
    });
  }, [ratedPlayers, search, sort, view]);

  const roster = useMemo(() => buildRoster(ratedPlayers), [ratedPlayers]);
  const mineCount = ratedPlayers.filter((player) => player.draftStatus === "mine").length;
  const othersCount = ratedPlayers.filter((player) => player.draftStatus === "others").length;
  const availableCount = ratedPlayers.length - mineCount - othersCount;

  function updateStatus(playerId: string, status: DraftStatus) {
    setDraftStatuses((current) => {
      const next = { ...current };
      if (status === "available") {
        delete next[playerId];
      } else {
        next[playerId] = status;
      }
      return next;
    });
  }

  function setSortKey(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function togglePunt(category: Category) {
    setWeights((current) => ({ ...current, [category]: current[category] === 0 ? 1 : 0 }));
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const imported = rowsToPlayers(parseCsv(text));
    if (imported.length) {
      setPlayers(imported);
      setFileName(file.name);
      setDraftStatuses({});
      setSearch("");
      setView("available");
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">14-team head-to-head 9-cat</p>
          <h1>NBA Fantasy Draft Dashboard</h1>
        </div>
        <label className="file-picker">
          <span>Load CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
      </section>

      <section className="summary-grid">
        <div className="metric">
          <span>Projection Source</span>
          <strong>{fileName}</strong>
        </div>
        <div className="metric">
          <span>Available</span>
          <strong>{availableCount}</strong>
        </div>
        <div className="metric">
          <span>My Team</span>
          <strong>{mineCount}/13</strong>
        </div>
        <div className="metric">
          <span>Drafted Others</span>
          <strong>{othersCount}</strong>
        </div>
      </section>

      <section className="controls-layout">
        <div className="panel">
          <div className="panel-heading">
            <h2>Punt Settings</h2>
            <label className="switch">
              <input
                type="checkbox"
                checked={clampNegatives}
                onChange={(event) => setClampNegatives(event.target.checked)}
              />
              <span>Ignore negative category scores</span>
            </label>
          </div>
          <div className="category-toggles">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={weights[category] === 0 ? "toggle punted" : "toggle"}
                onClick={() => togglePunt(category)}
              >
                <span>{category}</span>
                <b>{weights[category] === 0 ? "Punted" : "On"}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="panel roster-panel">
          <div className="panel-heading">
            <h2>Roster Slots</h2>
            <span className="muted">PG SG G SF PF F C FC Util Util BN BN BN IL IL</span>
          </div>
          <div className="roster-grid">
            {Object.entries(slotNeeds).map(([slot, count]) => (
              <div className="slot" key={slot}>
                <span>{slot}</span>
                <strong>
                  {roster[slot]?.length ?? 0}/{count}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="board">
        <div className="board-toolbar">
          <div className="tabs" aria-label="Board filter">
            {(["available", "all", "mine", "others"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={view === option ? "tab active" : "tab"}
                onClick={() => setView(option)}
              >
                {option === "available" ? "Available" : option === "mine" ? "Drafted by Me" : option === "others" ? "Drafted by Others" : "All"}
              </button>
            ))}
          </div>
          <input
            className="search"
            value={search}
            placeholder="Search player, team, or position"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <Header label="#" sortKey="rank" sort={sort} onSort={setSortKey} />
                <Header label="Player" sortKey="name" sort={sort} onSort={setSortKey} />
                <th>Draft</th>
                <Header label="Pos" sortKey="pos" sort={sort} onSort={setSortKey} />
                <Header label="Team" sortKey="team" sort={sort} onSort={setSortKey} />
                <Header label="Value" sortKey="total" sort={sort} onSort={setSortKey} />
                <Header label="FG%" sortKey="FG%" sort={sort} onSort={setSortKey} />
                <Header label="FT%" sortKey="FT%" sort={sort} onSort={setSortKey} />
                {countCategories.map((category) => (
                  <Header key={category} label={category} sortKey={category} sort={sort} onSort={setSortKey} />
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => (
                <tr key={player.id} className={player.draftStatus !== "available" ? "drafted" : ""}>
                  <td>{player.rank}</td>
                  <td>
                    <div className="player-cell">
                      <strong>{player.name}</strong>
                      <span>
                        FG {formatPct(player.fgPct)} on {formatNumber(player.fga)} FGA · FT {formatPct(player.ftPct)} on{" "}
                        {formatNumber(player.fta)} FTA
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="draft-actions">
                      <button type="button" onClick={() => updateStatus(player.id, "mine")}>
                        Me
                      </button>
                      <button type="button" onClick={() => updateStatus(player.id, "others")}>
                        Others
                      </button>
                      {player.draftStatus !== "available" && (
                        <button type="button" className="ghost" onClick={() => updateStatus(player.id, "available")}>
                          Undo
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{player.pos}</td>
                  <td>{player.team}</td>
                  <td className="value">{formatNumber(player.total, 2)}</td>
                  <Score value={player.scores["FG%"]} />
                  <Score value={player.scores["FT%"]} />
                  {countCategories.map((category) => (
                    <Score key={category} value={player.scores[category]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function sortValue(player: RatedPlayer, key: SortKey): number | string {
  if (key === "rank") return player.rank;
  if (key === "name") return player.name;
  if (key === "pos") return player.pos;
  if (key === "team") return player.team;
  if (key === "total") return player.total;
  if (key === "fgImpact") return player.fgImpact;
  if (key === "ftImpact") return player.ftImpact;
  return player.scores[key];
}

function Header({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const marker = sort.key === sortKey ? (sort.direction === "desc" ? "↓" : "↑") : "";
  return (
    <th>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label} <span>{marker}</span>
      </button>
    </th>
  );
}

function Score({ value }: { value: number }) {
  return <td className={value >= 0 ? "score positive" : "score negative"}>{formatNumber(value, 2)}</td>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
