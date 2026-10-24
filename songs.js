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
 *   sections  [{ name, bars, pattern, first?, fill?, bpm?, chords?, seq? }] — the song's arrangement in order.
 *             `first` replaces the first bar (e.g. a crash bar), `fill` replaces the last bar.
 *   lyrics    optional text. Headers in [brackets] are matched to section names.
 *             A header like [Chorus] also matches "Chorus 2", so a chorus can be written once.
 *   capo      capo fret; chords are written as the shapes you'd play with it (the cue sounds at pitch).
 *   tuning, transpose  for down-tuned songs: a label (e.g. 'Tune down 1 step') and the shift in
 *             semitones (e.g. -2). Shapes stay as fingered; the cue sounds at the record's pitch.
 *   (section) chords: bars split by '|', chords in a bar share it evenly ('Am G | C' = 2 beats each,
 *             then a full bar of C). Cycles if shorter than the section. 'N.C.' = no chord.
 *             A soft chord cue sounds on each change; the chord is shown on screen.
 *   strum     strum pattern for the rhythm-only strum track (song default, or per section).
 *             Covers `strumBeats` beats (default: a whole bar) and repeats to fill the bar.
 *             D/U strong down/up · d/u soft · x muted chuck · p single picked note · - rest
 *   (section) seq: one pattern name per bar instead of bars/pattern — for songs whose meter
 *             changes bar to bar. A pattern can set its own `beats` (e.g. 3 for a 3/4 bar).
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
    { name: 'Outro', inst: true, bars: 1, pattern: 'ending', chords: 'E' },
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
  strum: 'D-UD-UD-UD-U',
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
    { name: 'Outro', inst: true, bars: 1, pattern: 'end', chords: 'C' },
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
  strum: 'D-UD-U',
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
  strum: 'D-DU-UDU',
  capo: 1,
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
  strum: 'D-DU-UDU',
  capo: 1,
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
    strum: 'p-p-p-p-p-p-p-p-',
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
      { name: 'Drum Break', inst: true,  bars: 2,  pattern: 'drumBreak', chords: 'N.C.', strum: '' },
      { name: 'Chorus',                  bars: 8,  pattern: 'chorus', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Interlude', inst: true,   bars: 2,  pattern: 'groove1', chords: 'D | F#' },
      { name: 'Verse 2',                 bars: 8,  pattern: 'verse2', chords: 'E B C#m7 C#m7 | G#m G#m A A | E B C#m C#m | A A A A | E B C#m C#m | G#m G#m A A | E B C#m C#m | A A Emaj7 Emaj7' },
      { name: 'Drum Break 2', inst: true, bars: 2, pattern: 'drumBreak', chords: 'N.C.', strum: '' },
      { name: 'Chorus 2',                bars: 8,  pattern: 'chorus', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Chorus Tag',              bars: 4,  pattern: 'chorus', fill: 'bigFill', chords: 'F#m F#m E E | B B B B', strum: 'D-D-DUDU' },
      { name: 'Bridge',                  bars: 16, pattern: 'outro', first: 'outroIn', fill: 'outroFill', bpm: 88, chords: 'A A Am Am | G6 G6 Fmaj7 Fmaj7', strum: 'D-D-DUDU' },
      { name: 'Outro',                   bars: 8,  pattern: 'outro', first: 'outroIn', fill: 'ending', bpm: 88, chords: 'A A Am Am | G6 G6 Fmaj7 Fmaj7 | A A Am Am | G6 G6 Fmaj7 Fmaj7 | A A Am Am | G6 G6 Fmaj7 Fmaj7 | A | A', strum: 'D-D-DUDU' },
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

/* ------------------------------------------------------------------
 * She's Always a Woman — Billy Joel (1977)
 * A 3/4 waltz led by piano. The record has no real drum-kit groove, so this
 * is a light suggested pulse (kick on 1, hi-hat foot on 2 & 3; ride in the
 * choruses) to keep time. Mute any drum by tapping its name.
 * Chords: D shapes with capo 1 (sounds in E-flat, the original key).
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'shes-always-a-woman',
  title: "She's Always a Woman",
  artist: 'Billy Joel',
  bpm: 118,
  strum: 'pppppp',
  capo: 1,
  timeSig: '3/4',
  beats: 3,
  steps: 6,
  patterns: {
    intro: {
      HP: '--x-x-',
    },
    waltz: {
      HP: '--x-x-',
      BD: 'x-----',
    },
    chorus: {
      RD: 'x-x-x-',
      HP: '--x-x-',
      BD: 'x-----',
    },
    chorusIn: {
      CR: 'x-----',
      RD: '--x-x-',
      HP: '--x-x-',
      BD: 'x-----',
    },
    lift: {
      RD: 'x-x---',
      SN: '----gx',
      BD: 'x-----',
    },
    ending: {
      RD: 'o-----',
      BD: 'x-----',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 4, pattern: 'intro', chords: 'D D4/A D | A | D G/D D | D' },
    { name: 'Verse 1', bars: 16, pattern: 'waltz', chords: 'A | D | A | D | G | Gmaj7 | G6 | Gmaj7 | A7 | D | A7 | F# | Bm | Bm/A | G6 A7 A7 | D D4/A D' },
    { name: 'Verse 2', bars: 16, pattern: 'waltz', fill: 'lift', chords: 'A | D | A | D Dsus2 Dsus2 | G | Gmaj7 | G6 | Gmaj7 | A7 | D | A7 | F# F# F#7/E | Bm | Bm/A | G6 A7 A7 | D D4/A D/C#' },
    { name: 'Chorus', bars: 22, pattern: 'chorus', first: 'chorusIn', fill: 'lift', chords: 'Bm | Bm/A | E7/G# | E7 | A A/G# A/G# | F#m | D | G G/F# G/F# | Em | A7 | D D4/A D | Dm | Dm/C | G7/B | G7 | C C/B C/B | Am | F6 | Bb Bb/A Bb/A | Abdim7 | E7 | A A6 A7' },
    { name: 'Verse 3', bars: 16, pattern: 'waltz', chords: 'A | D | A | D | G | Gmaj7 | G6 | Gmaj7 | A7 | D | A7 | F# F# F#7/E | Bm | Bm/A | G6 A7 A7 | D D4/A D' },
    { name: 'Instrumental', inst: true, bars: 12, pattern: 'chorus', first: 'chorusIn', fill: 'lift', chords: 'D | A7 | D | A | F# | F#7/E | Bm | Bm/A | G6 | A | D D4/A D | D/C#' },
    { name: 'Chorus 2', bars: 22, pattern: 'chorus', first: 'chorusIn', fill: 'lift', chords: 'Bm | Bm/A | E7/G# | E7 | A A/G# A/G# | F#m | D | G G/F# G/F# | Em | A7 | D D4/A D | Dm | Dm/C | G7/B | G7 | C C/B C/B | Am | F6 | Bb Bb/A Bb/A | Abdim7 | E7 | A A6 A7' },
    { name: 'Verse 4', bars: 19, pattern: 'waltz', chords: 'A | D | A | D | G | Gmaj7 | G6 | Gmaj7 | A7 | D | A7 | F# F# F#7/E | Bm | Bm/A | G | D/F# | Em | A7 | D D4/A D' },
    { name: 'Outro', inst: true, bars: 12, pattern: 'waltz', fill: 'ending', chords: 'D | A7 | D | A | F# | F#7/E | Bm | Bm/A | G6 | A7 | D D4/A D | D' },
  ],
  lyrics: `[Intro]
(piano)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("She can kill with a smile…")

[Verse 2]

[Chorus]
("Oh, she takes care of herself…" — key change midway)

[Verse 3]

[Instrumental]
(piano solo)

[Verse 4]

[Outro]
(piano)`,
});

/* ------------------------------------------------------------------
 * Dark Necessities — Red Hot Chili Peppers (2016)
 * Main groove from Bonedo's transcription (~90 BPM): one-handed 16th
 * hi-hat, a busy kick pattern and a single snare on beat 2 — even in the
 * chorus, which gives the song its floating feel.
 * Chords (standard tuning, no capo): verse Cm Ab Fm Bb, chorus Ab Fm Cm Bb,
 * bridge Eb Db Fm Ab Bb.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'dark-necessities',
  title: 'Dark Necessities',
  artist: 'Red Hot Chili Peppers',
  bpm: 90,
  strum: 'D-xU-UxU',
  strumBeats: 2,
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    tacet: {},
    groove: {
      HH: 'xxxxxxxxxxxxxxxx',
      SN: '----X-----------',
      BD: 'X--X--xX--X--xX-',
    },
    grooveIn: {
      CR: 'X---------------',
      HH: '-xxxxxxxxxxxxxxx',
      SN: '----X-----------',
      BD: 'X--X--xX--X--xX-',
    },
    fill: {
      HH: 'xxxxxxxx--------',
      SN: '----X---xxXxXxXX',
      BD: 'X--X--xX--------',
    },
    interlude: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '--------X-------',
      BD: 'X------x--X-----',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'tacet', chords: 'Cm | Ab | Fm | Bb', strum: '' },
    { name: 'Intro Groove', inst: true, bars: 4, pattern: 'groove', first: 'grooveIn', chords: 'Cm | Ab | Fm | Bb' },
    { name: 'Verse 1', bars: 16, pattern: 'groove', fill: 'fill', chords: 'Cm | Ab | Fm | Bb' },
    { name: 'Chorus', bars: 8, pattern: 'groove', first: 'grooveIn', chords: 'Ab | Fm | Cm | Bb' },
    { name: 'Verse 2', bars: 16, pattern: 'groove', fill: 'fill', chords: 'Cm | Ab | Fm | Bb' },
    { name: 'Chorus 2', bars: 8, pattern: 'groove', first: 'grooveIn', fill: 'fill', chords: 'Ab | Fm | Cm | Bb' },
    { name: 'Piano Interlude', inst: true, bars: 8, pattern: 'interlude', fill: 'fill', chords: 'Cm | Ab | Fm | Bb', strum: '' },
    { name: 'Bridge', bars: 8, pattern: 'groove', first: 'grooveIn', fill: 'fill', chords: 'Eb | Db | Fm | Ab Bb' },
    { name: 'Guitar Solo', inst: true, bars: 8, pattern: 'groove', first: 'grooveIn', fill: 'fill', chords: 'Cm | Ab | Fm | Bb' },
    { name: 'Chorus 3', bars: 8, pattern: 'groove', first: 'grooveIn', chords: 'Ab | Fm | Cm | Bb' },
    { name: 'Outro', bars: 16, pattern: 'groove', first: 'grooveIn', fill: 'ending', chords: 'Cm | Ab | Fm | Bb' },
  ],
  lyrics: `[Intro]
(slap bass — no drums yet)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Intro Groove]
(drums come in)

[Verse 1]
("Coming out to the light of day…")

[Chorus]
("Dark necessities…")

[Verse 2]

[Piano Interlude]
(piano, lighter half-time feel)

[Bridge]

[Guitar Solo]
(guitar solo)

[Outro]
(jam to the end)`,
});

/* ------------------------------------------------------------------
 * The Zephyr Song — Red Hot Chili Peppers (2002)
 * ~118 BPM, 4/4. No published drum transcription found, so the grooves are
 * an approximation in Chad Smith's style: relaxed 8th hi-hat and backbeat in
 * the verses, opened-up hats in the chorus, a half-time bridge.
 * Chords (standard tuning, no capo): verse/intro Am G Em F (2 beats each),
 * chorus D G A with an "Am G Em F" tag.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'the-zephyr-song',
  title: 'The Zephyr Song',
  artist: 'Red Hot Chili Peppers',
  bpm: 118,
  strum: 'D-DU-UDU',
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    verse: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
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
    halftime: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '--------X-------',
      BD: 'X-----x---x-----',
    },
    ride: {
      RD: 'x-x-x-x-x-x-x-x-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
    },
    fill: {
      HH: 'x-x-x-x-x-x-----',
      SN: '----X-------xxXX',
      BD: 'X-----x-X-------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'verse', fill: 'fill', chords: 'Am G | Em F' },
    { name: 'Verse 1', bars: 16, pattern: 'verse', fill: 'fill', chords: 'Am G | Em F' },
    { name: 'Chorus', bars: 10, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'D G | A | D G | A | D G | A | D G | A | Am G | Em F' },
    { name: 'Verse 2', bars: 16, pattern: 'verse', fill: 'fill', chords: 'Am G | Em F' },
    { name: 'Chorus 2', bars: 10, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'D G | A | D G | A | D G | A | D G | A | Am G | Em F' },
    { name: 'Bridge', bars: 8, pattern: 'halftime', fill: 'fill', chords: 'Em | F | Am | G' },
    { name: 'Interlude', inst: true, bars: 8, pattern: 'ride', fill: 'fill', chords: 'Am G | Em F' },
    { name: 'Chorus 3', bars: 10, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'D G | A | D G | A | D G | A | D G | A | Am G | Em F' },
    { name: 'Chorus 4', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'D G | A | D G | A | D G | A | D G | A' },
    { name: 'Outro', bars: 4, pattern: 'chorus', first: 'chorusIn', fill: 'ending', chords: 'D' },
  ],
  lyrics: `[Intro]
(guitar riff)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("Can I get your hand to write on…")

[Chorus]
("Fly away on my zephyr…")

[Verse 2]

[Bridge]
(half-time feel)

[Interlude]
(guitar)

[Outro]
(last chord)`,
});

/* ------------------------------------------------------------------
 * This Love — Maroon 5 (2002)
 * ~95 BPM, 4/4, C minor. No published drum transcription found, so the
 * grooves are an approximation of the record's feel: funky 16th hi-hat with
 * soft in-between notes, syncopated kick, backbeat with snare ghost notes.
 * Chords (standard tuning, no capo): verse/riff Cm7 Fm7 G7; chorus
 * Cm Fm Bb Eb … Cm F Ab G; bridge Fm Ebmaj7 G7 Cm.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'this-love',
  title: 'This Love',
  artist: 'Maroon 5',
  bpm: 95,
  strum: 'D-xU-xUx',
  strumBeats: 2,
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    verse: {
      HH: 'xgxgxgxgxgxgxgxg',
      SN: '----X--g-g--X--g',
      BD: 'X--x--x---X---x-',
    },
    chorus: {
      HH: 'xgxgxgxgxgxgxgo-',
      SN: '----X--g-g--X---',
      BD: 'X--x--x-X-x---x-',
    },
    chorusIn: {
      CR: 'X---------------',
      HH: '--xgxgxgxgxgxgo-',
      SN: '----X--g-g--X---',
      BD: 'X--x--x-X-x---x-',
    },
    bridge: {
      HH: 'x-x-x-x-x-x-x-x-',
      SS: '----x-------x---',
      BD: 'X-------X-x-----',
    },
    fill: {
      HH: 'xgxgxgxg--------',
      SN: '----X---xxxxXxXX',
      BD: 'X--x--x---------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'verse', fill: 'fill', chords: 'Cm7 | Fm7 G7' },
    { name: 'Verse 1', bars: 8, pattern: 'verse', fill: 'fill', chords: 'Cm7 | Fm7 G7' },
    { name: 'Chorus', bars: 10, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm F | Ab G | Cm Fm | G7' },
    { name: 'Verse 2', bars: 8, pattern: 'verse', fill: 'fill', chords: 'Cm7 | Fm7 G7' },
    { name: 'Chorus 2', bars: 10, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm F | Ab G | Cm Fm | G7' },
    { name: 'Bridge', bars: 8, pattern: 'bridge', fill: 'fill', chords: 'Fm | Ebmaj7 | G7 | Cm | Fm | Ebmaj7 | G | G7', strum: 'D-------' },
    { name: 'Chorus 3', bars: 8, pattern: 'chorus', first: 'chorusIn', chords: 'Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm F | Ab G' },
    { name: 'Chorus 4', bars: 8, pattern: 'chorus', first: 'chorusIn', chords: 'Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm F | Ab G' },
    { name: 'Outro', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'ending', chords: 'Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm Fm | Bb Eb | Cm F | Ab G' },
  ],
  lyrics: `[Intro]
(piano / guitar riff)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("I was so high…")

[Chorus]
("This love has taken its toll…")

[Verse 2]

[Bridge]

[Outro]
(chorus repeats to the end)`,
});

/* ------------------------------------------------------------------
 * Flashed Junk Mind — Milky Chance (2013)
 * ~118 BPM, 4/4, key of B. No published drum transcription found, so the
 * beat is an approximation of the record's laid-back feel: off-beat hi-hat
 * that locks with the off-beat guitar in the verses, fuller hats in the
 * chorus, backbeat on 2 & 4.
 * Chords (standard tuning, no capo): riff G#m F# B E · G#m F# B;
 * verse/chorus B G#m F# B · E G#m F# B (verse picked off-beat, chorus strummed).
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'flashed-junk-mind',
  title: 'Flashed Junk Mind',
  artist: 'Milky Chance',
  bpm: 118,
  strum: '-p-p-p-p',
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    intro: {
      HH: '--x---x---x---x-',
      BD: 'X-------X-------',
    },
    verse: {
      HH: '--x---x---x---x-',
      SN: '----X-------X---',
      BD: 'X-------X-x-----',
    },
    chorus: {
      HH: 'x-x-x-x-x-x-x-o-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
    },
    chorusIn: {
      CR: 'X---------------',
      HH: '--x-x-x-x-x-x-o-',
      SN: '----X-------X---',
      BD: 'X-----x-X-x-----',
    },
    fill: {
      HH: 'x-x-x-x---------',
      SN: '----X---x-x-xxXX',
      BD: 'X-------X-------',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'intro', fill: 'fill', chords: 'G#m F# | B E | G#m F# | B' },
    { name: 'Verse 1', bars: 16, pattern: 'verse', fill: 'fill', chords: 'B G#m | F# B | E G#m | F# B' },
    { name: 'Chorus', bars: 16, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'B G#m | F# B | E G#m | F# B', strum: 'D-DU-UDU' },
    { name: 'Interlude', inst: true, bars: 8, pattern: 'verse', fill: 'fill', chords: 'G#m F# | B E | G#m F# | B' },
    { name: 'Verse 2', bars: 16, pattern: 'verse', fill: 'fill', chords: 'B G#m | F# B | E G#m | F# B' },
    { name: 'Chorus 2', bars: 16, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'B G#m | F# B | E G#m | F# B', strum: 'D-DU-UDU' },
    { name: 'Interlude 2', inst: true, bars: 16, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'G#m F# | B E | G#m F# | B', strum: 'D-DU-UDU' },
    { name: 'Outro', inst: true, bars: 12, pattern: 'verse', fill: 'ending', chords: 'G#m F# | B E | G#m F# | B' },
  ],
  lyrics: `[Intro]
(guitar riff)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("We were young souls…")

[Chorus]

[Interlude]
(riff)

[Verse 2]

[Outro]
(riff — picked, then strummed)`,
});

/* ------------------------------------------------------------------
 * Thinking Out Loud — Ed Sheeran (2014)
 * ~79 BPM, 4/4 with a swung (triplet) feel, so the grid is 12 steps per bar.
 * Groove is an approximation of the record's laid-back feel: hi-hat foot on
 * the swung upbeats, cross-stick in the verses, backbeat and shuffle hi-hat
 * in the choruses.
 * Chords as D shapes with the guitar tuned down a whole step (sounds in C).
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'thinking-out-loud',
  title: 'Thinking Out Loud',
  artist: 'Ed Sheeran',
  bpm: 79,
  strum: 'D-UD-UD-UD-U',
  tuning: 'Tune down 1 step',
  transpose: -2,
  timeSig: '4/4 swing',
  beats: 4,
  steps: 12,
  patterns: {
    intro: {
      HP: '--x--x--x--x',
    },
    verse: {
      HP: '--x--x--x--x',
      SS: '---x-----x--',
      BD: 'X-----X-x---',
    },
    pre: {
      HH: 'x--x--x--x--',
      HP: '--x--x--x--x',
      SN: '---x-----x--',
      BD: 'X-----X-x---',
    },
    chorus: {
      HH: 'x-xx-xx-xx-x',
      SN: '---X-----X--',
      BD: 'X-----X-x---',
    },
    chorusIn: {
      CR: 'X-----------',
      HH: '--xx-xx-xx-x',
      SN: '---X-----X--',
      BD: 'X-----X-x---',
    },
    solo: {
      RD: 'x-xx-xx-xx-x',
      SN: '---X-----X--',
      BD: 'X-----X-x---',
    },
    fill: {
      HH: 'x-xx-x------',
      SN: '---X--xxxXxX',
      BD: 'X-----------',
    },
    ending: {
      CR: 'X-----------',
      BD: 'X-----------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 4, pattern: 'intro', chords: 'D D/F# | G A', strum: 'p-pp-pp-pp-p' },
    { name: 'Verse 1', bars: 16, pattern: 'verse', chords: 'D D/F# | G A', strum: 'p-pp-pp-pp-p' },
    { name: 'Pre-Chorus', bars: 8, pattern: 'pre', fill: 'fill', chords: 'Em | A7 D | Em | A7 | Em | A7 Bm | Em | A7' },
    { name: 'Chorus', bars: 12, pattern: 'chorus', first: 'chorusIn', chords: 'D D/F# | G A | D D/F# | G A | D D/F# | G A | D D/F# | G A | Bm A | G | D/F# Em | A7 D' },
    { name: 'Verse 2', bars: 8, pattern: 'verse', chords: 'D D/F# | G A', strum: 'p-pp-pp-pp-p' },
    { name: 'Pre-Chorus 2', bars: 8, pattern: 'pre', fill: 'fill', chords: 'Em | A7 D | Em | A7 | Em | A7 Bm | Em | A7' },
    { name: 'Chorus 2', bars: 12, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'D D/F# | G A | D D/F# | G A | D D/F# | G A | D D/F# | G A | Bm A | G | D/F# Em | A7 D' },
    { name: 'Guitar Solo', inst: true, bars: 8, pattern: 'solo', first: 'chorusIn', fill: 'fill', chords: 'D D/F# | G A' },
    { name: 'Chorus 3', bars: 12, pattern: 'chorus', first: 'chorusIn', chords: 'D D/F# | G A | D D/F# | G A | D D/F# | G A | D D/F# | G A | Bm A | G | D/F# Em | A7 D' },
    { name: 'Outro', inst: true, bars: 4, pattern: 'verse', fill: 'ending', chords: 'D D/F# | G A | D D/F# | D' },
  ],
  lyrics: `[Intro]
(guitar)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("When your legs don't work…")

[Pre-Chorus]

[Chorus]
("So honey now…")

[Verse 2]

[Guitar Solo]
(guitar solo)

[Outro]
(last chord)`,
});

/* ------------------------------------------------------------------
 * Viva la Vida — Coldplay (2008)
 * ~138 BPM, 4/4, sounds in A-flat. Capo 1, shapes C D G Em (one per bar)
 * nearly all the way through; "Bm" on the "I can't explain" lines.
 * No published drum part found, so the drums are an approximation of the
 * record's marching feel: no drums under the opening strings, a big bass drum
 * that grows from beats 1 & 3 to every beat, a bell-like ride on the
 * downbeat in the chorus, and a full backbeat in the "oh-oh-oh" section.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'viva-la-vida',
  title: 'Viva la Vida',
  artist: 'Coldplay',
  bpm: 138,
  strum: 'D-D-D-D-',
  capo: 1,
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    tacet: {},
    pulse: {
      BD: 'X-------x-------',
    },
    march: {
      BD: 'X---x---X---x---',
      SS: '----x-------x---',
    },
    chorus: {
      RD: 'o---------------',
      BD: 'X---X---X---X---',
      SN: '----x-------x---',
    },
    chorusIn: {
      CR: 'X---------------',
      BD: 'X---X---X---X---',
      SN: '----x-------x---',
    },
    big: {
      HH: 'x-x-x-x-x-x-x-x-',
      BD: 'X---X---X---X---',
      SN: '----X-------X---',
    },
    bigIn: {
      CR: 'X---------------',
      HH: '--x-x-x-x-x-x-x-',
      BD: 'X---X---X---X---',
      SN: '----X-------X---',
    },
    roll: {
      BD: 'X---X---X---X---',
      SN: '--------xxxxXXXX',
    },
    ending: {
      CR: 'X---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'tacet', chords: 'C | D | G | Em', strum: '' },
    { name: 'Verse 1', bars: 16, pattern: 'pulse', chords: 'C | D | G | Em' },
    { name: 'Verse 2', bars: 16, pattern: 'march', fill: 'roll', chords: 'C | D | G | Em' },
    { name: 'Chorus', bars: 16, pattern: 'chorus', first: 'chorusIn', chords: 'C | D | G | Em | C | D | G | Em | C | D | G | Em | C | D | Bm | Em', strum: 'D-DUD-DU' },
    { name: 'Verse 3', bars: 16, pattern: 'march', fill: 'roll', chords: 'C | D | G | Em' },
    { name: 'Chorus 2', bars: 16, pattern: 'chorus', first: 'chorusIn', fill: 'roll', chords: 'C | D | G | Em | C | D | G | Em | C | D | G | Em | C | D | Bm | Em', strum: 'D-DUD-DU' },
    { name: 'Bridge', bars: 16, pattern: 'big', first: 'bigIn', chords: 'C | D | G | Em', strum: 'D-DUD-DU' },
    { name: 'Breakdown', bars: 8, pattern: 'pulse', fill: 'roll', chords: 'C | D | G | Em' },
    { name: 'Chorus 3', bars: 16, pattern: 'big', first: 'bigIn', chords: 'C | D | G | Em | C | D | G | Em | C | D | G | Em | C | D | Bm | Em', strum: 'D-DUD-DU' },
    { name: 'Outro', inst: true, bars: 8, pattern: 'tacet', fill: 'ending', chords: 'C | D | G | Em', strum: '' },
  ],
  lyrics: `[Intro]
(strings — no drums)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("I used to rule the world…")

[Verse 2]

[Chorus]
("I hear Jerusalem bells a-ringing…")

[Verse 3]

[Bridge]
("Oh-oh-oh…" — full band)

[Breakdown]
(quiet)

[Outro]
(strings)`,
});

/* ------------------------------------------------------------------
 * Green Eyes — Coldplay (2002)
 * ~128 BPM, 4/4, sounds in A. Capo 2, G shapes: verse G D Am, chorus
 * Am C G D. No published drum part found, so the groove is an approximation
 * of the record's gentle feel: hi-hat and cross-stick in the verses, a soft
 * snare backbeat in the choruses.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'green-eyes',
  title: 'Green Eyes',
  artist: 'Coldplay',
  bpm: 128,
  strum: 'D-DU-UDU',
  capo: 2,
  timeSig: '4/4',
  beats: 4,
  steps: 16,
  patterns: {
    intro: {
      HH: 'x-x-x-x-x-x-x-x-',
    },
    verse: {
      HH: 'x-x-x-x-x-x-x-x-',
      SS: '----x-------x---',
      BD: 'X-------X-------',
    },
    chorus: {
      HH: 'x-x-x-x-x-x-x-x-',
      SN: '----x-------x---',
      BD: 'X-----x-X-------',
    },
    chorusIn: {
      CR: 'x---------------',
      HH: '--x-x-x-x-x-x-x-',
      SN: '----x-------x---',
      BD: 'X-----x-X-------',
    },
    fill: {
      HH: 'x-x-x-x-x-x-----',
      SN: '------------xxxx',
      BD: 'X-------X-------',
    },
    ending: {
      CR: 'x---------------',
      BD: 'X---------------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 8, pattern: 'intro', chords: 'G | D | Am | Am' },
    { name: 'Verse 1', bars: 16, pattern: 'verse', chords: 'G | D | Am | Am' },
    { name: 'Verse 2', bars: 16, pattern: 'verse', fill: 'fill', chords: 'G | D | Am | Am' },
    { name: 'Chorus', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am | C | G | D' },
    { name: 'Interlude', inst: true, bars: 8, pattern: 'verse', chords: 'G | D | Am | Am' },
    { name: 'Verse 3', bars: 16, pattern: 'verse', fill: 'fill', chords: 'G | D | Am | Am' },
    { name: 'Chorus 2', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Am | C | G | D' },
    { name: 'Verse 4', bars: 16, pattern: 'chorus', first: 'chorusIn', chords: 'G | D | Am | Am' },
    { name: 'Outro', bars: 16, pattern: 'verse', fill: 'ending', chords: 'G | D | Am | Am' },
  ],
  lyrics: `[Intro]
(acoustic guitar)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("Honey, you are a rock…")

[Verse 2]

[Chorus]
("And if you were to ask me…")

[Interlude]
(guitar)

[Verse 3]

[Verse 4]

[Outro]
(to the end)`,
});

/* ------------------------------------------------------------------
 * Blackbird — The Beatles (1968)
 * Solo acoustic guitar with Paul's foot tapping; no drums. ~96 BPM, key of G.
 * The meter keeps shifting between 3/4, 4/4 and 2/4, so each bar is listed
 * with its own length (seq). The "drums" here are just a soft foot tap on
 * every beat. The meter map and chord placement follow common fan
 * transcriptions, which disagree in places — treat bar lengths as approximate.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
(() => {
  const m = (str) => str.split(' ').map((n) => 'tap' + n).join(' ');
  const VERSE_SEQ = m('3 4 4 4 2 4 4 2 4 4 3 4');
  const VERSE = 'G | Am7 Am7 G/B G | C A7/C# D D | B7/D# B7/D# Em Em | Cm | D | A7/C# | C | Cm | G G A7 A7 | C/G C/G G | G';
  SONGS.push({
    id: 'blackbird',
    title: 'Blackbird',
    artist: 'The Beatles',
    bpm: 96,
    strum: 'pU',
    strumBeats: 1,
    timeSig: 'mixed 3/4 · 4/4 · 2/4',
    beats: 4,
    steps: 8,
    patterns: {
      tap2: { beats: 2, steps: 4, BD: 'g-g-', HP: 'x-x-' },
      tap3: { beats: 3, steps: 6, BD: 'g-g-g-', HP: 'x-x-x-' },
      tap4: { beats: 4, steps: 8, BD: 'g-g-g-g-', HP: 'x-x-x-x-' },
    },
    sections: [
      { name: 'Intro', inst: true, seq: m('3 4 3 4'), chords: 'G | Am7 Am7 G/B G | G | Am7 Am7 G/B G' },
      { name: 'Verse 1', seq: VERSE_SEQ, chords: VERSE },
      { name: 'Interlude', inst: true, seq: m('3 4'), chords: 'G | Am7 Am7 G/B G' },
      { name: 'Verse 2', seq: VERSE_SEQ, chords: VERSE },
      { name: 'Bridge', seq: m('4 4 4 4 4 4 2 4'), chords: 'F | C/E | Dm | C | Bb6 | C | A7 | D7' },
      { name: 'Interlude 2', inst: true, seq: m('3 4'), chords: 'G | Am7 Am7 G/B G' },
      { name: 'Verse 3', seq: VERSE_SEQ, chords: VERSE },
      { name: 'Bridge 2', seq: m('4 4 4 4 4 4 2 4'), chords: 'F | C/E | Dm | C | Bb6 | C | A7 | D7' },
      { name: 'Outro', seq: m('4 4 3 3 4 3 4'), chords: 'Cm | G G A7 A7 | C/G C/G G | G | Am7 Am7 G/B G | G | G' },
    ],
    lyrics: `[Intro]
(guitar alone — foot tap only)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("Blackbird singing…")

[Verse 2]

[Bridge]
("Blackbird fly…")

[Verse 3]

[Outro]
(guitar)`,
  });
})();

/* ------------------------------------------------------------------
 * Pink + White — Frank Ocean (2016)
 * 6/8 at ~160 eighth notes per minute = ~53 dotted-quarter beats (2 per bar),
 * key of A, no capo. One loop all the way through: Cmaj7 | Bm7 | A | A.
 * Drums (programmed by Pharrell on the record) approximated: relaxed 6/8
 * with kick on 1, snare on the second big beat, flowing hi-hat.
 * Lyrics are not bundled (copyright) — paste them via Lyrics → Edit → Paste.
 * ------------------------------------------------------------------ */
SONGS.push({
  id: 'pink-white',
  title: 'Pink + White',
  artist: 'Frank Ocean',
  bpm: 53,
  strum: 'p-p-p-p-p-p-',
  timeSig: '6/8',
  beats: 2,
  steps: 12,
  patterns: {
    intro: {
      HH: 'x-x-x-x-x-x-',
      BD: 'X-----------',
    },
    verse: {
      HH: 'x-x-x-x-x-x-',
      SN: '------X-----',
      BD: 'X-------x---',
    },
    chorus: {
      HH: 'x-x-x-x-x-xo',
      SN: '------X---g-',
      BD: 'X---x---x---',
    },
    chorusIn: {
      CR: 'X-----------',
      HH: '--x-x-x-x-xo',
      SN: '------X---g-',
      BD: 'X---x---x---',
    },
    fill: {
      HH: 'x-x-x-------',
      SN: '------X-xxXX',
      BD: 'X-----------',
    },
    ending: {
      CR: 'X-----------',
      BD: 'X-----------',
    },
  },
  sections: [
    { name: 'Intro', inst: true, bars: 4, pattern: 'intro', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Verse 1', bars: 16, pattern: 'verse', fill: 'fill', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Chorus', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Verse 2', bars: 16, pattern: 'verse', fill: 'fill', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Chorus 2', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Bridge', bars: 8, pattern: 'verse', fill: 'fill', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Chorus 3', bars: 16, pattern: 'chorus', first: 'chorusIn', chords: 'Cmaj7 | Bm7 | A | A' },
    { name: 'Outro', inst: true, bars: 4, pattern: 'intro', fill: 'ending', chords: 'Cmaj7 | Bm7 | A | A' },
  ],
  lyrics: `[Intro]
(guitar and piano)
(Tap Lyrics → Edit to paste the full lyrics under these headers.)

[Verse 1]
("That's the way everyday goes…")

[Chorus]

[Verse 2]

[Bridge]

[Outro]
(to the end)`,
});
