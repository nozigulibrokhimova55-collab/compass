// Sample classroom data used across the demo workspace.

export type Activity = {
  id: string
  duration: string
  tag: string
  title: string
  description: string
}

export type Cohort = {
  id: string
  name: string
  shortName: string
  students: number
  next: string
  unit: string
  status: { label: string; tone: 'alert' | 'clear' | 'muted' }
  statusDetail: string
  diagnostic: {
    quiz: string
    subject: string
    completed: number
    misconception: string
    affected: number
    questions: string
    bias: string
    flawLabel: string
    otherLabel: string
    confidence: string
  } | null
  plan: Activity[]
}

export const COHORTS: Cohort[] = [
  {
    id: 'ap-physics-p3',
    name: 'AP Physics 1: Period 3',
    shortName: 'AP Physics 1 (Period 3)',
    students: 28,
    next: 'Tomorrow 9:00 AM',
    unit: 'Newton’s Laws of Motion',
    status: { label: 'Misconception Alert', tone: 'alert' },
    statusDetail: 'Active focus',
    diagnostic: {
      quiz: 'Quiz #4 Diagnostic',
      subject: 'Physics • Newton’s Laws',
      completed: 28,
      misconception: 'Most students believe a moving object needs continuous force to stay in motion.',
      affected: 21,
      questions: 'questions 3 and 7',
      bias: 'Aristotelian Impulse Bias',
      flawLabel: 'Impetus Fallacy (Q3 and Q7)',
      otherLabel: 'Inertial Conservation',
      confidence: 'High (98.4%)',
    },
    plan: [
      {
        id: 'p3-1',
        duration: '5-Min Demonstration',
        tag: 'Zero Friction Concept',
        title: 'Air table puck vs. sandpaper block',
        description: 'Show how friction slows things down, rather than momentum running out.',
      },
      {
        id: 'p3-2',
        duration: '7-Min Peer Discussion',
        tag: 'Socratic Probe',
        title: 'Deep space inertia: Why does the Voyager probe keep moving with its engines turned off?',
        description: 'Pair discussion. Students explain why moving objects persist without active propulsion.',
      },
      {
        id: 'p3-3',
        duration: '3-Min Individual Pulse Check',
        tag: 'Exit Signal',
        title: 'Exit check: Two quick qualitative vector diagrams on frictionless tracks',
        description: 'Quick free-body diagrams to verify updated understanding before dismissal.',
      },
    ],
  },
  {
    id: 'honors-chem-p5',
    name: 'Honors Chemistry: Period 5',
    shortName: 'Honors Chemistry (Period 5)',
    students: 24,
    next: 'Tomorrow 1:15 PM',
    unit: 'Stoichiometry & Limiting Reactants',
    status: { label: 'All clear', tone: 'clear' },
    statusDetail: '92% mastery',
    diagnostic: {
      quiz: 'Quiz #3 Diagnostic',
      subject: 'Chemistry • Stoichiometry',
      completed: 24,
      misconception: 'A few students assume the reactant with the smaller mass is always the limiting one.',
      affected: 4,
      questions: 'question 5',
      bias: 'Mass–Mole Conflation',
      flawLabel: 'Mass-as-limiter (Q5)',
      otherLabel: 'Mole-ratio reasoning',
      confidence: 'High (95.1%)',
    },
    plan: [
      {
        id: 'p5-1',
        duration: '4-Min Demonstration',
        tag: 'Particle Model',
        title: 'Sandwich assembly: bread vs. cheese slices',
        description: 'Count “molecules” of sandwiches to show that ratios, not mass, decide what runs out first.',
      },
      {
        id: 'p5-2',
        duration: '6-Min Small Groups',
        tag: 'Worked Contrast',
        title: 'Two balanced equations, same masses, different limiting reactants',
        description: 'Groups convert to moles before deciding, then compare with their first instinct.',
      },
    ],
  },
  {
    id: 'intro-physics-p1',
    name: 'Introductory Physics: Period 1',
    shortName: 'Introductory Physics (Period 1)',
    students: 31,
    next: 'Tomorrow 8:00 AM',
    unit: '1D Kinematics & Free Fall',
    status: { label: 'Review complete', tone: 'muted' },
    statusDetail: 'Synced yesterday',
    diagnostic: null,
    plan: [],
  },
]

export type ApprovalItem = {
  id: string
  kind: string
  meta: string
  title: string
  detail: string
  action: string
  actionIcon: string
  primary: boolean
  done: string
}

