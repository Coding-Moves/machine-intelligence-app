export const siteCopy = {
  cover: {
    headline: "The changing shape of AI",
    note: "A sample cover layout from the May 2026 design draft.",
    label: "Sample",
    referenceDate: "May 2026",
    issueLabel: "Issue",
    previewNote: "A typographic preview of the magazine cover.",
    magazineLabel: "AI department magazine",
  },
  nav: {
    issues: "Issues",
    about: "About",
    process: "How it is made",
    login: "Editor login",
    menu: "Main navigation",
    skip: "Skip to content",
  },
  home: {
    eyebrow: "The AI department magazine",
    title: "A clearer view of what is changing in AI.",
    intro:
      "Machine Intelligence follows AI and related computing news, research, and work in Pakistan. Gemini checks trusted-source evidence and places eligible stories in the draft; editors review the complete issue before publication.",
    latest: "Read the latest issue",
    sampleButton: "Open the May sample preview",
    browse: "Browse issues",
    issueLabel: "Latest issue",
    contentsLabel: "In this issue",
    pdf: "Download PDF",
    sampleNote:
      "This is a sample preview based on the May 2026 design draft. It is not a published issue.",
    emptyIssueTitle: "The first issue is on its way.",
    emptyIssueDescription:
      "Published editions will appear here after the editors have reviewed them.",
    coverageEyebrow: "A wide view, with local context",
    coverageTitle: "Four sections. One careful read.",
    howEyebrow: "From source to issue",
    howTitle: "How each issue is made",
    steps: [
      {
        number: "01",
        title: "Sources are gathered",
        text: "Twice a day, the newsroom checks feeds that have been reviewed and marked trusted. New feeds stay out until an editor verifies them.",
      },
      {
        number: "02",
        title: "AI screens each story",
        text: "Gemini keeps stories about AI, computer science, data science, and related computing. It checks each summary against trusted-source text; out-of-scope stories and unsupported numbers go to quarantine automatically.",
      },
      {
        number: "03",
        title: "A complete issue is built",
        text: "Gemini places every eligible story in the editable magazine template, drafts the editor's note, and creates the LaTeX and PDF. An editor reviews the issue before publication; each issue stays in draft for at least seven days and covers up to 30 days of news.",
      },
    ],
    closeEyebrow: "For the next generation of builders",
    closeTitle:
      "Written for students who want to understand the work behind the headlines.",
    closeLink: "About the magazine",
  },
  issues: {
    eyebrow: "The archive",
    title: "Issues",
    description:
      "Read published editions of Machine Intelligence. A sample preview is shown while the first issue is being prepared.",
    sample: "Sample preview",
    emptyTitle: "No published issues yet.",
    emptyDescription:
      "The archive will grow when the editorial team publishes its first edition.",
    open: "Open issue",
    dateUnknown: "Date not listed",
    sampleDate: "May 2026 · sample preview",
    unknownTitle: "Issue not found",
    storiesHeading: "Stories and sources",
    storiesTitle: "Story source notes",
    storiesEmptyTitle: "Story links are not available yet.",
    storiesEmpty:
      "Source-linked story details will be shown here when they are part of the published edition.",
  },
  about: {
    eyebrow: "About the magazine",
    title: "A student magazine for understanding artificial intelligence.",
    intro:
      "Machine Intelligence is the magazine of the Department of Artificial Intelligence at NFC IET Multan. It brings together useful AI reporting, research, and local developments in one reviewed edition.",
    purposeTitle: "Why we publish it",
    purpose:
      "AI news moves quickly and claims can be difficult to compare. The magazine gives students a place to read source-linked summaries and see what is known, what is uncertain, and why a story matters.",
    supervisionTitle: "Academic supervision",
    editorsTitle: "Editorial team",
    correctionTitle: "Suggest a correction",
    correction:
      "If you find an error, share the story and a link to the original source so the editors can check it.",
    correctionLink: "Open a GitHub issue",
    contributionTitle: "Who can contribute",
    contribution:
      "Contributions are for current NFC-IET students. Read the contribution note before sending work.",
    contributionLink: "Read the contribution note",
  },
  process: {
    eyebrow: "How it is made",
    title: "A clear path from a source link to a reviewed edition.",
    intro:
      "The app helps student editors collect sources and prepare a draft. AI can suggest story summaries, scores, and issue layout, but editors make the publication decisions and check the sources.",
    steps: [
      {
        number: "01",
        title: "Collect trusted reporting",
        text: "Twice a day, the newsroom checks feeds from publishers and research groups that have been reviewed and marked trusted. New feeds are excluded until an admin verifies them. Each story links back to its evidence.",
      },
      {
        number: "02",
        title: "Check scope and evidence",
        text: "Gemini screens for AI, computer science, data science, and related computing news. It uses trusted sources only, and stories with unsupported numbers are automatically excluded.",
      },
      {
        number: "03",
        title: "Build and review the issue",
        text: "Gemini places every eligible story in the magazine template, drafts an editor's note, and prepares the current LaTeX and PDF. No individual story approval is needed. An editor reviews the complete issue and note; publication opens after seven days, the trusted feeds have been checked, and the latest PDF is ready.",
      },
    ],
    ruleTitle: "The source rule",
    ruleText:
      "A summary should not add facts that are missing from its linked sources. If the sources do not support a claim, the automatic checks keep the story out of the draft until new evidence arrives.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "A small, practical privacy policy.",
    intro:
      "This site is for reading the magazine and, for approved editors, preparing issues.",
    trackingTitle: "Analytics and tracking",
    trackingText:
      "The site does not use advertising trackers or analytics cookies.",
    editorTitle: "Editor accounts",
    editorText:
      "An editor's email address is used to sign in and to check whether that person is on the editor list. It is not shown on public pages.",
    storageTitle: "Issue files",
    storageText:
      "Published issue files may be publicly available. Draft files are kept in private storage for editors.",
    emailTitle: "Issue email",
    emailText:
      "The newsroom stores its issue-recipient list, consent records, unsubscribe tokens, and reusable message in private database tables. An admin must confirm that recipients opted in and faculty must approve the saved email and each exact issue before sending. Resend receives each recipient's address, message, and PDF separately. Recipients can unsubscribe from future issues; that preference is retained. The newsroom keeps per-recipient delivery status and provider references for duplicate protection and troubleshooting.",
    aiTitle: "AI-assisted editing",
    aiText:
      "Trusted source article text may be sent to Google's Gemini API to draft summaries and scores. Eligible story summaries and key facts may be sent to suggest an issue layout and draft an editor's note. Gemini results are checked for unsupported numbers; editors review the complete issue before publication. Without a Gemini API key, new items remain queued and the issue cannot pass its publication checks.",
    contactTitle: "Questions",
    contactText:
      "For a privacy question, contact the editorial team through the repository's issue tracker.",
  },
  notFound: {
    eyebrow: "404 · Page not found",
    title: "This page is not here.",
    description: "The address may have changed, or the page may not exist.",
    returnHome: "Return to the magazine",
  },
  seo: {
    title: "Machine Intelligence | NFC IET Multan",
    description:
      "AI news and research, carefully reviewed by student editors at NFC IET Multan.",
    ogAlt: "Machine Intelligence, the AI department magazine at NFC IET Multan",
    ogFooter: "NFC IET Multan · Built by Coding Moves",
  },
  login: {
    eyebrow: "Editor access",
    title: "Sign in to the newsroom.",
    intro:
      "Sign in with an email and password set up by the newsroom admin. Only email addresses on the approved editor list can enter.",
    email: "Approved email address",
    placeholder: "you@example.com",
    password: "Password",
    submit: "Sign in",
    signingIn: "Signing in…",
    invalidEmail: "Enter a valid email address.",
    notEditor:
      "This email isn't on the editors list. Ask the admin to add you.",
    genericError:
      "Email or password is incorrect, or your account is not set up. Ask the newsroom admin for help.",
    authUnavailable:
      "Editor sign-in is not configured for this deployment. Contact the project admin.",
    back: "Back to the magazine",
  },
  desk: {
    title: "Editor desk",
    nav: [
      { href: "/desk", label: "Draft" },
      { href: "/desk/stories", label: "Stories" },
      { href: "/desk/quarantine", label: "Quarantine" },
      { href: "/desk/sources", label: "Sources" },
      { href: "/desk/images", label: "Images" },
      { href: "/desk/issues", label: "Issues" },
      { href: "/desk/editors", label: "Editors", adminOnly: true },
    ],
    draftTitle: "Draft issue",
    lastUpdated: "Built from the latest eligible stories",
    rebuild: "Rebuild magazine",
    downloadPdf: "Download the current draft PDF",
    downloadOverleaf: "Overleaf export is not connected yet",
    publish: "Publish issue",
    comingSoon: "Image upload is not connected yet",
    preview: "PDF preview",
    previewEmpty:
      "The current draft PDF is waiting for its next successful compile.",
    storiesTitle: "Stories",
    storiesIntro:
      "Gemini checks trusted-source evidence and topic scope. Eligible stories enter the draft automatically; editors can reject or edit them, with no per-story approval step.",
    quarantineTitle: "Quarantine",
    quarantineIntro:
      "Rejected stories stay out of the draft. Restore one to run its automatic checks again.",
    sourcesTitle: "Sources",
    sourcesIntro:
      "Only feeds marked trusted are collected twice a day. Ask the admin to verify a new publisher before adding its feed to the trusted list.",
    imagesTitle: "Images",
    imagesIntro:
      "Generated editorial illustrations enter the draft automatically. Editors can exclude them from the magazine.",
    issuesTitle: "Issues",
    issuesIntro: "View the editions stored for the magazine.",
    editorsTitle: "Editors",
    editorsIntro:
      "Only add current NFC-IET students. Each editor also needs a Supabase Auth account with a password.",
    reject: "Not this one",
    edit: "Edit",
    restore: "Bring it back",
    addEditor: "Add editor",
    savingEditor: "Saving…",
    removeEditor: "Remove",
    noStories: "No current stories yet.",
    noRejected: "No rejected stories.",
    noEditors: "No editors are configured yet.",
    upload: "Upload image",
    imageEmpty: "Magazine illustrations will be listed here.",
    issueEmpty: "No editions have been created yet.",
    signOut: "Sign out",
    currentUser: "Signed in as",
    section: "Section",
    source: "Source",
    score: "Score",
    reason: "Reason",
    statusLabels: {
      ready: "Ready for magazine",
      approved: "Ready for magazine",
      candidate: "AI check pending",
      rejected: "Rejected",
      published: "Published",
    },
    editorName: "Student name",
    editorEmail: "University email",
    editorAddHelp:
      "This adds the email to the allowlist. Then create that person's Supabase Auth account and password in the Supabase Dashboard.",
    editorCreated: "Editor added.",
    editorRemoved: "Editor removed.",
    editorDuplicate: "That email is already on the editor list.",
    editorInvalid: "Enter a valid name and email address.",
    editorActionError: "The editor list could not be updated. Try again.",
    editorSelfRemove: "You cannot remove your own editor account.",
    editorLastAdmin: "At least one admin must remain on the editor list.",
    editorNotFound: "That email is not on the editor list.",
    adminRequired: "Only an admin can manage editors.",
    roleAdmin: "Admin",
    roleEditor: "Editor",
    storyEditorTitle: "Edit story",
    storyHeadlineField: "Headline",
    storySummaryField: "Summary",
    rejectedLocally: "Moved to Quarantine in this sample session.",
    save: "Save",
    cancel: "Cancel",
    localOnly: "No draft editions are available yet.",
    sourceRegion: {
      pakistan: "Pakistan",
      global: "Global",
    },
    sourceKind: {
      news: "News",
      official_blog: "Official blog",
      research: "Research",
      government: "Government",
    },
    issueSample: "Sample preview",
    editionStatus: {
      draft: "Draft",
      published: "Published",
    },
    imageRights:
      "Image upload controls are not connected yet. Use only artwork the magazine has permission to publish and credit.",
    pausedSource: "Paused",
    sourcesEmpty: "No sources are listed yet.",
    activeSource: "Active",
    trustWeight: "Trust weight",
    sourceName: "Source",
    feedColumn: "Feed",
    feedLink: "RSS feed",
    sourceRegionLabel: "Region",
    sourceType: "Type",
  },
  footer: {
    navigation: "Footer links",
    copyright: "Department of Artificial Intelligence, NFC IET Multan",
    builtBy: "Built by Coding Moves",
    github: "GitHub",
    privacy: "Privacy",
  },
} as const;
