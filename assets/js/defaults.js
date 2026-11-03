// Standard-Einstellungen. Was du im Tab "Einstellungen" änderst, wird im Browser gespeichert
// und überschreibt diese Werte ("Auf Standard zurücksetzen" holt sie wieder).
// Songs: Fragen, Skalen und Gewichte aus "Song Ratings.xlsx" (Tabs Scale + Weights).
// id = feste Kennung einer Frage (Antworten werden darunter gespeichert), w = Gewicht, na = N/A erlaubt.

// Fallback-Skala für Fragen ohne eigene Beschreibungen (aus dem Guide-Tab der Tabelle)
const GENERIC_SCALE = {
  1: 'Very poor — the element fails badly.', 2: 'Very poor — it seriously undermines the whole.',
  3: 'Below average — significant weaknesses.', 4: 'Below average — limited effectiveness.',
  5: 'Average — works adequately, with strengths and weaknesses.', 6: 'Good — noticeable strengths, some weaknesses.',
  7: 'Very good — strong execution.', 8: 'Very good — strong, with relatively few weaknesses.',
  9: 'Exceptional — only minor limitations.', 10: 'Near-perfect — a benchmark for this criterion.',
};

const DEFAULT_CONFIG = {
  songs: [
    {
      id: "c1", name: "Personal Connection", w: 0.25, color: "#38bdf8",
      qs: [
        { id: "q1", q: "How much do I enjoy listening to this song?", w: 0.3, na: false,
          think: "Think: how does it feel while it's playing, right now?",
          scale: {"1": "I actively dislike it; I'd skip it within seconds.", "2": "Unpleasant to sit through; I only finish it if I have to.", "3": "Mostly boring or irritating, with maybe one moment I don't mind.", "4": "Tolerable in the background, but I'd never choose it.", "5": "Neutral: fine while it plays, forgotten when it ends.", "6": "Pleasant. I enjoy it, but it doesn't excite me.", "7": "I genuinely enjoy it and I'm happy when it comes on.", "8": "I really like it; it's one of the highlights of my playlist.", "9": "I love listening to it; it lifts my mood almost every time.", "10": "Pure joy from start to finish; one of my favourite listening experiences ever."} },
        { id: "q2", q: "How strong is my emotional connection to it?", w: 0.3, na: false,
          think: "Think: does it make me FEEL something, beyond just enjoying it?",
          scale: {"1": "It makes me feel nothing at all, or actively puts me off.", "2": "Emotionally empty; I notice it's trying, but I'm untouched.", "3": "A faint feeling now and then that's gone immediately.", "4": "I can tell what it wants me to feel, but I don't really feel it.", "5": "It creates a mild mood while it plays, nothing that lasts.", "6": "It moves me a little in certain moments.", "7": "It reliably makes me feel something real.", "8": "It hits me hard; some parts give me chills or a lump in my throat.", "9": "Deeply moving; it's tied to strong feelings or memories.", "10": "Overwhelming; it touches me like almost no other song does."} },
        { id: "q3", q: "How relatable is the song to me personally?", w: 0.2, na: false,
          think: "Think: do I see my own life, thoughts or feelings in it?",
          scale: {"1": "Nothing in it connects to my life, thoughts or feelings.", "2": "Its world feels foreign or the opposite of mine.", "3": "One small detail feels familiar; the rest doesn't.", "4": "I understand it, but it's clearly someone else's experience.", "5": "I recognise some general feelings, but nothing personal.", "6": "Several parts reflect things I've felt or lived through.", "7": "It clearly reflects my own experiences or feelings.", "8": "In many places it feels like it's about me.", "9": "It describes my feelings better than I could myself.", "10": "It feels written about my life; I see myself in nearly every line."} },
        { id: "q4", q: "How much do I want to replay it?", w: 0.2, na: false,
          think: "Think: when it ends, do I want it again?",
          scale: {"1": "I never want to hear it again.", "2": "Once was enough; I'd avoid it.", "3": "Maybe again someday, if it happens to come on.", "4": "I won't skip it, but I'd never choose to replay it.", "5": "I'd play it once in a while.", "6": "I come back to it on purpose now and then.", "7": "I replay it regularly.", "8": "I often put it on repeat.", "9": "I can play it many times in a row without getting tired of it.", "10": "I could loop it endlessly; it never wears off."} },
      ],
    },
    {
      id: "c2", name: "Production & Sound", w: 0.18, color: "#14b8a6",
      qs: [
        { id: "q5", q: "How good is the overall sound quality and mix?", w: 0.25, na: false,
          think: "Think: can I hear everything clearly and does it sound good? Judge it relative to the style (intentional lo-fi is fine).",
          scale: {"1": "Broken mix: vocals buried, unintended clipping or distortion, hard to listen to.", "2": "Major technical problems throughout that ruin the listening.", "3": "Muddy or unbalanced; important parts get lost often.", "4": "Noticeable issues (harsh highs, boomy bass, levels off) that distract me.", "5": "Acceptable: nothing wrong, nothing impressive.", "6": "Clean and balanced, with a minor issue or two.", "7": "Clear, well-balanced mix where every part can be heard.", "8": "Polished and full; it sounds great on any speakers or headphones.", "9": "Excellent depth, clarity and dynamics; nearly flawless.", "10": "Reference quality for its style; I'd use it to test headphones."} },
        { id: "q6", q: "How creative and distinctive is the production?", w: 0.25, na: false,
          think: "Think: does it sound like ITS OWN thing, or like a template?",
          scale: {"1": "Generic template sound; could be any song.", "2": "Very predictable and copied-sounding.", "3": "Mostly standard, with one small idea.", "4": "Some familiar tricks, little personality.", "5": "Solid but typical for the genre.", "6": "A few interesting choices that give it some character.", "7": "A recognisable sound with several creative ideas.", "8": "Distinctive; I'd recognise this production quickly.", "9": "Inventive and bold; it surprises me in ways that work.", "10": "Groundbreaking or totally unique; nothing else sounds like it."} },
        { id: "q7", q: "How effective is the instrumental and sound selection?", w: 0.25, na: false,
          think: "Think: are these the RIGHT instruments and sounds, and do they work together?",
          scale: {"1": "Sounds clash or feel cheap and wrong for the song.", "2": "Several elements feel out of place or annoying.", "3": "Weak choices; the arrangement feels thin or cluttered.", "4": "Works in parts, but some sounds don't fit.", "5": "Functional; the instruments do their job without standing out.", "6": "Good choices overall, with a few memorable sounds.", "7": "Well-chosen sounds that support each other.", "8": "Every element feels intentional; some sounds are standout moments.", "9": "Excellent palette; the textures and layers make the song come alive.", "10": "Perfect selection; I can't imagine any sound being different."} },
        { id: "q8", q: "How well does the production fit the song's mood and intention?", w: 0.25, na: false,
          think: "Think: does the SOUND tell the same story as the song?",
          scale: {"1": "The production works against the song (e.g. a cheerful sound on a devastating song, unintentionally).", "2": "Clearly mismatched; it confuses the mood.", "3": "Often feels off from what the song wants.", "4": "Partly fits, but sometimes distracts from the message.", "5": "Neutral; it doesn't hurt or help the mood much.", "6": "Mostly supports the mood.", "7": "Clearly enhances the mood and intention.", "8": "Strongly amplifies the emotions; the sound tells the story too.", "9": "The production and the song feel inseparable.", "10": "Perfect fusion; the sound itself IS the mood."} },
      ],
    },
    {
      id: "c3", name: "Lyrics & Writing", w: 0.18, color: "#8b5cf6",
      qs: [
        { id: "q9", q: "How well-written are the lyrics?", w: 0.25, na: false,
          think: "Think: craft. Do the lines flow, hold together and sound skilful? (Not whether I relate.)",
          scale: {"1": "Clumsy, incoherent or lazy throughout.", "2": "Many weak lines, poor flow, clichés everywhere.", "3": "Weak writing with a few okay lines.", "4": "Understandable but bland; the rhymes or flow feel forced in places.", "5": "Competent; it does the job, nothing special.", "6": "Good writing with some nice lines.", "7": "Well-crafted; it flows naturally and holds together.", "8": "Strong lyrics with several memorable lines.", "9": "Excellent; tight and skilful, with almost no weak spots.", "10": "Masterful; every line earns its place."} },
        { id: "q10", q: "How much depth or meaning do they have?", w: 0.2, na: false,
          think: "Think: is there something to think about beneath the surface?",
          scale: {"1": "No meaning at all; just filler words.", "2": "Very shallow; one obvious idea, repeated.", "3": "Surface-level; little to think about.", "4": "Some meaning, but it stays simple and obvious.", "5": "A clear message with modest depth.", "6": "Some layers or ideas worth thinking about.", "7": "Meaningful; it offers real insight or emotion.", "8": "Rich; I find new meanings on repeated listens.", "9": "Profound; it stays with me and makes me reflect.", "10": "Exceptionally deep; I could analyse it for hours."} },
        { id: "q11", q: "How original are the ideas and expressions?", w: 0.2, na: false,
          think: "Think: have I heard this said this way before?",
          scale: {"1": "Entirely clichés I've heard a thousand times.", "2": "Nearly all stock phrases and stock ideas.", "3": "Mostly familiar, with a rare fresh line.", "4": "Common ideas expressed in common ways.", "5": "A familiar topic, but with a few personal touches.", "6": "Some fresh angles or expressions.", "7": "A clearly original perspective or way of phrasing things.", "8": "Many lines I've never heard expressed this way.", "9": "Very fresh; it says familiar things in surprising ways.", "10": "Completely original; no one else could have written this."} },
        { id: "q12", q: "How effective are the imagery, word choice, and phrasing?", w: 0.2, na: false,
          think: "Think: can I PICTURE it, and are the words precise and striking?",
          scale: {"1": "Vague, flat or wrong words; no images at all.", "2": "Lazy word choice; the images are clumsy or confused.", "3": "Mostly plain, with few images and weak phrasing.", "4": "Occasional images, but the phrasing is often generic.", "5": "Decent, clear wording with some images.", "6": "Several vivid images or well-turned phrases.", "7": "Vivid and precise; I can picture scenes.", "8": "Striking phrasing and imagery throughout.", "9": "Beautiful; full of lines I want to quote.", "10": "Every word feels perfectly chosen; the images are unforgettable."} },
        { id: "q13", q: "Free of awkward, forced, or cringe lines? (REVERSED: 10 = none)", w: 0.15, na: false,
          think: "Think: does any line pull me out of the song or make me wince? Higher = fewer bad lines.",
          scale: {"1": "Constant cringe; the lyrics are ruined by it.", "2": "Many awkward or forced lines that pull me out again and again.", "3": "Frequent awkward moments that hurt the song.", "4": "Several clunky lines I notice on every listen.", "5": "A few awkward lines that bother me a bit.", "6": "One or two weak lines, mildly distracting.", "7": "One slightly clumsy line, but it's easy to ignore.", "8": "Almost nothing awkward; any flaw is tiny.", "9": "No awkward lines that I can find.", "10": "Nothing awkward at all, and even the risky lines land perfectly."} },
      ],
    },
    {
      id: "c4", name: "Musicality & Catchiness", w: 0.18, color: "#ec4899",
      qs: [
        { id: "q14", q: "How good is the melody?", w: 0.25, na: false,
          think: "Think: the tune itself. Is it beautiful, well-shaped, satisfying?",
          scale: {"1": "No real melody, or an unpleasant one.", "2": "Monotone, aimless or grating.", "3": "A weak melody with little shape.", "4": "Simple and forgettable.", "5": "An okay melody; it works but doesn't stand out.", "6": "A pleasant melody with a nice moment or two.", "7": "A strong melody that flows well.", "8": "A beautiful, memorable melody with standout parts.", "9": "Outstanding; the melody gives me chills or sticks instantly.", "10": "A perfect, timeless melody."} },
        { id: "q15", q: "How effective is the vocal performance?", w: 0.2, na: false,
          think: "Think: does the voice deliver the song? Effectiveness matters more than technical perfection.",
          scale: {"1": "Off-key, strained or lifeless in a way that ruins the song.", "2": "Weak vocals with many technical or emotional problems.", "3": "Shaky; it struggles in important parts.", "4": "Technically okay but emotionally flat (or the other way round).", "5": "Solid but unremarkable.", "6": "A good performance with some expressive moments.", "7": "Confident, expressive, and a good fit for the song.", "8": "Impressive; strong emotion AND strong control.", "9": "Exceptional; the voice carries the whole song.", "10": "Iconic; I can't imagine anyone else singing it."} },
        { id: "q16", q: "How well does the structure and pacing work?", w: 0.2, na: false,
          think: "Think: does it build, move and end at the right moments, or does it drag?",
          scale: {"1": "Chaotic or dragging, with no sense of direction.", "2": "Badly paced; parts feel too long or random.", "3": "Repetitive or disjointed in many places.", "4": "Some sections drag or end awkwardly.", "5": "A standard structure that works fine.", "6": "Flows well, with a decent build.", "7": "Well-paced; the sections connect naturally and build.", "8": "Great dynamics; it builds and releases at the right moments.", "9": "Excellent; never a dull second, and the transitions are satisfying.", "10": "Perfectly structured; every section lands exactly when it should."} },
        { id: "q17", q: "How catchy and memorable is the song?", w: 0.15, na: false,
          think: "Think: what stays in my head AFTER it's over?",
          scale: {"1": "I can't remember anything about it afterwards.", "2": "Barely anything sticks.", "3": "A vague bit sticks, briefly.", "4": "One part comes back to me once in a while.", "5": "I remember the chorus or hook when it plays.", "6": "The hook stays with me for a while.", "7": "It gets stuck in my head regularly.", "8": "Very catchy; I hum it without thinking.", "9": "It sticks instantly and stays for days.", "10": "Unforgettable; one listen and it's stuck forever."} },
        { id: "q18", q: "How enjoyable is it to sing along to?", w: 0.1, na: false,
          think: "Think: is it FUN to join in (not whether I sing it well)?",
          scale: {"1": "Impossible or unpleasant to sing along to.", "2": "Awkward; I don't even want to try.", "3": "Hard to follow; I only manage a word or two.", "4": "I can join in a bit, but it's not fun.", "5": "Sometimes I sing along to parts.", "6": "Fun to sing parts of, especially the chorus.", "7": "I enjoy singing along to most of it.", "8": "I almost always sing along.", "9": "Super fun; I sing the whole thing out loud.", "10": "One of the best sing-along songs I know."} },
        { id: "q19", q: "How much does it make me want to scream or belt along? (N/A if not meant to be)", w: 0.1, na: true,
          think: "Think: does it pull a loud, cathartic release out of me? If the song isn't meant for that, type N/A.",
          scale: {"1": "It's meant to be loud, but it leaves me completely cold.", "2": "It tries to be big, but I feel no urge at all.", "3": "A tiny urge in one moment.", "4": "A mild urge that I hold back easily.", "5": "Some parts make me want to sing loudly.", "6": "I raise my voice for the big moments.", "7": "I want to belt the chorus.", "8": "I scream or belt along whenever I can.", "9": "A huge release; I can't hold back.", "10": "Total catharsis; I'd scream it at full power every time."} },
      ],
    },
    {
      id: "c5", name: "Concept & Artistic Vision", w: 0.13, color: "#f59e0b",
      qs: [
        { id: "q20", q: "How good or compelling is the central concept?", w: 0.25, na: false,
          think: "Think: the IDEA alone, before how well it's done. Is it interesting?",
          scale: {"1": "No concept, or a bad or confusing one.", "2": "A very weak, overused idea.", "3": "A thin idea with little interest.", "4": "A basic idea, nothing special.", "5": "A clear, decent idea.", "6": "An interesting concept.", "7": "Compelling; it makes me curious.", "8": "A strong, memorable concept.", "9": "A brilliant idea I'd love to tell others about.", "10": "An extraordinary concept that defines the song."} },
        { id: "q21", q: "How well does the song execute its concept?", w: 0.3, na: false,
          think: "Think: do the lyrics, sound and structure actually DELIVER the idea?",
          scale: {"1": "The song fails its own idea completely.", "2": "The concept barely shows; it's mostly lost.", "3": "Poorly executed; many parts don't serve it.", "4": "Partly realised, but inconsistent.", "5": "Adequately carried out.", "6": "Mostly well executed, with some gaps.", "7": "Well executed; most elements serve the idea.", "8": "Strongly executed; lyrics, sound and structure all support it.", "9": "Excellent execution with only tiny gaps.", "10": "Flawless; every element realises the concept."} },
        { id: "q22", q: "How well does it fit the album's overall concept? (N/A for standalone singles)", w: 0.25, na: true,
          think: "Think: does it belong on THIS album, and does it strengthen it? Type N/A for singles.",
          scale: {"1": "It feels like it belongs to a completely different album.", "2": "It clashes with the album's concept.", "3": "A weak link that doesn't fit well.", "4": "Loosely connected, but it feels out of place.", "5": "Fits okay; it neither strengthens nor weakens the album.", "6": "Fits well with the album.", "7": "Clearly part of the album's world.", "8": "It strengthens the album's concept.", "9": "A key piece; the album would feel incomplete without it.", "10": "The heart of the album; it defines the concept."} },
        { id: "q23", q: "How well does the song achieve its intended purpose?", w: 0.2, na: false,
          think: "Think: whatever it's FOR (party, heartbreak, anger, comfort...), does it get there?",
          scale: {"1": "It completely fails at what it's trying to do.", "2": "It mostly misses its goal.", "3": "It hits its goal only in moments.", "4": "It partly succeeds, but falls short.", "5": "It achieves its purpose adequately.", "6": "It mostly achieves its purpose.", "7": "It clearly succeeds at what it wants.", "8": "It succeeds strongly.", "9": "It achieves its purpose brilliantly.", "10": "It achieves its purpose perfectly; it couldn't do it better."} },
      ],
    },
    {
      id: "c6", name: "Artist Identity & Persona", w: 0.08, color: "#6366f1",
      qs: [
        { id: "q24", q: "How distinctive and recognizable is the artist's identity?", w: 0.25, na: false,
          think: "Think: would I know it's THEM without being told? (At the time of release.)",
          scale: {"1": "Anonymous; it could be anyone.", "2": "Very generic; it blends into the trends.", "3": "Hard to recognise; few personal traits.", "4": "Some traits, but mostly interchangeable.", "5": "Recognisable if I know the artist well.", "6": "A clear style with some unique traits.", "7": "A recognisable identity.", "8": "Very distinctive; I'd recognise them in seconds.", "9": "Instantly unmistakable.", "10": "Iconic; a one-of-a-kind identity."} },
        { id: "q25", q: "How well does the song fit the artist's persona at that time?", w: 0.35, na: false,
          think: "Think: does it match who the artist was IN THAT ERA (not now)?",
          scale: {"1": "Totally out of character, in a bad way.", "2": "Feels like a mismatch or a cash grab.", "3": "Doesn't really fit who they were.", "4": "Fits loosely, but feels a bit off.", "5": "Fits okay.", "6": "Fits well.", "7": "Clearly fits their persona at the time.", "8": "Strongly embodies who they were.", "9": "A perfect expression of that era of the artist.", "10": "Defines that era; the song IS that persona."} },
        { id: "q26", q: "How convincing and intentional does the artistic presentation feel?", w: 0.2, na: false,
          think: "Think: do I BELIEVE it, and does every choice feel deliberate? (Understated can score 10 too.)",
          scale: {"1": "Feels fake, forced or careless.", "2": "Unconvincing; I don't believe it.", "3": "Often feels unsure or try-hard.", "4": "Somewhat convincing, but uneven.", "5": "Believable enough.", "6": "Convincing, with clear intention.", "7": "Confident and intentional.", "8": "Very convincing; I fully buy it.", "9": "Totally committed; every choice feels deliberate.", "10": "Completely authentic and intentional on every level."} },
        { id: "q27", q: "How meaningfully does the song develop or express the artist's identity?", w: 0.2, na: false,
          think: "Think: does it show me who they are, or add something new to it?",
          scale: {"1": "Says nothing about the artist, or even undermines who they are.", "2": "Very little expression of identity.", "3": "Hints at an identity, but only shallowly.", "4": "Some expression, but it repeats old ground without adding anything.", "5": "Expresses their identity adequately.", "6": "Shows a meaningful side of them.", "7": "Clearly expresses or develops who they are.", "8": "Adds a new, meaningful layer to their identity.", "9": "A major step in their development.", "10": "A defining statement of who the artist is."} },
      ],
    },
  ],

  // Album-Fragen: Platzhalter – in den Einstellungen umbenennen, ergänzen oder löschen.
  albums: [
    {
      id: 'a1', name: 'Album as a Whole', w: 0.5, color: '#38bdf8',
      qs: [
        { id: 'aq1', q: 'How well does the album work as one complete body of work?', w: 0.4, na: false, think: 'Think: is it more than just a collection of songs?' },
        { id: 'aq2', q: 'How good are the tracklist order and flow?', w: 0.3, na: false, think: 'Think: do the songs lead into each other naturally?' },
        { id: 'aq3', q: 'How consistent is the quality across all songs?', w: 0.3, na: false, think: 'Think: are there weak spots or skips?' },
      ],
    },
    {
      id: 'a2', name: 'Concept & Era', w: 0.3, color: '#8b5cf6',
      qs: [
        { id: 'aq4', q: 'How strong is the album concept or era?', w: 0.5, na: false, think: 'Think: is there a clear idea or world behind it?' },
        { id: 'aq5', q: 'How well do the visuals, cover and aesthetic fit?', w: 0.5, na: false, think: 'Think: does everything around the music tell the same story?' },
      ],
    },
    {
      id: 'a3', name: 'Personal', w: 0.2, color: '#ec4899',
      qs: [
        { id: 'aq6', q: 'How much do I enjoy listening to the album start to finish?', w: 0.5, na: false, think: 'Think: would I put on the whole album?' },
        { id: 'aq7', q: 'How much has this album shaped me?', w: 0.5, na: false, think: 'Think: is it tied to a phase of my life?' },
      ],
    },
  ],

  // Wie stark die Song-Bewertungen in den Album-Score eingehen
  albumRules: {
    songWeight: 0.5,       // Modus "Vollständig": alle Songs müssen bewertet sein
    songWeightLight: 0.25, // Modus "Schnell": nur bewertete Songs zählen, mit weniger Gewicht
  },
};
