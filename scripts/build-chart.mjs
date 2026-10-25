import { writeFileSync, mkdirSync } from "node:fs";

const to = new Date();
const from = new Date(to.getTime() - 365 * 864e5);
const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){contributionsCollection(from:$from,to:$to){
    contributionCalendar{totalContributions
      weeks{contributionDays{date contributionCount weekday}}}}}}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: process.env.LOGIN, from: from.toISOString(), to: to.toISOString() } }),
});
const json = await res.json();
if (json.errors) { console.error(json.errors); process.exit(1); }

const cal = json.data.user.contributionsCollection.contributionCalendar;
const c = 12, g = 3, pad = 20;
const max = Math.max(1, ...cal.weeks.flatMap(w => w.contributionDays.map(d => d.contributionCount)));
const shade = n => n === 0 ? "var(--c0)" : `var(--c${Math.min(4, Math.ceil((4 * n) / max))})`;

let rects = "";
cal.weeks.forEach((w, x) => w.contributionDays.forEach(d => {
  rects += `<rect x="${pad + x * (c + g)}" y="${pad + d.weekday * (c + g)}" width="${c}" height="${c}" rx="2" fill="${shade(d.contributionCount)}"><title>${d.date}: ${d.contributionCount}</title></rect>`;
}));

const W = pad * 2 + cal.weeks.length * (c + g);
const H = pad * 2 + 7 * (c + g);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
  :root{--c0:#ebedf0;--c1:#9be9a8;--c2:#40c463;--c3:#30a14e;--c4:#216e39;--t:#57606a}
  @media (prefers-color-scheme: dark){:root{--c0:#161b22;--c1:#0e4429;--c2:#006d32;--c3:#26a641;--c4:#39d353;--t:#8b949e}}
  text{font:12px sans-serif;fill:var(--t)}
</style>
<text x="${pad}" y="14">${cal.totalContributions} contributions in the last year</text>
${rects}</svg>`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/contributions.svg", svg);
