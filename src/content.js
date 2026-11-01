/* Lerninhalte: Stufen, Lektionen, Taktik-Aufgaben.
 * Karten im Text: {kB} = Kreuz-Bube, {h10} = Herz-Zehn, {pA}, {d7} …  (k Kreuz, p Pik, h Herz, d Karo)
 * Kartenreihe: [[kB pB hB dB]]
 */
(function (G) {
  'use strict';

  const LEVELS = [
    { n: 1, name: 'Einsteiger', short: 'Grundlagen', desc: 'Karten, Trumpf, Bedienen, Stiche – die Regeln des Kartenspiels.' },
    { n: 2, name: 'Grundkenntnisse', short: 'Reizen & Werten', desc: 'Spitzen, Spielwert, Reizen, Skat und Abrechnung.' },
    { n: 3, name: 'Hobbyspieler', short: 'Taktik', desc: 'Blatt bewerten, drücken und die wichtigsten Spielzüge.' },
    { n: 4, name: 'Fortgeschritten', short: 'Mitzählen & Planen', desc: 'Augen und Karten zählen, Grand, Risiko.' },
    { n: 5, name: 'Ernstzunehmender Spieler', short: 'Am Tisch bestehen', desc: 'Ohne Hilfen sicher spielen und gewinnen.' },
  ];

  const LESSONS = [
    // ---------------- Stufe 1 ----------------
    {
      id: 'ueberblick', stage: 1, title: 'Worum geht es?', min: 3,
      pages: [
        'Skat spielen <b>drei Personen</b> mit <b>32 Karten</b>. Jeder bekommt 10 Karten. Zwei Karten liegen verdeckt in der Mitte – das ist der <b>Skat</b>.',
        'In jedem Spiel spielt einer allein, der <b>Alleinspieler</b>, gegen die beiden anderen. Die zwei <b>Gegenspieler</b> sind für dieses eine Spiel Partner.',
        'Wer Alleinspieler wird, entscheidet das <b>Reizen</b>: Wer sich das wertvollste Spiel zutraut, gewinnt es. Er darf den Skat aufnehmen, zwei Karten wieder ablegen („drücken“) und bestimmt, was Trumpf ist.',
        'Dann wird gespielt: Reihum legt jeder eine Karte, zusammen ist das ein <b>Stich</b>. Die höchste Karte gewinnt den Stich, ihr Besitzer spielt die nächste Karte aus. Nach 10 Stichen wird gezählt.',
        'Der Alleinspieler gewinnt, wenn seine Stiche mindestens <b>61 von 120 Augen</b> enthalten. Die gedrückten Karten zählen für ihn. Bei 60:60 haben die Gegenspieler gewonnen.',
      ],
      quiz: [
        { q: 'Wie viele Karten bekommt jeder Spieler?', o: ['8', '10', '12'], a: 1, why: '3 × 10 Karten + 2 im Skat = 32 Karten.' },
        { q: 'Wie viele Augen braucht der Alleinspieler zum Gewinnen?', o: ['60', '61', '90'], a: 1, why: 'Mit 61 hat er mehr als die Hälfte. 60:60 gewinnen die Gegenspieler.' },
        { q: 'Wer spielt zusammen?', o: ['Jeder gegen jeden', 'Die beiden Gegenspieler gegen den Alleinspieler', 'Immer dieselben zwei als Team'], a: 1, why: 'Die Partnerschaft gilt nur für das eine Spiel. Im nächsten Spiel kann jemand anderes Alleinspieler sein.' },
      ],
    },
    {
      id: 'karten', stage: 1, title: 'Karten und Augen', min: 4, drill: 'augen',
      pages: [
        'Es gibt vier Farben. Ihre Rangfolge (wichtig für Buben und Spielwert): <b>Kreuz</b> ♣ vor <b>Pik</b> ♠ vor <b>Herz</b> ♥ vor <b>Karo</b> ♦.<br>Diese App nutzt das Turnierbild mit vier Farben: Kreuz schwarz, Pik grün, Herz rot, Karo orange.',
        'Jede Farbe hat 8 Karten: Ass, Zehn, König, Dame, Bube, 9, 8 und 7. [[pA p10 pK pD pB p9 p8 p7]]',
        'Die Karten zählen <b>Augen</b>:<table class="pts"><tr><td>Ass</td><td>11</td></tr><tr><td>Zehn</td><td>10</td></tr><tr><td>König</td><td>4</td></tr><tr><td>Dame</td><td>3</td></tr><tr><td>Bube</td><td>2</td></tr><tr><td>9, 8, 7</td><td>0</td></tr></table>Pro Farbe sind das 30 Augen, im ganzen Spiel <b>120 Augen</b>.',
        'Ass und Zehn heißen <b>volle Karten</b> – um sie dreht sich fast alles. Die Karten ohne Augen (9, 8, 7) nennt man <b>Luschen</b>.',
      ],
      quiz: [
        { q: 'Wie viele Augen sind das? [[hA h10 hK]]', o: ['21', '25', '24'], a: 1, why: '11 + 10 + 4 = 25.' },
        { q: 'Was ist mehr wert: die Zehn oder der König?', o: ['Die Zehn', 'Der König', 'Beide gleich'], a: 0, why: 'Zehn = 10 Augen, König = 4 Augen.' },
        { q: 'Wie viele Augen hat das ganze Spiel?', o: ['100', '120', '160'], a: 1, why: '4 Farben × 30 Augen = 120.' },
      ],
    },
    {
      id: 'trumpf', stage: 1, title: 'Trumpf im Farbspiel', min: 5, drill: 'trumpf',
      pages: [
        'Im <b>Farbspiel</b> bestimmt der Alleinspieler eine Farbe als <b>Trumpf</b>, zum Beispiel Herz. Ein Trumpf schlägt jede Karte einer anderen Farbe.',
        'Die vier <b>Buben</b> sind immer die höchsten Trümpfe, egal welche Farbe Trumpf ist. Ihre Reihenfolge: [[kB pB hB dB]] Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube.',
        'Danach folgen die Karten der Trumpffarbe: Ass, Zehn, König, Dame, 9, 8, 7. Im Herzspiel gibt es also 4 Buben + 7 Herzkarten = <b>11 Trümpfe</b>: [[kB pB hB dB hA h10 hK hD h9 h8 h7]]',
        'Häufiger Anfängerfehler: Ein Bube gehört <b>nicht zu seiner Farbe</b>, sondern zum Trumpf. {pB} ist im Herzspiel ein Trumpf, keine Pik-Karte.',
        'Die anderen Farben heißen <b>Fehlfarben</b>. Dort gilt: Ass, Zehn, König, Dame, 9, 8, 7. Die Zehn steht also über dem König! Jede Fehlfarbe hat 7 Karten (ohne Bube).',
      ],
      quiz: [
        { q: 'Karospiel: Welche Karte ist höher?', o: ['{hB}', '{dA}'], a: 0, why: 'Jeder Bube steht über allen anderen Trümpfen, auch über dem Trumpf-Ass.' },
        { q: 'Wie viele Trümpfe gibt es in einem Farbspiel?', o: ['7', '10', '11'], a: 2, why: '4 Buben + 7 Karten der Trumpffarbe.' },
        { q: 'Pikspiel: Was ist {kB}?', o: ['Eine Kreuz-Karte', 'Der höchste Trumpf', 'Ein Trumpf, aber unter dem Pik-Ass'], a: 1, why: 'Der Kreuz-Bube ist in jedem Farbspiel und im Grand der höchste Trumpf.' },
        { q: 'Kreuzspiel, Herz wird ausgespielt: Was ist höher – {h10} oder {hK}?', o: ['{h10}', '{hK}'], a: 0, why: 'In den Fehlfarben steht die Zehn direkt unter dem Ass.' },
      ],
    },
    {
      id: 'bedienen', stage: 1, title: 'Bedienen und Stechen', min: 5, drill: 'bedienen',
      pages: [
        'Wer ausspielt, darf jede Karte legen. Die anderen müssen <b>bedienen</b>: die ausgespielte Farbe legen, wenn sie eine haben.',
        'Wird <b>Trumpf</b> ausgespielt, muss man Trumpf bedienen – auch ein Bube zählt als Trumpf. Wird eine Fehlfarbe ausgespielt, gehört der Bube dieser Farbe nicht dazu: Mit {pB} kann man im Herzspiel kein Pik bedienen.',
        'Wer die Farbe nicht hat, darf <b>stechen</b> (einen Trumpf legen) oder <b>abwerfen</b> (irgendeine andere Karte). Es gibt keinen Stichzwang: Man muss weder stechen noch höher spielen.',
        'Beispiel im Kreuzspiel: {hA} wird ausgespielt. Du hast [[hK h7 kB pA]] Du musst Herz bedienen, also {hK} oder {h7}. Der Kreuz-Bube ist Trumpf, kein Herz.',
      ],
      quiz: [
        { q: 'Kreuzspiel, ausgespielt wird {p10}. Du hast [[pB hA k7]] Welche Karten darfst du legen?', o: ['Nur {pB}', 'Alle drei', 'Nur {k7}'], a: 1, why: '{pB} ist Trumpf, keine Pik-Karte. Du hast also kein Pik und darfst jede Karte legen.' },
        { q: 'Grand, ausgespielt wird {kA}. Du hast [[kB k9 hA]] Was darfst du legen?', o: ['{kB} oder {k9}', 'Nur {k9}', 'Jede Karte'], a: 1, why: 'Im Grand sind die Buben Trumpf. Kreuz bedienst du nur mit {k9}.' },
        { q: 'Du hast die ausgespielte Farbe nicht. Musst du stechen?', o: ['Ja, immer', 'Nein, du darfst auch abwerfen', 'Nur wenn Punkte im Stich liegen'], a: 1, why: 'Im Skat gibt es keinen Stichzwang.' },
      ],
    },
    {
      id: 'stich', stage: 1, title: 'Wer bekommt den Stich?', min: 4, drill: 'stich',
      pages: [
        'Den Stich gewinnt der <b>höchste Trumpf</b>. Liegt kein Trumpf im Stich, gewinnt die <b>höchste Karte der ausgespielten Farbe</b>.',
        'Eine abgeworfene Karte einer anderen Fehlfarbe kann nie gewinnen – auch kein Ass.',
        'Herzspiel: [[pK pA h7]] Die Herz-7 gewinnt, denn sie ist Trumpf.<br>Herzspiel: [[pK p10 kA]] Die Pik-Zehn gewinnt. Das Kreuz-Ass wurde nur abgeworfen.',
        'Wer den Stich gewinnt, spielt als Nächstes aus. Den <b>ersten Stich</b> spielt immer <b>Vorhand</b> aus, der Spieler links vom Geber.',
      ],
      quiz: [
        { q: 'Pikspiel: [[hA hK dB]] Wer gewinnt?', o: ['{hA}', '{hK}', '{dB}'], a: 2, why: 'Der Karo-Bube ist Trumpf.' },
        { q: 'Grand: [[d9 kA d10]] Wer gewinnt?', o: ['{d9}', '{kA}', '{d10}'], a: 2, why: 'Karo wurde ausgespielt. Das Kreuz-Ass ist abgeworfen, die Karo-Zehn ist die höchste Karo-Karte.' },
        { q: 'Wer spielt den ersten Stich aus?', o: ['Der Geber', 'Vorhand', 'Der Alleinspieler'], a: 1, why: 'Immer Vorhand – egal, wer Alleinspieler ist.' },
      ],
    },
    {
      id: 'grandnull', stage: 1, title: 'Grand und Null', min: 4,
      pages: [
        '<b>Grand</b>: Nur die vier Buben sind Trumpf. Alle vier Farben sind Fehlfarben mit der Reihenfolge Ass, Zehn, König, Dame, 9, 8, 7. Der Grand ist das wertvollste Spiel.',
        '<b>Null</b>: Es gibt keine Trümpfe. Der Alleinspieler gewinnt, wenn er <b>keinen einzigen Stich</b> bekommt. Augen spielen keine Rolle.',
        'Im Null gilt die „natürliche“ Reihenfolge: [[hA hK hD hB h10 h9 h8 h7]] Der Bube gehört wieder zu seiner Farbe und steht zwischen Dame und Zehn.',
        'Merke: Im Null ist die <b>7 die kleinste</b> Karte jeder Farbe. Wer viele niedrige Karten hat, kann gut Null spielen.',
      ],
      quiz: [
        { q: 'Wie viele Trümpfe gibt es im Grand?', o: ['4', '11', 'keine'], a: 0, why: 'Nur die vier Buben.' },
        { q: 'Null: Was ist höher – {h10} oder {hB}?', o: ['{h10}', '{hB}'], a: 1, why: 'Im Null: A K D B 10 9 8 7.' },
        { q: 'Wann gewinnt der Alleinspieler ein Nullspiel?', o: ['Mit 61 Augen', 'Wenn er keinen Stich bekommt', 'Wenn er alle Stiche bekommt'], a: 1, why: 'Ein einziger Stich – und das Nullspiel ist verloren.' },
      ],
    },
    // ---------------- Stufe 2 ----------------
    {
      id: 'spitzen', stage: 2, title: 'Spitzen: mit und ohne', min: 5, drill: 'spitzen',
      pages: [
        'Der Wert eines Spiels hängt von den <b>Spitzen</b> ab: den höchsten Trümpfen in ununterbrochener Reihe, beginnend mit dem Kreuz-Buben.',
        'Hast du den Kreuz-Buben, spielst du <b>„mit“</b>. Zähle die Trümpfe von oben ohne Lücke: [[kB pB dB]] Kreuz- und Pik-Bube, dann fehlt der Herz-Bube: <b>mit 2</b>.',
        'Fehlt der Kreuz-Bube, spielst du <b>„ohne“</b>: Zähle, wie viele Trümpfe von oben fehlen. Dein höchster Trumpf ist {hB}? Dann fehlen Kreuz- und Pik-Bube: <b>ohne 2</b>.',
        'Im Farbspiel geht die Reihe nach den Buben mit Ass, Zehn, König … der Trumpffarbe weiter. Alle vier Buben plus Trumpf-Ass ergeben „mit 5“. Im Grand zählen nur die Buben: höchstens mit 4 oder ohne 4.',
        'Die zwei <b>Skatkarten zählen mit</b>, auch beim Handspiel. Liegt der Kreuz-Bube im Skat, spielst du „mit“.',
      ],
      quiz: [
        { q: 'Herzspiel. Deine Trümpfe: [[kB pB dB hA h9]] Wie viele Spitzen?', o: ['mit 2', 'mit 3', 'mit 4'], a: 0, why: 'Kreuz- und Pik-Bube, dann fehlt der Herz-Bube.' },
        { q: 'Kreuzspiel. Deine Trümpfe: [[pB hB kA k8]] Wie viele Spitzen?', o: ['mit 1', 'ohne 1', 'ohne 2'], a: 1, why: 'Nur der Kreuz-Bube fehlt, der Pik-Bube ist da.' },
        { q: 'Kreuzspiel. Deine Trümpfe: [[dB kA k10]] Wie viele Spitzen?', o: ['ohne 3', 'ohne 4', 'mit 1'], a: 0, why: 'Kreuz-, Pik- und Herz-Bube fehlen.' },
      ],
    },
    {
      id: 'spielwert', stage: 2, title: 'Der Spielwert', min: 5, drill: 'spielwert',
      pages: [
        '<div class="formula">Spielwert = Stufen × Grundwert</div>',
        '<b>Grundwerte</b>: Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24.',
        '<b>Stufen</b> = Spitzen + 1 für das Spiel. Dazu je eine Stufe für: Hand, Schneider, Schneider angesagt, Schwarz, Schwarz angesagt, Ouvert.',
        'Beispiel: Kreuz mit 2 → (2 + 1) × 12 = <b>36</b>. Holt der Alleinspieler zusätzlich Schneider: (2 + 1 + 1) × 12 = 48.',
        '<b>Nullspiele</b> haben feste Werte: Null 23, Null Hand 35, Null ouvert 46, Null ouvert Hand 59.',
      ],
      quiz: [
        { q: 'Pik ohne 3 – wie viel ist das Spiel wert?', o: ['33', '44', '36'], a: 1, why: '(3 + 1) × 11 = 44.' },
        { q: 'Grand mit 1, Hand gespielt?', o: ['48', '72', '96'], a: 1, why: '(1 Spitze + 1 Spiel + 1 Hand) × 24 = 72.' },
        { q: 'Karo mit 1, normal gespielt?', o: ['18', '20', '9'], a: 0, why: '(1 + 1) × 9 = 18 – das ist der kleinste Reizwert.' },
      ],
    },
    {
      id: 'reizen', stage: 2, title: 'Reizen', min: 6, drill: 'reizwerte',
      pages: [
        'Beim Reizen nennt man Spielwerte. Wer am höchsten geht, wird Alleinspieler. Sein Spiel muss am Ende <b>mindestens so viel wert sein wie der Reizwert</b>.',
        'Die Reizwerte sind die möglichen Spielwerte: <b>18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60 …</b>',
        'Die Plätze: Links vom Geber sitzt <b>Vorhand</b>, dann <b>Mittelhand</b>, dann <b>Hinterhand</b> (der Geber selbst). Mittelhand <b>sagt</b> Werte zu Vorhand. Vorhand <b>hört</b> und antwortet „Ja“ oder „Passe“.',
        'Wer passt, ist raus. Dann sagt Hinterhand dem Übriggebliebenen weiter. Passen Mittel- und Hinterhand sofort, darf Vorhand für 18 spielen. Passt auch Vorhand, wird <b>eingepasst</b> und neu gegeben.',
        'Rechne vor dem Reizen den Wert deines besten Spiels aus. Darüber solltest du nicht gehen, sonst <b>überreizt</b> du dich und verlierst.',
      ],
      quiz: [
        { q: 'Welcher Reizwert kommt nach 24?', o: ['25', '27', '30'], a: 1, why: '27 = Karo mit 2 (3 × 9).' },
        { q: 'Wer sagt beim Reizen zuerst?', o: ['Vorhand', 'Mittelhand', 'Hinterhand'], a: 1, why: 'Mittelhand sagt, Vorhand hört.' },
        { q: 'Dein bestes Spiel ist Kreuz mit 1. Bis wohin kannst du reizen?', o: ['18', '24', '36'], a: 1, why: '(1 + 1) × 12 = 24.' },
      ],
    },
    {
      id: 'skat', stage: 2, title: 'Skat, Drücken, Hand', min: 5,
      pages: [
        'Der Alleinspieler darf den <b>Skat aufnehmen</b>. Dann hat er 12 Karten und legt zwei beliebige verdeckt wieder ab: Er <b>drückt</b> sie. Die gedrückten Augen gehören ihm.',
        'Er kann auch auf den Skat verzichten und <b>Hand</b> spielen. Das bringt eine Stufe mehr, aber er spielt mit den Karten, die er hat.',
        'Nur beim Handspiel darf man zusätzlich <b>Schneider ansagen</b> (mindestens 90 Augen) oder <b>Schwarz ansagen</b> (alle Stiche). Jede Ansage gibt eine weitere Stufe – man muss sie aber auch schaffen.',
        '<b>Ouvert</b> heißt: Der Alleinspieler legt seine Karten offen auf den Tisch. Farb- und Grand-Ouvert sind nur als Hand möglich und gelten als Schwarz angesagt. Null ouvert geht auch mit Skat.',
        'Schneider und Schwarz zählen auch <b>ohne Ansage</b> als Stufe, wenn sie eintreten – für oder gegen den Alleinspieler.',
      ],
      quiz: [
        { q: 'Darf man Schneider ansagen, wenn man den Skat aufgenommen hat?', o: ['Ja', 'Nein, nur beim Handspiel'], a: 1, why: 'Ansagen gibt es nur beim Handspiel.' },
        { q: 'Wem gehören die Augen der gedrückten Karten?', o: ['Dem Alleinspieler', 'Den Gegenspielern', 'Niemandem'], a: 0, why: 'Der Skat zählt am Ende für den Alleinspieler.' },
        { q: 'Ab wie vielen Augen ist der Alleinspieler Schneider-Gewinner?', o: ['61', '90', '100'], a: 1, why: 'Die Gegner haben dann höchstens 30 Augen.' },
      ],
    },
    {
      id: 'abrechnung', stage: 2, title: 'Gewinnen, Verlieren, Überreizen', min: 5,
      pages: [
        'Gewinnt der Alleinspieler, bekommt er den Spielwert gutgeschrieben. Verliert er, werden ihm <b>doppelt</b> so viele Punkte abgezogen.',
        '<b>Überreizt</b>: Ist das Spiel weniger wert als gereizt, ist es verloren – auch mit 61 Augen. Abgezogen wird das nächste Vielfache des Grundwerts, das den Reizwert erreicht. Beispiel: gereizt 33, Herz ohne 2 (Wert 30) → verloren mit 40, also −80.',
        'In Vereinen und Turnieren rechnet man nach <b>Seeger-Fabian</b>: Für ein gewonnenes Spiel gibt es zusätzlich 50 Punkte, für ein verlorenes werden 50 abgezogen. Verliert der Alleinspieler, bekommen die Gegenspieler am Dreiertisch je 40 Punkte.',
        'Folgerung: Weil Verluste doppelt zählen, lohnt sich ein Spiel erst, wenn du es <b>in etwa zwei von drei Fällen</b> gewinnst.',
      ],
      quiz: [
        { q: 'Herz ohne 2, gereizt bis 30, gewonnen mit 65 Augen. Wie viele Punkte?', o: ['+30', '+60', '+20'], a: 0, why: '(2 + 1) × 10 = 30, gewonnen.' },
        { q: 'Pik mit 2 (Wert 33) verloren. Wie viele Punkte?', o: ['−33', '−66', '−44'], a: 1, why: 'Verlorene Spiele zählen doppelt.' },
        { q: 'Gereizt 27, gespielt Karo mit 1 (Wert 18), 70 Augen. Ergebnis?', o: ['Gewonnen, +18', 'Verloren, überreizt', 'Gewonnen, +27'], a: 1, why: 'Das Spiel ist nur 18 wert. Verloren mit 27 (3 × 9), also −54.' },
      ],
    },
    // ---------------- Stufe 3 ----------------
    {
      id: 'bewerten', stage: 3, title: 'Ein Blatt bewerten', min: 6, drill: 'reizen',
      pages: [
        'Faustregel für ein <b>Farbspiel</b>: mindestens <b>5 Trümpfe</b>, möglichst mit 2 Buben, dazu 1–2 <b>Asse</b>. Je mehr Trümpfe, desto weniger brauchst du sonst.',
        'Zähle deine <b>Verlierer</b>: Karten, die wahrscheinlich an die Gegner gehen. Ein Ass steht, Ass und Zehn sind zwei sichere Stiche. Eine <b>blanke Zehn</b> (ohne weitere Karte der Farbe) ist gefährlich: Das Ass der Gegner holt sie.',
        'Eine <b>Fehlfarbe, die du nicht hast</b>, ist gut: Dort kannst du stechen – wenn du genug Trümpfe hast.',
        '<b>Grand</b>: meist ab 2 Buben (am besten mit Kreuz-Bube) und mehreren Assen, Zehnen oder einer langen Farbe. Mit 3–4 Buben reichen oft zwei Asse.',
        '<b>Null</b>: niedrige Karten ohne große Lücken in jeder Farbe, die du hast. Im Lernmodus zeigt dir diese App beim Reizen eine geschätzte Gewinnchance – berechnet aus Tausenden simulierten Spielen.',
      ],
      quiz: [
        { q: 'Was ist am gefährlichsten für ein Farbspiel?', o: ['Eine Fehlfarbe, die man nicht hat', 'Eine blanke Zehn', 'Ein Ass mit Zehn'], a: 1, why: 'Die blanke Zehn fällt meist unter das Ass der Gegner.' },
        { q: 'Du hast [[kB hB dB pA p10 p9 p7 h9 dK d8]] Welches Spiel passt am besten?', o: ['Pik', 'Grand', 'Null'], a: 0, why: '7 Trümpfe in Pik (3 Buben, Ass, Zehn, 9, 7). Für einen Grand fehlen die Asse, für Null die niedrigen Karten.' },
      ],
    },
    {
      id: 'druecken', stage: 3, title: 'Richtig drücken', min: 5, drill: 'druecken',
      pages: [
        'Ziele beim Drücken:<br>1. <b>Augen sichern</b>: volle Karten, die sonst verloren gingen, in den Skat.<br>2. Eine Fehlfarbe <b>blank machen</b>, damit du dort stechen kannst.<br>3. <b>Gefährliche Karten</b> loswerden, etwa eine blanke Zehn oder einen einzelnen König.',
        'Drücke <b>keine Trümpfe</b> und keine Asse, die selbst einen Stich machen.',
        'Beispiel: Du spielst Kreuz und hast in Pik nur {p10} {pK}. Drückst du beide, ist Pik frei: 14 Augen sind sicher, und Pik kannst du stechen.',
        'Im <b>Null</b> drückst du die gefährlichsten hohen Karten, vor allem aus Farben mit Lücken.',
      ],
      quiz: [
        { q: 'Kreuzspiel. Was drückst du am ehesten?', o: ['{kA} und {k10}', '{p10} und {pK} (dein einziges Pik)', '{hA} und {h7}'], a: 1, why: 'Pik wird blank und 14 Augen sind gesichert.' },
        { q: 'Sollte man im Farbspiel einen Buben drücken?', o: ['Ja, für 2 Augen', 'Fast nie – Buben sind die stärksten Trümpfe'], a: 1, why: 'Trümpfe gewinnen Stiche. Gedrückte Buben zählen außerdem weiter bei den Spitzen.' },
      ],
    },
    {
      id: 'alleinspieler', stage: 3, title: 'Als Alleinspieler', min: 6,
      pages: [
        '<b>Trumpf ziehen</b>: Mit vielen Trümpfen spielst du früh Trumpf aus, am besten den höchsten. Die Gegner müssen bedienen und verlieren ihre Trümpfe. Danach sind deine Asse und Zehnen sicher.',
        'Zähle dabei die Trümpfe: 11 im Farbspiel, 4 im Grand. Haben die Gegner keine mehr, hörst du auf und spielst deine Nebenfarben.',
        'Hast du eher wenige Trümpfe, ziehe zuerst deine <b>Asse</b>, solange beide Gegner noch bedienen können. Später werden sie gestochen.',
        '<b>Farbe freispielen</b>: Aus einer langen Fehlfarbe gibst du früh kleine Karten ab. Sind die hohen Karten gefallen, stehen deine restlichen.',
        'Eine <b>Zehn ohne Ass</b> spielst du nicht selbst aus. Warte, bis das Ass gefallen ist – dann ist deine Zehn die höchste Karte ihrer Farbe.',
        'Bist du als Letzter dran und kannst gewinnen, nimm die <b>kleinste Karte, die reicht</b>. Mit der Trumpf-7 zu stechen ist besser als mit einem Buben.',
      ],
      quiz: [
        { q: 'Du hast [[kB pB hB kA k10 k9]] in Kreuz und Asse in zwei Farben. Was spielst du zuerst?', o: ['Ein Ass', 'Einen hohen Buben (Trumpf ziehen)', 'Eine Lusche'], a: 1, why: 'Mit so starken Trümpfen holst du zuerst die gegnerischen Trümpfe heraus.' },
        { q: 'Herzspiel, du bist Letzter. Im Stich: [[pA p10]] Du hast kein Pik. Womit stichst du?', o: ['{kB}', '{h7}', '{hA}'], a: 1, why: 'Die kleinste Karte, die gewinnt. Die 21 Augen gehören dir trotzdem.' },
      ],
    },
    {
      id: 'gegenspieler', stage: 3, title: 'Als Gegenspieler', min: 7, drill: 'schmieren',
      pages: [
        'Als Gegenspieler seid ihr zu zweit. Die wichtigste Technik ist <b>Schmieren</b>: Gewinnt dein Partner einen Stich sicher, gibst du eine volle Karte dazu, ein Ass oder eine Zehn.',
        'Umgekehrt: Bekommt der Alleinspieler den Stich, gib ihm so wenig Augen wie möglich, eine Lusche.',
        'Sicher ist ein Stich erst, wenn der Alleinspieler ihn nicht mehr bekommen kann. Kommt er nach dir noch dran, schmierst du lieber nicht.',
        '<b>Kurzer Weg – lange Farbe, langer Weg – kurze Farbe</b>: Sitzt der Alleinspieler direkt hinter dir (kurzer Weg), spielst du deine lange Farbe aus. Sitzt er am Ende des Stichs (langer Weg), spielst du eine kurze Farbe – bald kannst du sie stechen.',
        'Spiel als Gegenspieler <b>selten Trumpf</b> aus, damit hilfst du dem Alleinspieler. Und hol deine <b>Asse früh</b>, bevor der Alleinspieler die Farbe stechen kann.',
      ],
      quiz: [
        { q: 'Kreuzspiel. Dein Partner hat {hA} ausgespielt, der Alleinspieler gab {h7}. Du bist Letzter mit [[h10 hK p9]] Was spielst du?', o: ['{h10}', '{hK}', '{p9}'], a: 0, why: 'Der Stich gehört euch sicher: Schmier die Zehn. ({p9} darfst du nicht – du musst Herz bedienen.)' },
        { q: 'Der Alleinspieler sitzt direkt hinter dir. Welche Farbe spielst du aus?', o: ['Eine lange Farbe', 'Eine kurze Farbe', 'Trumpf'], a: 0, why: 'Kurzer Weg – lange Farbe.' },
      ],
    },
    {
      id: 'nullspiel', stage: 3, title: 'Nullspiele', min: 6,
      pages: [
        'Als Alleinspieler im Null bleibst du in jedem Stich <b>unter der höchsten Karte</b>. Kannst du drunter bleiben, nimm die <b>höchste Karte, die noch passt</b>. So wirst du gefährliche Karten los.',
        'Bist du in einer Farbe frei, wirf deine <b>gefährlichste Karte</b> ab: eine hohe Karte aus einer Farbe mit Lücke.',
        '<b>Lückenregel</b>: Sortiere eine Farbe aufsteigend. Die kleinste Karte sollte die 7 sein, die zweite höchstens die 9, die dritte höchstens der Bube, die vierte höchstens der König. Dann bist du in dieser Farbe sicher. [[h7 h9 hB]] ist sicher, [[h8 h10]] nicht.',
        'Gegen Null: Spielt <b>niedrige Karten</b> in Farben, die der Alleinspieler noch hat. Liegt der Alleinspieler im Stich vorn, bleibt drunter. Wirf hohe Karten ab, behalte niedrige.',
      ],
      quiz: [
        { q: 'Null, du bist Alleinspieler. Im Stich liegt {hD}. Du hast [[hK hB h7]] Was spielst du?', o: ['{hK}', '{hB}', '{h7}'], a: 1, why: 'Der Bube bleibt unter der Dame und ist deine gefährlichere Karte. Die 7 hebst du auf.' },
        { q: 'Welche Farbe ist im Null sicher?', o: ['[[h7 h9 hB]]', '[[h8 h9 h10]]', '[[hA]]'], a: 0, why: 'Ohne die 7 kann man dich zwingen, mit der 8 zu gewinnen. Ein blankes Ass verliert sicher, wenn die Farbe gespielt wird.' },
      ],
    },
    // ---------------- Stufe 4 ----------------
    {
      id: 'mitzaehlen', stage: 4, title: 'Augen mitzählen', min: 5, drill: 'mitzaehlen',
      pages: [
        'Starke Spieler wissen jederzeit, wie viele Augen jede Seite hat. Nur so weißt du, ob noch geschmiert werden muss, ob 61 erreicht sind oder ob Schneider droht.',
        'Methode: Zähle nach jedem Stich nur die Augen der Seite, die ihn bekommt, und addiere sie im Kopf. Häufige Stiche: Ass + Zehn + Lusche = 21, Ass + König + Dame = 18.',
        'Als Alleinspieler rechnest du die gedrückten Augen von Anfang an dazu.',
        'Merkpunkte: <b>31</b> (Gegenspieler sind aus dem Schneider), <b>61</b> (Spiel gewonnen), <b>90</b> (Schneider). Ab dort kannst du anders spielen.',
        'Übung im Spiel: Im Profi-Modus fragt dich die App mitten im Spiel nach dem Spielstand – ohne Augenanzeige.',
      ],
      quiz: [
        { q: 'Stiche des Alleinspielers: [[hA h10 h7]] und [[kK kD k9]] Wie viele Augen?', o: ['28', '25', '31'], a: 0, why: '21 + 7 = 28.' },
        { q: 'Ab wie vielen Augen sind die Gegenspieler „aus dem Schneider“?', o: ['30', '31', '61'], a: 1, why: 'Mit 31 Augen kann der Alleinspieler höchstens 89 bekommen.' },
      ],
    },
    {
      id: 'zaehlen', stage: 4, title: 'Trümpfe und Farben zählen', min: 6, drill: 'truempfe',
      pages: [
        'Zähle die <b>Trümpfe</b>: 11 im Farbspiel, 4 im Grand. Rechnung: 11 − deine − gefallene = noch bei den Gegnern (oder im Skat).',
        'Zähle die <b>Fehlfarben</b>: Jede hat 7 Karten. Merke dir, wer <b>frei</b> ist: Wer nicht bedient, hat die Farbe nicht mehr – das ist sicheres Wissen.',
        'Daraus folgen Entscheidungen: Kann der letzte Spieler noch stechen? Ist meine Zehn jetzt die höchste Karte – „steht“ sie?',
        'Tipp: Zähle nicht jede Karte einzeln. Merke dir pro Farbe nur, wie viele gefallen sind, und die hohen Karten (Ass, Zehn).',
      ],
      quiz: [
        { q: 'Kreuzspiel. Du hast 5 Trümpfe, 4 sind schon gefallen. Wie viele können die Gegner noch haben?', o: ['2', '3', '6'], a: 0, why: '11 − 5 − 4 = 2.' },
        { q: 'Ein Gegenspieler hat auf Herz einen Trumpf gelegt. Was weißt du?', o: ['Er hat kein Herz mehr', 'Er hat viele Trümpfe', 'Nichts'], a: 0, why: 'Wer stechen darf, kann die Farbe nicht bedienen.' },
      ],
    },
    {
      id: 'grand', stage: 4, title: 'Grand spielen', min: 5,
      pages: [
        'Im Grand gibt es nur 4 Trümpfe. Die Stiche werden vor allem über <b>Asse, Zehnen und lange Farben</b> gewonnen.',
        'Als Alleinspieler mit 3–4 Buben: Ziehe zuerst die Buben. Mit wenigen Buben spielst du sofort deine Asse.',
        'Mit Kreuz- und Pik-Bube hast du die Trumpfkontrolle. Nach zwei Bubenrunden sind meist alle gegnerischen Buben weg.',
        'Gegen den Grand: <b>Asse zuerst</b> – und schmiert großzügig, denn jede Farbe kann für euch Stiche bringen.',
      ],
      quiz: [
        { q: 'Grand. Du hast alle 4 Buben und zwei Asse. Was spielst du zuerst?', o: ['Einen Buben', 'Ein Ass', 'Eine Lusche'], a: 0, why: 'Zuerst die Trümpfe ziehen, dann sind die Asse sicher.' },
      ],
    },
    {
      id: 'risiko', stage: 4, title: 'Risiko und Ansagen', min: 5,
      pages: [
        'Ein verlorenes Spiel kostet doppelt – nach Seeger-Fabian noch 50 Punkte mehr, und die Gegner bekommen je 40. Ein sicheres Spiel ist deshalb oft besser als ein riskantes hohes.',
        '<b>Hand spielen</b> lohnt sich, wenn das Blatt auch ohne Skat sicher gewinnt – oder wenn du erst mit der Hand-Stufe den Reizwert erreichst.',
        '<b>Schneider ansagen</b> nur, wenn du die 90 Augen mit sehr hoher Sicherheit holst. Die Stufe bringt wenig, das Risiko ist groß.',
        'Achte als Gegenspieler auf das Reizen: Wer hoch reizt, hat meist Buben oder lange Trümpfe. Das verrät dir, wo die Karten sitzen.',
      ],
      quiz: [
        { q: 'Was bedeutet Seeger-Fabian für deine Entscheidungen?', o: ['Verlieren ist noch teurer – lieber sicher spielen', 'Hohe Spiele lohnen sich immer', 'Hand spielen ist Pflicht'], a: 0, why: 'Ein Verlust kostet doppelt plus 50, die Gegner bekommen zusätzlich Punkte.' },
      ],
    },
  ];

  /* Taktik-Aufgaben. role: 'decl' | 'def'. trick: bereits gelegte Karten [{who, c}]
     who: 'Partner' | 'Alleinspieler' | 'Gegner' ; ok: richtige Karte(n) */
  const TACTICS = [
    { id: 't1', stage: 3, title: 'Schmieren', game: 'Kreuz', role: 'Gegenspieler, du spielst als Letzter', trick: [['Partner', 'hA'], ['Alleinspieler', 'h7']], hand: ['h10', 'hK', 'p9', 'd8'], ok: ['h10'],
      why: 'Das Herz-Ass deines Partners gewinnt sicher, du bist der Letzte. Schmier die Zehn: 10 Augen mehr für euch.' },
    { id: 't2', stage: 3, title: 'Stechen', game: 'Pik', role: 'Gegenspieler, du spielst als Letzter', trick: [['Alleinspieler', 'kA'], ['Partner', 'k7']], hand: ['pD', 'd10', 'd9', 'hK'], ok: ['pD'],
      why: 'Du hast kein Kreuz. Mit der Pik-Dame (Trumpf) stichst du das Kreuz-Ass – 14 Augen für euch statt für den Alleinspieler.' },
    { id: 't3', stage: 3, title: 'Abwerfen', game: 'Herz', role: 'Gegenspieler, du spielst als Letzter', trick: [['Alleinspieler', 'kB'], ['Partner', 'h7']], hand: ['pA', 'p10', 'd9', 'kK'], ok: ['d9'],
      why: 'Du hast keinen Trumpf, der Stich geht an den Alleinspieler. Wirf die Karte ohne Augen ab. Ass und Zehn hebst du für eigene Stiche auf.' },
    { id: 't4', stage: 3, title: 'Kurzer Weg', game: 'Kreuz', role: 'Gegenspieler in Vorhand. Der Alleinspieler sitzt direkt hinter dir (Mittelhand).', trick: [], hand: ['h9', 'h8', 'hK', 'hD', 'd7', 'd10', 'p9', 'k8', 'k7', 'pD'], ok: ['h9', 'h8'],
      why: 'Kurzer Weg – lange Farbe: Herz ist deine längste Farbe. Spiel eine kleine Herzkarte. Dein Partner sitzt hinter dem Alleinspieler und kann reagieren.' },
    { id: 't5', stage: 3, title: 'Langer Weg', game: 'Kreuz', role: 'Gegenspieler in Vorhand. Der Alleinspieler sitzt am Ende (Hinterhand).', trick: [], hand: ['h9', 'h8', 'hK', 'hD', 'd8', 'p9', 'p7', 'pD', 'k8', 'k7'], ok: ['d8'],
      why: 'Langer Weg – kurze Farbe: Spiel deine einzelne Karo-Karte. Danach bist du in Karo frei und kannst stechen.' },
    { id: 't6', stage: 3, title: 'Asse vorweg', game: 'Herz', role: 'Gegenspieler in Vorhand, erster Stich', trick: [], hand: ['kA', 'k9', 'p8', 'pD', 'd7', 'd8', 'dK', 'h8', 'pK', 'k8'], ok: ['kA'],
      why: 'Ein Ass in einer Fehlfarbe holt jetzt sicher Augen. Später ist der Alleinspieler vielleicht frei und sticht es.' },
    { id: 't7', stage: 3, title: 'Trumpf ziehen', game: 'Kreuz', role: 'Alleinspieler in Vorhand, erster Stich', trick: [], hand: ['kB', 'pB', 'hB', 'kA', 'k10', 'k9', 'hA', 'h10', 'p7', 'd8'], ok: ['kB', 'pB', 'hB'],
      why: 'Mit 6 Trümpfen und den drei höchsten Buben ziehst du zuerst Trumpf. Danach können die Gegner deine Herz-Asse und -Zehnen nicht mehr stechen.' },
    { id: 't8', stage: 3, title: 'Billig stechen', game: 'Herz', role: 'Alleinspieler, du spielst als Letzter', trick: [['Gegner', 'pA'], ['Gegner', 'p10']], hand: ['kB', 'h7', 'hA', 'd9'], ok: ['h7'],
      why: 'Die Herz-7 reicht zum Stechen. Die 21 Augen gehören dir – Bube und Ass bleiben für später.' },
    { id: 't9', stage: 3, title: 'Nicht zu früh schmieren', game: 'Kreuz', role: 'Gegenspieler. Dein Partner spielt aus, der Alleinspieler kommt nach dir.', trick: [['Partner', 'hK']], hand: ['h10', 'h7', 'pA', 'd8'], ok: ['h7'],
      why: 'Der Alleinspieler kommt noch und kann mit dem Herz-Ass oder einem Trumpf übernehmen. Schmieren erst, wenn der Stich sicher ist.' },
    { id: 't10', stage: 3, title: 'Null: drunter bleiben', game: 'Null', role: 'Alleinspieler, du spielst als Letzter', trick: [['Gegner', 'hD'], ['Gegner', 'h8']], hand: ['hK', 'hB', 'h7', 'p8', 'p9'], ok: ['hB'],
      why: 'Unter der Dame bleiben Bube und 7. Nimm den Buben – die 7 ist deine Absicherung für später.' },
    { id: 't11', stage: 3, title: 'Null: gefährliche Karte weg', game: 'Null', role: 'Alleinspieler, du hast kein Kreuz', trick: [['Gegner', 'k8']], hand: ['h7', 'hA', 'p7', 'p8', 'p9', 'd7'], ok: ['hA'],
      why: 'Das Herz-Ass ist deine einzige gefährliche Karte: Spielen die Gegner zweimal Herz, müsstest du es legen und gewinnen. Jetzt kannst du es gefahrlos abwerfen.' },
    { id: 't12', stage: 3, title: 'Schmieren mit Abwurf', game: 'Grand', role: 'Gegenspieler, du spielst als Letzter. Du hast kein Kreuz.', trick: [['Alleinspieler', 'k8'], ['Partner', 'kA']], hand: ['h10', 'h9', 'pK', 'd8'], ok: ['h10'],
      why: 'Dein Partner gewinnt mit dem Kreuz-Ass, und niemand kommt mehr nach dir. Schmier die Herz-Zehn.' },
    { id: 't13', stage: 4, title: 'Zehn steht', game: 'Kreuz', role: 'Alleinspieler. Pik-Ass ist schon gefallen, die Gegner haben keine Trümpfe mehr.', trick: [], hand: ['p10', 'p8', 'h9', 'h8', 'd9'], ok: ['p10'],
      why: 'Das Pik-Ass ist weg – deine Zehn ist jetzt die höchste Pik-Karte und steht. Ohne gegnerische Trümpfe holt sie sicher Augen.' },
    { id: 't14', stage: 4, title: 'Partner frei', game: 'Herz', role: 'Gegenspieler in Vorhand. Dein Partner hat auf Kreuz schon gestochen und noch Trümpfe. Der Alleinspieler hat noch Kreuz.', trick: [], hand: ['k9', 'kK', 'p9', 'p8', 'd9', 'd8'], ok: ['k9', 'kK'],
      why: 'Spiel Kreuz: Dein Partner ist frei und kann stechen, der Alleinspieler muss bedienen. Mit dem König kommen sogar 4 Augen mehr in euren Stich.' },
    { id: 't15', stage: 4, title: 'Grand: Buben ziehen', game: 'Grand', role: 'Alleinspieler in Vorhand, erster Stich', trick: [], hand: ['kB', 'pB', 'hB', 'kA', 'k10', 'kK', 'hA', 'h10', 'p9', 'd7'], ok: ['kB', 'pB', 'hB'],
      why: 'Mit drei Buben ziehst du zuerst Trumpf. Danach laufen Kreuz- und Herz-Ass mit den Zehnen.' },
    { id: 't16', stage: 4, title: 'Übernehmen', game: 'Kreuz', role: 'Gegenspieler. Dein Partner spielt aus, der Alleinspieler kommt nach dir und hat noch Herz.', trick: [['Partner', 'hK']], hand: ['hA', 'h7', 'p9', 'd8'], ok: ['hA'],
      why: 'Der Alleinspieler muss Herz bedienen und kann das Ass nicht schlagen. Mit dem Ass sicherst du 15 Augen – sonst könnte er den König mit der Zehn holen.' },
  ];

  G.SCONTENT = { LEVELS, LESSONS, TACTICS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
