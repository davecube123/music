/*
 * Backbeat song library.
 *
 * Every song is one object pushed onto window.SONGS. Format:
 *
 *   id        unique slug
 *   title, artist
 *   bpm       original tempo (beats per minute, one beat = one click)
 *   timeSig   label shown in the UI, e.g. "4/4", "6/8", "12/8"
 *   beats     clicks per bar (4 for 4/4; 2 for 6/8 felt in two; 4 for 12/8)
 *   steps     default grid steps per bar (16 = 16th notes in 4/4, 12 = triplets/12/8, 6 = 8ths in 6/8)
 *   patterns  { name: { steps?, KEY: 'x-x-...' } }  — one string per drum.
 *             A string longer than `steps` spans several bars (e.g. 32 chars = 2 bars of 16ths).
 *             Spaces and '|' are ignored, so you can write 'x-x- x-x- | x-x- x-x-'.
 *   sections  [{ name, bars, pattern, first?, fill?, bpm?, chords?, strum? }] — the song's arrangement in order.
 *             `first` replaces the first bar (e.g. a crash bar), `fill` replaces the last bar.
 *   lyrics    optional text. Headers in [brackets] are matched to section names.
 *             A header like [Chorus] also matches "Chorus 2", so a chorus can be written once.
 *   capo      guitar capo fret; chords are written as the shapes you'd play with it.
 *   strum     guitar pattern for one bar (song default, or per section). Its length sets the
 *             subdivision: 8 chars = 8th notes, 16 = 16ths, 12 = triplets.
 *             D/U strong down/up strum · d/u soft · x muted chuck · . stop · - let ring
 *             1-6 pick one string of the chord (1 = lowest played string) for fingerpicking.
 *   (section) chords: bars split by '|', chords in a bar share it evenly ('Am G | C' = 2 beats each,
 *             then a full bar of C). Cycles if shorter than the section. 'N.C.' = guitar rests.
 *   (section) bpm: own tempo for that part (scales with the tempo you set).
 *   (section) inst: true marks a part with no singing, so pasted lyrics skip it.
 *
 * Drum keys:  CR crash · RD ride · HH hi-hat · HP hi-hat pedal · SS cross-stick · SN snare
 *             T1 high tom · T2 mid tom · FT floor tom · BD kick
 * Hit symbols:  X accent · x normal · g ghost · o open hi-hat (HH row) / ride bell (RD row) · - or . rest
 */
window.SONGS = window.SONGS || [];

SONGS.push({
  id: 'demo-rock',
  title: 'Rock Groove (demo)',
  artist: 'Backbeat',
  bpm: 96,
  strum: 'D-D-DUDU',
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    intro: {
      HH: 'x-x-x-x-x-x-x-x-',
      BD: 'X-------X-------',
    },
    verse: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-------X-X-----',
    },
    crash: {
      CR: 'X---------------',
      HH: '--x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-------X-X-----',
    },
    chorus: {
      RD: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
    },
    chorusIn: {
      CR: 'X---------------',
      RD: '--x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
    },
    fill: {
      HH: 'x-x-x-x---------',
      SN: '----X---xxxx----',
      T1: '------------xx--',
      FT: '--------------xx',
      BD: 'X-----x---------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true,    bars: 4, pattern: 'intro', fill: 'fill', chords: 'E | E | A | B' },
    { name: 'Verse 1',  bars: 8, pattern: 'verse', first: 'crash', fill: 'fill', chords: 'E | B | C#m | A' },
    { name: 'Chorus',   bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'A | E | B | C#m' },
    { name: 'Verse 2',  bars: 8, pattern: 'verse', first: 'crash', fill: 'fill', chords: 'E | B | C#m | A' },
    { name: 'Chorus 2', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'A | E | B | C#m' },
    { name: 'Outro', inst: true, bars: 1, pattern: 'ending', chords: 'E', strum: 'D-------' },
  ],
  lyrics: `[Intro]
(hi-hat and kick)

[Verse 1]
Count it in and hold the time
Kick on one and snare on two
Keep it steady, keep it tight
Let the groove carry you

[Chorus]
Ride the cymbal, open up
Every bar a little higher
Lock it in and don't let up
Fill the room with fire

[Verse 2]
Slow it down to learn the part
Speed it up when it feels right
Every drummer has to start
Counting through the night

[Outro]
(crash)`,
});

