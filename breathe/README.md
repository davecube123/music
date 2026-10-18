# Breathe

A minimal breathing app for **settling** (downregulating) and **charging** (upregulating) your physiology. You can design your own patterns and practise them with audio cues and background music, and a journal tracks your sessions.

It's a PWA like Backbeat: plain HTML/CSS/JS, no build step, works offline, installable to the home screen. Once Pages is deployed it lives at `<your-pages-url>/breathe/`.

## Built-in patterns (with the research behind them)

| Pattern | Rhythm | Effect | Evidence |
|---|---|---|---|
| Cyclic Sighing | in 2.5 · top-up 1 · out 6.5 | Settle | Balban et al. 2023, *Cell Rep Med* (RCT; beat mindfulness for mood and resting breathing rate) |
| Resonance Breathing | 5.5 / 5.5 | Settle | Lehrer & Gevirtz 2014; Laborde et al. 2022 meta-analysis (HRV ↑) |
| Long Exhale | 3 / 7 | Settle | Van Diest et al. 2014 (low inhale-to-exhale ratio → more HRV and relaxation) |
| Humming Breath | 4 / 8 hum | Settle | Weitzberg & Lundberg 2002 (nasal nitric oxide ↑ about 15×) |
| 4-7-8 Wind-Down | 4 · hold 7 · 8 | Settle / sleep | Vierra et al. 2022 (HRV ↑, BP ↓; limited evidence) |
| Box Breathing | 4 · 4 · 4 · 4 | Focus | Balban et al. 2023; Röttger et al. 2021 |
| Coherent Six | 5 / 5 | Focus | Zaccaro et al. 2018 review; Steffen et al. 2017 |
| Cyclic Hyperventilation | 30 × (in 2 / out 1), hold empty 15 s | Charge | Balban et al. 2023 (energy and positive affect ↑) |
| Power Breathing | 30 breaths, hold until you tap, recovery hold 15 s | Charge | Kox et al. 2014, *PNAS* (voluntary adrenaline ↑) |
| Kapalabhati | 45 quick pumps, 30 s rest | Charge | Telles et al. 2008, 2011 (attention ↑, sympathetic shift) |

Each pattern's screen explains how to do it and why it works, and links to the papers.

## Features

- **Pattern designer.** Build a pattern from steps: inhale, top-up inhale, hold full, exhale, hold empty, natural breathing. Each step has its own length. Repeat a set (e.g. 30 fast breaths), and chain sets into rounds (breaths → hold → recovery). A hold can be *until you tap*, and that time is logged. A breath-volume curve previews the rhythm live. The app tells you whether the rhythm reads as settle, focus or charge, judged from breathing rate and exhale weighting.
- **Audio cues.** A rising tone to inhale, a falling tone to exhale, and a bell to hold. Optional voice prompts ("Breathe in", "Hold", "Round two"). An optional *breath sound* swells and falls with each breath, so you can follow with your eyes closed. Quick breaths get soft ticks and a rep counter instead of narration. Android phones also vibrate.
- **Background music,** generated live: *Solemn* (low strings in D minor), *Warm* (soft major pads), *Percussive* (frame drum and shaker), *Ocean* and *Bowls*. The drum tempo and chord changes lock to your breathing cycle. Cues and music have separate volumes.
- **Session.** A breathing orb, a phase ring, the countdown, breath or round counter, and time elapsed and remaining. Pause, mute and end are one tap each. The screen stays awake.
- **Tracking.** An optional check-in rates tension and energy before and after each session. The journal shows today, this week, your streak, a 14-day chart by category, and your average tension and energy shift per category. Breath-hold records come with a trend line. You can add notes to sessions and export everything as CSV. All data stays on your device.

For wellbeing, not medical treatment. Do the charge patterns sitting or lying down, never in water or while driving.
