// Prüft die Kurse in Lernpfad-Reihenfolge: Jeder Begriff muss vorher eingeführt sein,
// keine Vertröstungen auf später. node test/course.test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
for (const f of ['engine', 'content']) require('../src/' + f + '.js');
const C = globalThis.SCONTENT;

// Lernpfad-Reihenfolge (geführte Spiele: g1, g2, g3)
export const PATH = ['g1', 'g2', 'ueberblick', 'karten', 'trumpf', 'bedienen', 'stich', 'grandnull', 'skat', 'spitzen', 'spielwert', 'reizen', 'abrechnung', 'g3',
  'bewerten', 'druecken', 'alleinspieler', 'gegenspieler', 'nullspiel', 'mitzaehlen', 'zaehlen', 'grand', 'risiko'];
// Begriff → Einheit, in der er erklärt wird
export const TERMS = [
  [/\bGrand\b/, 'grandnull'], [/\bNull(spiel)?\b/, 'grandnull'],
  [/Spitzen|\b(mit|ohne) [1-9](?!\d)/, 'spitzen'],
  [/Spielwert|Grundwert|\bStufen?\b(?! \d)/, 'spielwert'],
  [/Reiz(en|wert|werte)|gereizt|\breizt\b|Mittelhand|Hinterhand|eingepasst|überreiz/, 'reizen'],
  [/drück|gedrückt|\bHand\b|Handspiel|Schneider|Schwarz/, 'skat'], [/Ouvert|ouvert|angesagt|ansagen/, 'spielwert'],
  [/Seeger/, 'abrechnung'],
  [/blank|Verlierer|Gewinnchance/, 'bewerten'],
  [/freispiel|Trumpf ziehen|\bstehen\b|\bsteht\b(?! zwischen)/, 'alleinspieler'],
  [/kurzer Weg|langer Weg|Kurzer Weg|Langer Weg/, 'gegenspieler'],
  [/Lückenregel/, 'nullspiel'],
  [/mitzähl|Mitzähl/, 'mitzaehlen'],
];
export const DEFER = /(kommt|lernst du|erfährst du)( das| es)? (erst |noch )?später|[Mm]ehr dazu später|lernst du (noch|in)|kommt noch|brauchst du erst|erst in Stufe|weißt du noch nicht/;
const strip = (t) => String(t).replace(/<[^>]+>/g, ' ').replace(/\{\{fr:[\s\S]*?\|de:/g, ' ').replace(/\}\}/g, ' ').replace(/\s+/g, ' ');
const problems = [];
for (const l of C.LESSONS) {
  const at = PATH.indexOf(l.id);
  if (at < 0) { problems.push('Lektion ' + l.id + ' fehlt im Lernpfad'); continue; }
  const texts = l.pages.map((p, i) => ['Seite ' + (i + 1), p]).concat(l.quiz.flatMap((q, i) => [['Quiz ' + (i + 1), q.q], ['Quiz ' + (i + 1), q.o.join(' / ')], ['Quiz ' + (i + 1) + ' Lösung', q.why]]));
  for (const [where, raw] of texts) {
    const t = strip(raw);
    for (const [re, intro] of TERMS) {
      const m = t.match(re);
      if (m && PATH.indexOf(intro) > at) problems.push(l.id + ' ' + where + ': „' + m[0] + '“ wird erst in „' + intro + '“ erklärt – „' + t.slice(Math.max(0, m.index - 40), m.index + 40).trim() + '“');
    }
    const d = t.match(DEFER);
    if (d) problems.push(l.id + ' ' + where + ': Vertröstung „' + d[0] + '“ – „' + t.slice(Math.max(0, d.index - 50), d.index + 40).trim() + '“');
  }
}
// Reihenfolge im Inhalt muss dem Lernpfad folgen
const order = C.LESSONS.map((l) => PATH.indexOf(l.id));
if (order.some((x, i) => i && x < order[i - 1])) problems.push('Reihenfolge der Lektionen in content.js weicht vom Lernpfad ab');
if (problems.length) { console.log(problems.join('\n')); console.log(problems.length + ' Probleme'); process.exit(1); }
console.log('Kurse: Reihenfolge und Begriffe ok (' + C.LESSONS.length + ' Lektionen)');