export const APPROVALS: ApprovalItem[] = [
  {
    id: 'frq',
    kind: 'Free Response AI Diagnostic',
    meta: 'Period 3',
    title: 'Newton’s 3rd Law: 7 short answers ready to check. Includes a flagged edge case for Marcus Reid.',
    detail: 'Check phrasing vs. conceptual gap on action-reaction pairs.',
    action: 'Review & Approve',
    actionIcon: 'arrow_forward',
    primary: true,
    done: 'Free-response diagnostics approved',
  },
  {
    id: 'family',
    kind: 'Parent Narrative Portal',
    meta: 'Weekly Digest',
    title: 'Weekly family notes: Period 3 updates ready (28 students).',
    detail: 'Includes conversation starters for home review.',
    action: 'Review Sample & Send All',
    actionIcon: 'send',
    primary: false,
    done: '28 family notes sent',
  },
  {
    id: 'practice',
    kind: 'Adaptive Differentiated Tasks',
    meta: 'Target Practice',
    title: 'Targeted practice: 4 custom problem sets ready for different student groups.',
    detail: 'Grouped by fundamentals, incline planes, and pulley setups.',
    action: 'Approve Practice Sets',
    actionIcon: 'done_all',
    primary: true,
    done: '4 practice sets assigned',
  },
]

export const FREE_RESPONSES = [
  { student: 'Marcus Reid', answer: 'The truck pushes harder on the car because it is heavier, so the car gets hurt more.', flag: 'Edge case', note: 'Conflates force with damage/acceleration.' },
  { student: 'Ava Thompson', answer: 'Both forces are equal and opposite; the car accelerates more because it has less mass.', flag: 'Mastery', note: 'Correct action-reaction reasoning.' },
  { student: 'Jun Seo', answer: 'Equal forces, but they act on different objects so they do not cancel.', flag: 'Mastery', note: 'Explicitly identifies separate bodies.' },
  { student: 'Priya Natarajan', answer: 'The forces are equal, I think, but the truck wins because it is moving faster.', flag: 'Review', note: 'Correct claim, unstable justification.' },
]

export type Misconception = {
  id: string
  title: string
  topic: string
  cohort: string
  share: number
  students: string[]
  observed: string
  flaw: string
  pathway: string
  trend: 'rising' | 'steady' | 'resolving'
}

export const MISCONCEPTIONS: Misconception[] = [
  {
    id: 'impetus',
    title: 'Motion requires a continuous force',
    topic: 'Newton’s First Law',
    cohort: 'AP Physics 1 · P3',
    share: 75,
    students: ['Minji Kim', 'Marcus Reid', 'Priya Natarajan', 'Leo Alvarez'],
    observed: 'Chose “the force of the throw” as acting on a ball in mid-flight (Q3, Q7).',
    flaw: 'Treats force as a stored “impetus” that gets used up, rather than as an interaction.',
    pathway: 'Revisit with the PhET “Forces and Motion” friction lab',
    trend: 'rising',
  },
  {
    id: 'third-law',
    title: 'Heavier objects exert larger forces',
    topic: 'Newton’s Third Law',
    cohort: 'AP Physics 1 · P3',
    share: 32,
    students: ['Marcus Reid', 'Hannah Cole'],
    observed: 'Claimed the truck pushes harder on the car in a collision.',
    flaw: 'Conflates force with resulting acceleration or damage.',
    pathway: 'Paired spring-scale tug demo',
    trend: 'steady',
  },
  {
    id: 'mass-limiter',
    title: 'Smaller mass is always the limiting reactant',
    topic: 'Stoichiometry',
    cohort: 'Honors Chemistry · P5',
    share: 17,
    students: ['Daniel Osei', 'Mia Lopez'],
    observed: 'Picked the lowest-mass reagent without converting to moles (Q5).',
    flaw: 'Reasons with mass instead of particle counts and mole ratios.',
    pathway: 'Sandwich-assembly ratio activity',
    trend: 'resolving',
  },
  {
    id: 'free-fall',
    title: 'Heavier objects fall faster',
    topic: 'Free Fall',
    cohort: 'Introductory Physics · P1',
    share: 9,
    students: ['Sam Patel'],
    observed: 'Predicted a bowling ball lands well before a tennis ball.',
    flaw: 'Generalises air-resistance experiences to all falling objects.',
    pathway: 'Vacuum-tube feather and coin video',
    trend: 'resolving',
  },
]

