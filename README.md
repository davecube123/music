# Backbeat: song drum metronome

A metronome that plays a song's actual drum pattern, section by section, at whatever tempo you set. It shows the song's lyrics as it plays.

It's a **Progressive Web App (PWA)**: plain HTML/CSS/JS with no build step. You can install it to your phone's home screen and it works offline.

## Features

- **Song-accurate drums**: kick, snare, hi-hat (open/closed/pedal), cross-stick, ride (+bell), crash and 3 toms, all synthesized with Web Audio. Hits can be accents, normal hits or ghost notes.
- **Song structure strip**: tap Intro, Verse, Chorus… to jump there; the jump happens on the next bar so you stay in time.
- **Tempo**: big BPM readout, hold −/+ for fast changes, a slider, typed entry, tap tempo, and 50/75/90/100% practice presets. Your tempo is remembered for each song.
- **Practice tools**: count-in, click on/off, loop the current section, step bar by bar, mute single drums (tap the drum name), separate drum and click volumes.
- **Live drum grid** with a moving playhead. Turn on **Edit** to fix a pattern by tapping cells. Edits are saved on your device.
- **Chord shapes**: the *Now* card (pinned at the top) shows the current chord's guitar diagram big and the next one small, with your position, beat dots and capo. The **Chords** tab lists every shape in the song and a bar-by-bar chart that follows playback; tap a bar to go there. **Lyrics**, **Chords** and **Drums** are tabs so you see one view at a time, and each lyric part shows its chords.
- **Chord cue** (on/off, own volume): a soft held tone (root note with the chord faint behind it) sounds on each chord change, so you stay anchored to the key and the changes. It's deliberately not rhythmic, so the drums carry the groove. The current and next chord are shown big, with the capo position.
- **Lyrics** follow the song: the current section is highlighted and scrolls into view, and the line being sung is estimated. Use **Edit** to paste or fix lyrics; they're saved on your device.
- The screen stays awake while playing, and keyboard shortcuts work on desktop (Space, ↑/↓, T = tap, L = loop).

## Run it

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

### Put it on your phone

1. Enable GitHub Pages: repo **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes on every push to `main`.
2. Open the Pages URL on your phone:
   - **Android (Chrome):** menu → *Install app* / *Add to Home screen*.
   - **iPhone (Safari):** Share → *Add to Home Screen*.
3. If you want a real **APK** later, paste the Pages URL into <https://www.pwabuilder.com> → *Android* and it builds a Play-Store-ready package from this same app.

## Adding songs

Songs live in `songs.js`; the format is documented at the top of that file. A drum part is written as one text line per drum, one character per step:

```js
verse: {
  HH: 'x-x-x-x-x-x-x-x-',   // 8th-note hi-hat
  SN: '----X-------X---',   // backbeat on 2 & 4
  BD: 'X-------X-X-----',
},
```

`X` accent · `x` hit · `g` ghost · `o` open hi-hat / ride bell · `-` rest

Lyrics for copyrighted songs aren't bundled. Paste them in the app with **Lyrics → Edit**. They stay on your device.