SONGS.push({
  id: 'saints',
  title: 'When the Saints Go Marching In',
  artist: 'Traditional',
  bpm: 112,
  strum: 'D-uD-uD-uD-u',
  timeSig: '4/4 shuffle',
  beats: 4,
  steps: 12,
  patterns: {
    intro: {
      SS: '---x-----x--',
      HH: 'x-xx-xx-xx-x',
      BD: 'x-----x-----',
    },
    shuffle: {
      HH: 'x-xx-xx-xx-x',
      SN: '---X-----X-g',
      BD: 'X-----X-----',
    },
    shuffleCrash: {
      CR: 'X-----------',
      HH: '--xx-xx-xx-x',
      SN: '---X-----X-g',
      BD: 'X-----X-----',
    },
    rideShuffle: {
      RD: 'x-xx-xx-xx-x',
      SN: '---X--g--X-g',
      BD: 'X-----X--x--',
    },
    fill: {
      HH: 'x-xx--------',
      SN: '---X--xxxxxx',
      BD: 'X-----------',
    },
    end: {
      CR: 'X-----------',
      BD: 'X-----------',
    },
  },
  sections: [
    { name: 'Intro', inst: true,   bars: 4, pattern: 'intro', fill: 'fill', chords: 'C | C | G | C' },
    { name: 'Verse 1', bars: 8, pattern: 'shuffle', first: 'shuffleCrash', fill: 'fill', chords: 'C | C | C | G | C | F | C G | C' },
    { name: 'Verse 2', bars: 8, pattern: 'shuffle', first: 'shuffleCrash', fill: 'fill', chords: 'C | C | C | G | C | F | C G | C' },
    { name: 'Verse 3', bars: 8, pattern: 'rideShuffle', first: 'shuffleCrash', fill: 'fill', chords: 'C | C | C | G | C | F | C G | C' },
    { name: 'Outro', inst: true, bars: 1, pattern: 'end', chords: 'C', strum: 'D-----------' },
  ],
  lyrics: `[Intro]
(cross-stick shuffle)

[Verse 1]
Oh when the saints go marching in
Oh when the saints go marching in
Oh Lord, I want to be in that number
When the saints go marching in

[Verse 2]
Oh when the sun refuse to shine
Oh when the sun refuse to shine
Oh Lord, I want to be in that number
When the sun refuse to shine

[Verse 3]
Oh when the trumpet sounds its call
Oh when the trumpet sounds its call
Oh Lord, I want to be in that number
When the trumpet sounds its call

[Outro]
(big finish)`,
});

SONGS.push({
  id: 'demo-68',
  title: '6/8 Ballad (demo)',
  artist: 'Backbeat',
  bpm: 60,
  strum: '134543',
  timeSig: '6/8',
  beats: 2,
  steps: 6,
  patterns: {
    verse: {
      HH: 'xxxxxx',
      SS: '---x--',
      BD: 'X----x',
    },
    chorus: {
      RD: 'xxxxxx',
      SN: '---X--',
      BD: 'X-x--x',
    },
    chorusIn: {
      CR: 'X-----',
      RD: '-xxxxx',
      SN: '---X--',
      BD: 'X-x--x',
    },
    fill: {
      steps: 12,
      HH: 'x-x-x-------',
      SN: '------xx----',
      T1: '--------xx--',
      FT: '----------xx',
      BD: 'X-----------',
    },
  },
  sections: [
    { name: 'Verse',  bars: 8, pattern: 'verse', fill: 'fill', chords: 'C | Am | F | G' },
    { name: 'Chorus', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'F | C | G | Am' },
  ],
});

