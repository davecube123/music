/*
 * Built-in breathing patterns.
 *
 * A pattern is one or more sets of phases. A set is repeated `reps` times;
 * the whole sequence of sets is one round, and a session plays N rounds.
 *
 * Phase kinds:
 *   in       breathe in            in2   top-up sip on a full breath
 *   holdIn   hold, lungs full      out   breathe out
 *   holdOut  hold, lungs empty     rest  breathe naturally
 * `s` is seconds. `open: true` on a hold means "hold until you tap"
 * (the time is recorded in your journal); `s` is then the maximum.
 *
 * Patterns with a single set of a single repetition are timed by minutes,
 * everything else by rounds.
 */
window.BREATH_PATTERNS = [
  /* ---------------- Settle ---------------- */
  {
    id: 'cyclic-sigh',
    name: 'Cyclic Sighing',
    cat: 'settle',
    tagline: 'Double inhale, long exhale. The fastest way down.',
    how: 'Breathe in through the nose until comfortably full, then take a second short sip to fill the lungs completely. Exhale slowly through the mouth until empty.',
    science: 'In a month-long randomised trial, five minutes a day of cyclic sighing improved mood and lowered resting breathing rate more than mindfulness meditation, box breathing or cyclic hyperventilation. The second inhale re-opens collapsed alveoli and the long exhale engages the vagal brake.',
    refs: [
      { t: 'Balban et al. (2023), Cell Reports Medicine 4:100895', u: 'https://pubmed.ncbi.nlm.nih.gov/36630953/' },
    ],
    minutes: 5,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 2.5 }, { k: 'in2', s: 1 }, { k: 'out', s: 6.5 }] }],
  },
  {
    id: 'resonance',
    name: 'Resonance Breathing',
    cat: 'settle',
    tagline: '5.5 breaths a minute, in step with your heart.',
    how: 'Smooth, even breaths through the nose, never forced. Let the belly lead. Keep the transitions round, with no pauses.',
    science: 'Around 5.5–6 breaths per minute, heart rhythm, blood pressure and breathing oscillate together (cardiovascular resonance). This maximises heart-rate variability and baroreflex gain. A 2022 meta-analysis of slow-breathing studies found reliable increases in vagally mediated HRV.',
    refs: [
      { t: 'Lehrer & Gevirtz (2014), Frontiers in Psychology 5:756', u: 'https://doi.org/10.3389/fpsyg.2014.00756' },
      { t: 'Laborde et al. (2022), Neurosci. Biobehav. Rev. 138:104711', u: 'https://doi.org/10.1016/j.neubiorev.2022.104711' },
    ],
    minutes: 10,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 5.5 }, { k: 'out', s: 5.5 }] }],
  },
  {
    id: 'long-exhale',
    name: 'Long Exhale',
    cat: 'settle',
    tagline: '3 in, 7 out. Slow and exhale-weighted.',
    how: 'Inhale gently through the nose for 3, exhale slowly for 7, through the nose or pursed lips.',
    science: 'At 6 breaths a minute, an inhale-to-exhale ratio of about 0.4 produced higher HRV and more reported relaxation than a ratio above 1. The heart slows on every exhale (respiratory sinus arrhythmia), so a longer exhale means more time in that state.',
    refs: [
      { t: 'Van Diest et al. (2014), Appl. Psychophysiol. Biofeedback 39:171', u: 'https://doi.org/10.1007/s10484-014-9253-x' },
    ],
    minutes: 8,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 3 }, { k: 'out', s: 7 }] }],
  },
  {
    id: 'humming',
    name: 'Humming Breath',
    cat: 'settle',
    tagline: 'Hum on a long exhale. Bhramari.',
    how: 'Inhale through the nose for 4. Exhale for 8 with lips closed, humming a low, steady note. Feel the buzz in the face and chest.',
    science: 'Humming raises nasal nitric oxide about fifteen-fold compared with quiet exhalation, and the slow, exhale-weighted rhythm adds the same vagal benefits as other slow breathing. Humming also keeps the exhale long and steady without any counting.',
    refs: [
      { t: 'Weitzberg & Lundberg (2002), Am. J. Respir. Crit. Care Med. 166:144', u: 'https://doi.org/10.1164/rccm.200202-138BC' },
    ],
    minutes: 5,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 4 }, { k: 'out', s: 8 }] }],
  },
  {
    id: '478',
    name: '4-7-8 Wind-Down',
    cat: 'settle',
    tagline: 'A long hold and longer exhale, for sleep.',
    how: 'Inhale quietly through the nose for 4, hold for 7, exhale through the mouth with a soft whoosh for 8. Start with a few rounds. The hold should never strain.',
    science: 'The 4-7-8 rhythm is about 3 breaths a minute and heavily exhale-weighted. A controlled study found improved HRV and lower blood pressure after 4-7-8 practice, even when participants were sleep-deprived. The evidence is promising but limited.',
    refs: [
      { t: 'Vierra et al. (2022), Physiological Reports 10:e15389', u: 'https://doi.org/10.14814/phy2.15389' },
    ],
    minutes: 4,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 4 }, { k: 'holdIn', s: 7 }, { k: 'out', s: 8 }] }],
  },

  /* ---------------- Focus ---------------- */
  {
    id: 'box',
    name: 'Box Breathing',
    cat: 'focus',
    tagline: 'Four equal sides. Calm, alert, steady.',
    how: 'Inhale for 4, hold for 4, exhale for 4, hold empty for 4. Keep the holds soft, with the throat relaxed.',
    science: 'Equal-ratio breathing with holds slows breathing to about 4 per minute while keeping you alert. It was one of the active practices in the Stanford trial, where it improved mood and lowered anxiety. It is widely used in high-stress professions to regain composure without getting drowsy.',
    refs: [
      { t: 'Balban et al. (2023), Cell Reports Medicine 4:100895', u: 'https://pubmed.ncbi.nlm.nih.gov/36630953/' },
      { t: 'Röttger et al. (2021), Appl. Psychophysiol. Biofeedback 46:19', u: 'https://pubmed.ncbi.nlm.nih.gov/32757097/' },
    ],
    minutes: 5,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 4 }, { k: 'holdIn', s: 4 }, { k: 'out', s: 4 }, { k: 'holdOut', s: 4 }] }],
  },
  {
    id: 'coherent',
    name: 'Coherent Six',
    cat: 'focus',
    tagline: '5 in, 5 out. The simplest steady state.',
    how: 'Inhale for 5, exhale for 5, smooth and silent. A good default for work breaks.',
    science: 'Six breaths a minute is close to most adults\' resonance frequency. Even a single short session increases HRV and baroreflex sensitivity, and improves emotional control and attention compared with spontaneous breathing.',
    refs: [
      { t: 'Zaccaro et al. (2018), Frontiers in Human Neuroscience 12:353', u: 'https://doi.org/10.3389/fnhum.2018.00353' },
      { t: 'Steffen et al. (2017), Frontiers in Public Health 5:222', u: 'https://doi.org/10.3389/fpubh.2017.00222' },
    ],
    minutes: 6,
    sets: [{ reps: 1, phases: [{ k: 'in', s: 5 }, { k: 'out', s: 5 }] }],
  },

  /* ---------------- Charge ---------------- */
  {
    id: 'cyclic-hyper',
    name: 'Cyclic Hyperventilation',
    cat: 'charge',
    tagline: '30 deep breaths, then a short empty hold.',
    how: 'Breathe in deeply through the nose and let the breath fall out of the mouth, 30 times. Then exhale fully and hold empty for 15 seconds. Repeat.',
    science: 'This is the inhale-weighted arm of the Stanford trial. It raised positive affect and was the only practice that increased reported energy and alertness. Fast, deep breathing drives sympathetic activation and adrenaline, and the hold lets CO₂ recover.',
    refs: [
      { t: 'Balban et al. (2023), Cell Reports Medicine 4:100895', u: 'https://pubmed.ncbi.nlm.nih.gov/36630953/' },
    ],
    caution: true,
    rounds: 3,
    sets: [
      { reps: 30, phases: [{ k: 'in', s: 2 }, { k: 'out', s: 1 }] },
      { reps: 1, phases: [{ k: 'holdOut', s: 15 }] },
    ],
  },
  {
    id: 'power-retention',
    name: 'Power Breathing',
    cat: 'charge',
    tagline: '30 breaths, a held exhale as long as is comfortable, a recovery breath.',
    how: 'Take 30 full breaths: belly, chest, let go. After the last exhale, hold empty and tap when you need to breathe. Then take a deep recovery breath and hold it for 15 seconds.',
    science: 'In a controlled study, people trained in this method (popularised by Wim Hof) voluntarily raised their adrenaline and dampened their inflammatory response to an endotoxin. Your retention times are logged so you can watch them grow.',
    refs: [
      { t: 'Kox et al. (2014), PNAS 111:7379', u: 'https://doi.org/10.1073/pnas.1322174111' },
    ],
    caution: true,
    rounds: 3,
    sets: [
      { reps: 30, phases: [{ k: 'in', s: 1.5 }, { k: 'out', s: 1.5 }] },
      { reps: 1, phases: [{ k: 'holdOut', s: 180, open: true }] },
      { reps: 1, phases: [{ k: 'in', s: 2 }, { k: 'holdIn', s: 15 }, { k: 'out', s: 2 }] },
    ],
  },
  {
    id: 'kapalabhati',
    name: 'Kapalabhati',
    cat: 'charge',
    tagline: 'Quick pumping exhales. Bright and clear.',
    how: 'Sit tall. Snap the belly in to push the air out of the nose, and let the inhale happen by itself. One pump per second, then rest between rounds.',
    science: 'High-frequency yoga breathing at 1–2 Hz improved performance on attention and cancellation tasks immediately afterwards, and shifts heart-rate variability towards sympathetic dominance, an alert, ready state.',
    refs: [
      { t: 'Telles et al. (2008), Indian J. Med. Sci. 62:20', u: 'https://pubmed.ncbi.nlm.nih.gov/18239268/' },
      { t: 'Telles et al. (2011), BioPsychoSocial Medicine 5:4', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3088536/' },
    ],
    caution: true,
    rounds: 3,
    sets: [
      { reps: 45, phases: [{ k: 'out', s: 0.6 }, { k: 'in', s: 0.7 }] },
      { reps: 1, phases: [{ k: 'rest', s: 30 }] },
    ],
  },
];