export type Reflection = {
  id: string
  student: string
  cohort: string
  date: string
  prompt: string
  response: string
  state: 'mastery' | 'misconception' | 'review'
  concept: string
}

export const REFLECTIONS: Reflection[] = [
  {
    id: 'r1',
    student: 'Minji Kim',
    cohort: 'AP Physics 1 · P3',
    date: 'Thu, Oct 17',
    prompt: 'Why does the Voyager probe keep moving with its engines off?',
    response: 'I used to think it would slow down, but there is nothing out there to push back on it. So nothing changes its motion. That feels weird but it matches the air table.',
    state: 'review',
    concept: 'Inertia',
  },
  {
    id: 'r2',
    student: 'Marcus Reid',
    cohort: 'AP Physics 1 · P3',
    date: 'Thu, Oct 17',
    prompt: 'In a truck–car collision, which feels the bigger force?',
    response: 'The car, because the truck is heavier and pushes harder.',
    state: 'misconception',
    concept: 'Newton’s Third Law',
  },
  {
    id: 'r3',
    student: 'Ava Thompson',
    cohort: 'AP Physics 1 · P3',
    date: 'Wed, Oct 16',
    prompt: 'Draw the forces on a book resting on a table and explain.',
    response: 'Gravity pulls it down and the table pushes it up with the same size, so the net force is zero and it stays still.',
    state: 'mastery',
    concept: 'Static Equilibrium',
  },
  {
    id: 'r4',
    student: 'Daniel Osei',
    cohort: 'Honors Chemistry · P5',
    date: 'Wed, Oct 16',
    prompt: 'How did you decide which reactant runs out first?',
    response: 'I picked the one with fewer grams. Now I see I should have used moles because the ratio is 2:1.',
    state: 'review',
    concept: 'Limiting Reactants',
  },
  {
    id: 'r5',
    student: 'Sam Patel',
    cohort: 'Introductory Physics · P1',
    date: 'Tue, Oct 15',
    prompt: 'Would a feather and a coin hit the floor together on the Moon?',
    response: 'Yes, because there is no air. Gravity speeds them up the same amount.',
    state: 'mastery',
    concept: 'Free Fall',
  },
]

export type Unit = {
  id: string
  title: string
  course: string
  weeks: string
  mastery: number
  status: 'complete' | 'active' | 'upcoming'
  concepts: { name: string; state: 'mastery' | 'misconception' | 'review' | 'upcoming' }[]
}

export const UNITS: Unit[] = [
  {
    id: 'u1',
    title: '1D Kinematics',
    course: 'AP Physics 1',
    weeks: 'Weeks 1–3',
    mastery: 88,
    status: 'complete',
    concepts: [
      { name: 'Displacement vs. distance', state: 'mastery' },
      { name: 'Velocity–time graphs', state: 'mastery' },
      { name: 'Free fall', state: 'review' },
    ],
  },
  {
    id: 'u2',
    title: '2D Motion & Vectors',
    course: 'AP Physics 1',
    weeks: 'Weeks 4–5',
    mastery: 79,
    status: 'complete',
    concepts: [
      { name: 'Vector addition', state: 'mastery' },
      { name: 'Projectile independence', state: 'review' },
    ],
  },
  {
    id: 'u3',
    title: 'Dynamics: Newton’s Laws',
    course: 'AP Physics 1',
    weeks: 'Weeks 6–9',
    mastery: 54,
    status: 'active',
    concepts: [
      { name: 'Inertia (First Law)', state: 'misconception' },
      { name: 'Net force & acceleration', state: 'review' },
      { name: 'Action–reaction pairs', state: 'misconception' },
      { name: 'Free-body diagrams', state: 'mastery' },
    ],
  },
  {
    id: 'u4',
    title: 'Circular Motion & Gravitation',
    course: 'AP Physics 1',
    weeks: 'Weeks 10–12',
    mastery: 0,
    status: 'upcoming',
    concepts: [
      { name: 'Centripetal force', state: 'upcoming' },
      { name: 'Universal gravitation', state: 'upcoming' },
    ],
  },
  {
    id: 'u5',
    title: 'Energy & Work',
    course: 'AP Physics 1',
    weeks: 'Weeks 13–15',
    mastery: 0,
    status: 'upcoming',
    concepts: [
      { name: 'Work–energy theorem', state: 'upcoming' },
      { name: 'Conservation of energy', state: 'upcoming' },
    ],
  },
]