/* ------------------------------------------------------------------
 * Dancing in the Moonlight — Toploader (2000 cover of King Harvest)
 * ~120 BPM, 4/4. Bouncy pop-rock groove: 8th hats, kick on 1, the "and"
 * of 2 and 3, backbeat on 2 & 4; chorus opens the hats on the off-beats.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'dancing-in-the-moonlight',
  title: 'Dancing in the Moonlight',
  artist: 'Toploader',
  bpm: 120,
  capo: 1,
  strum: 'D-DU-UDU',
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    intro: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '----x-------x---',
      BD: 'X-----x-X-------',
    },
    verse: {
      HH: 'x-x-x-x-x-x-x-x- x-x-x-x-x-x-x-x-',
      SN: '----X-------X--- ----X-------X--g',
      BD: 'X-----x-X------- X-----x-X-x-----',
    },
    verseIn: {
      CR: 'X---------------',
      HH: '--x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-------',
    },
    chorus: {
      HH: 'x-o-x-o-x-o-x-o-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x---x-',
    },
    chorusIn: {
      CR: 'X---------------',
      HH: '--o-x-o-x-o-x-o-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x---x-',
    },
    breakdown: {
      HH: 'x-x-x-x-x-x-x-x-',
      SS: '----x-------x---',
      BD: 'X-------X-------',
    },
    fill: {
      HH: 'x-x-x-x---------',
      SN: '----X---x-xxX---',
      T1: '------------x---',
      FT: '-------------x-x',
      BD: 'X-----x---------',
    },
    pickup: {
      HH: 'x-x-x-x-x-x-----',
      SN: '----X-------xxxx',
      BD: 'X-----x-X-------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true,        bars: 8, pattern: 'intro', fill: 'pickup', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Verse 1',      bars: 8, pattern: 'verse', first: 'verseIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Verse 2',      bars: 8, pattern: 'verse', first: 'verseIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Chorus',       bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Instrumental', inst: true, bars: 8, pattern: 'intro', first: 'verseIn', fill: 'pickup', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Verse 3',      bars: 8, pattern: 'verse', first: 'verseIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Verse 4',      bars: 8, pattern: 'verse', first: 'verseIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Chorus 2',     bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Breakdown',    bars: 8, pattern: 'breakdown', fill: 'pickup', chords: 'Am7 Am7 D D | G G F# Em', strum: 'd-d-d-d-' },
    { name: 'Chorus 3',     bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Chorus 4',     bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am7 Am7 D D | G G F# Em' },
    { name: 'Outro',        bars: 4, pattern: 'chorus', first: 'chorusIn', fill: 'ending', chords: 'Am7 Am7 D D | G G F# Em | Am7 Am7 D D | G' },
  ],
  lyrics: `[Intro]
(piano riff)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("We get it on…")

[Verse 2]
("Everybody here…")

[Chorus]
("Dancing in the moonlight…")

[Instrumental]
(piano riff)

[Verse 3]
("We like our fun…")

[Verse 4]
("Everybody here…")

[Breakdown]
(drums drop down — cross-stick)

[Outro]
(big ending)`,
});

/* ------------------------------------------------------------------
 * Riptide — Vance Joy (2013)
 * ~100 BPM, 4/4. Ukulele-led: intro has no drums, verse 1 is just a
 * soft kick, the band (8th hats, backbeat) arrives in the chorus,
 * the bridge drives on floor tom, then a stop-time breakdown.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'riptide',
  title: 'Riptide',
  artist: 'Vance Joy',
  bpm: 100,
  capo: 1,
  strum: 'D-DU-UDU',
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    tacet: {},
    kick: {
      BD: 'x-------x-------',
    },
    pre: {
      HH: 'x-x-x-x-x-x-x-x-',
      SS: '----x-------x---',
      BD: 'X-------X-------',
    },
    preFill: {
      HH: 'x-x-x-x-x-------',
      SN: '------------xxxx',
      BD: 'X-------X-------',
    },
    chorus: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-------',
    },
    chorusIn: {
      CR: 'X---------------',
      HH: '--x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-------',
    },
    verse2: {
      HH: 'x-x-x-x-x-x-x-x-',
      SS: '----x-------x---',
      BD: 'X-----x-X-------',
    },
    interlude: {
      HH: 'x-x-x-x-x-x-x-x-',
      BD: 'X-------X-------',
    },
    bridge: {
      FT: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X---X---X---X---',
    },
    bridgeFill: {
      FT: 'x-x-x-x---------',
      SN: '----X---xxxxXXXX',
      BD: 'X---X---X---X---',
    },
    stop: {
      CR: 'X--------------- ----------------',
      BD: 'X--------------- ----------------',
    },
    stopFill: {
      SN: '--------x-x-XXXX',
      BD: 'X---------------',
    },
    fill: {
      HH: 'x-x-x-x---------',
      SN: '----X---xxxx----',
      T1: '------------xx--',
      FT: '--------------xx',
      BD: 'X-----x---------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true,      bars: 4,  pattern: 'tacet', chords: 'Am G | C' },
    { name: 'Verse 1',    bars: 8,  pattern: 'kick', chords: 'Am G | C' },
    { name: 'Pre-Chorus', bars: 4,  pattern: 'pre', fill: 'preFill', chords: 'Am G | C' },
    { name: 'Chorus',     bars: 12, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am G | C' },
    { name: 'Interlude', inst: true,  bars: 4,  pattern: 'interlude', chords: 'Am G | C' },
    { name: 'Verse 2',    bars: 8,  pattern: 'verse2', fill: 'fill', chords: 'Am G | C' },
    { name: 'Pre-Chorus 2', bars: 4, pattern: 'pre', fill: 'preFill', chords: 'Am G | C' },
    { name: 'Chorus 2',   bars: 12, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am G | C' },
    { name: 'Bridge',     bars: 8,  pattern: 'bridge', fill: 'bridgeFill', chords: 'Am G | C Fmaj7' },
    { name: 'Breakdown',  bars: 4,  pattern: 'stop', fill: 'stopFill', chords: 'Am G | C', strum: 'D-------' },
    { name: 'Chorus 3',   bars: 12, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am G | C' },
    { name: 'Outro', inst: true, bars: 4, pattern: 'kick', fill: 'ending', chords: 'Am G | C | Am G | C', strum: 'D-------' },
  ],
  lyrics: `[Intro]
(ukulele only — drums tacet)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("I was scared of dentists…")

[Pre-Chorus]
("Ooh… and they come unstuck")

[Chorus]
("Lady, running down to the riptide…")

[Interlude]
(ukulele riff)

[Verse 2]
("There's this movie…")

[Bridge]
("I just wanna, I just wanna know…")

[Breakdown]
("I swear she's destined…" — stop-time, crash on beat 1)

[Outro]
(last strum)`,
});

/* ------------------------------------------------------------------
 * Under the Bridge — Red Hot Chili Peppers (1991)
 * Grooves follow Bonedo's Chad Smith drum transcription:
 *  - Verse 1: guitar alone for the first half, then hi-hat + rim click, no kick.
 *  - A 2-bar drum break (still no kick) leads into each chorus.
 *  - Chorus: kick arrives on "1-and", rim click on every beat.
 *  - Verse 2: 4-bar kick pattern with rim click on 2 & 4.
 *  - After chorus 2 a fill takes it to ride + rimshots; the end speeds up to ~88 BPM.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
(() => {
  const rest = (bars) => '-'.repeat(16 * bars);
  const HH8 = 'x-x-x-x-x-x-x-x-';
  SONGS.push({
    id: 'under-the-bridge',
    title: 'Under the Bridge',
    artist: 'Red Hot Chili Peppers',
    bpm: 84,
    strum: '1-3-4-5-6-5-4-3-',
    timeSig: '4/4',
    beats: 4,
    steps: 16,
    patterns: {
      tacet: {},
      // 16 bars: 8 bars guitar only, 2-bar drum entry, then the verse-1 groove
      verse1: {
        HH: rest(8) + HH8 + 'x-x-x-x-x-x-x-o-' + HH8.repeat(6),
        SS: rest(8) + '----x---x---x---' + 'x---x---x---x---' + '----x-------x---'.repeat(6),
      },
      groove1: {
        HH: HH8,
        SS: '----x-------x---',
      },
      drumBreak: {
        HH: 'x-xxx-x-x-xxx-x- x-xxx-x-x-xxx-o-',
        SS: '----x--x-g--x--- -g--x--x-g--x---',
      },
      chorus: {
        HH: HH8 + 'x-x-x-x-x-x-x-o-' + HH8 + 'x-x-x-x-x-x-x-o-',
        SS: '----x---x---x--- x---x---x---x--- x---x---x---x--- x---x---x---x---',
        BD: '--x---x-x------- x-----x-x------- --x---x-x------- x-----x-x-------',
      },
      verse2: {
        HH: HH8 + HH8 + HH8 + 'x-x-x-x-x-x-x-o-',
        SS: '----x-------x---'.repeat(4),
        BD: 'x-----x--------- ------x---x----- x-----x--------- --x---x-x-------',
      },
      bigFill: {
        HH: 'x-x-x-x---------',
        SN: '--------XxxxXxxx',
        T1: '------------x---',
        FT: '--------------xx',
        BD: 'x-----x---------',
      },
      outro: {
        RD: HH8.repeat(4),
        SN: '----X-------X---'.repeat(4),
        BD: 'X-----x-x------- --x---x---x----- x-----x-x--x---- x-x---x---x---x-',
      },
      outroIn: {
        CR: 'X---------------',
        RD: '--x-x-x-x-x-x-x-',
        SN: '----X-------X---',
        BD: 'X-----x-x-------',
      },
      outroFill: {
        RD: 'x-x-x-x---------',
        SN: '----X---XxXx----',
        T1: '------------x---',
        FT: '-------------x-x',
        BD: 'X-----x---------',
      },
      ending: {
        CR: 'X---------------',
        BD: 'X---------------',
      },
    },
    sections: [
      { name: 'Intro', inst: true,       bars: 8,  pattern: 'tacet', chords: 'D | F#' },
      { name: 'Verse 1',                 bars: 16, pattern: 'verse1', chords: 'E B C#m7 C#m7 | G#m G#m A A | E B C#m C#m | A A A A | E B C#m C#m | G#m G#m A A | E B C#m C#m | A A Emaj7 Emaj7' },
      { name: 'Drum Break', inst: true,  bars: 2,  pattern: 'drumBreak', chords: 'N.C.' },
      { name: 'Chorus',                  bars: 8,  pattern: 'chorus', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Interlude', inst: true,   bars: 2,  pattern: 'groove1', chords: 'D | F#' },
      { name: 'Verse 2',                 bars: 8,  pattern: 'verse2', chords: 'E B C#m7 C#m7 | G#m G#m A A | E B C#m C#m | A A A A | E B C#m C#m | G#m G#m A A | E B C#m C#m | A A Emaj7 Emaj7' },
      { name: 'Drum Break 2', inst: true, bars: 2, pattern: 'drumBreak', chords: 'N.C.' },
      { name: 'Chorus 2',                bars: 8,  pattern: 'chorus', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Chorus Tag',              bars: 4,  pattern: 'chorus', fill: 'bigFill', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Bridge',                  bars: 16, pattern: 'outro', first: 'outroIn', fill: 'outroFill', bpm: 88, chords: 'A A Am Am | G6 G6 Fmaj7 Fmaj7', strum: 'D-D-DUDU' },
      { name: 'Outro',                   bars: 8,  pattern: 'outro', first: 'outroIn', fill: 'ending', bpm: 88, chords: 'A A Am Am | G6 G6 Fmaj7 Fmaj7 | A', strum: 'D-D-DUDU' },
    ],
    lyrics: `[Intro]
(guitar intro — no drums)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("Sometimes I feel…" — drums come in halfway)

[Drum Break]
(2-bar drum break, no kick)

[Chorus]
("I don't ever wanna feel…")

[Interlude]
(guitar)

[Verse 2]
("It's hard to believe…")

[Chorus Tag]
(fill into the big ending)

[Bridge]
("Under the bridge downtown…" — ride + rimshots, ~88 BPM)

[Outro]
(last chord)`,
  });
})();
