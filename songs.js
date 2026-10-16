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
 *   sections  [{ name, bars, pattern, first?, fill? }] — the song's arrangement in order.
 *             `first` replaces the first bar (e.g. a crash bar), `fill` replaces the last bar.
 *   lyrics    optional text. Headers in [brackets] are matched to section names.
 *             A header like [Chorus] also matches "Chorus 2", so a chorus can be written once.
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
    { name: 'Intro',    bars: 4, pattern: 'intro', fill: 'fill' },
    { name: 'Verse 1',  bars: 8, pattern: 'verse', first: 'crash', fill: 'fill' },
    { name: 'Chorus',   bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill' },
    { name: 'Verse 2',  bars: 8, pattern: 'verse', first: 'crash', fill: 'fill' },
    { name: 'Chorus 2', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill' },
    { name: 'Outro',    bars: 1, pattern: 'ending' },
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
    { name: 'Intro',   bars: 4, pattern: 'intro', fill: 'fill' },
    { name: 'Verse 1', bars: 8, pattern: 'shuffle', first: 'shuffleCrash', fill: 'fill' },
    { name: 'Verse 2', bars: 8, pattern: 'shuffle', first: 'shuffleCrash', fill: 'fill' },
    { name: 'Verse 3', bars: 8, pattern: 'rideShuffle', first: 'shuffleCrash', fill: 'fill' },
    { name: 'Outro',   bars: 1, pattern: 'end' },
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
    { name: 'Verse',  bars: 8, pattern: 'verse', fill: 'fill' },
    { name: 'Chorus', bars: 8, pattern: 'chorus', first: 'chorusIn', fill: 'fill' },
  ],
});
