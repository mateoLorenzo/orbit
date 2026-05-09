# AI Study Assistant — Project Overview

## What This Is

A student-facing study platform where learners upload their course materials and an AI builds a personalized learning path from them. The AI generates a navigable knowledge map, tutors the student through each topic in their preferred format, and validates real understanding before unlocking the next concept.

The core constraint: **the AI never invents content outside what the student uploaded**. If a topic isn't in the uploaded material, the tutor says so explicitly. This keeps study sessions aligned to what will actually appear on the exam.

## Core Features

### 1. Subject Management
Students create subjects (e.g. History, Biology, Math). Each subject has its own isolated material set, knowledge map, and progress state.

### 2. Material Upload
Students upload PDFs, notes, presentations, past exams, and video links per subject. The AI uses this material as its sole knowledge source for everything downstream.

### 3. Learning Map
The AI parses uploaded material and generates a directed graph of concepts — nodes connected by prerequisite relationships. Students see their progress overlaid on the graph: mastered (green), current (blue), locked (gray). Nodes can be manually reordered.

### 4. Node Study — Multi-Format Content
Each node delivers content in five formats selectable as tabs: text summary, visual infographic, audio narration, short video explanation, and two-voice podcast. The platform tracks format preferences and prioritizes them over time.

### 5. AI Tutor Chat
In-node chat with a tutor that guides rather than resolves. If a student asks for the answer, the tutor asks questions that lead them to think it through themselves. The tutor retains memory across sessions: past struggles, mastered concepts, preferred explanation depth.

### 6. Comprehension Validation (Mini-Quiz)
After studying a node, the student triggers a short quiz (2–3 open-ended questions, answered in natural language). The AI evaluates responses, marks them correct/partial/incorrect with specific feedback, and either unlocks the next node or surfaces targeted review suggestions.

### 7. Progress Dashboard
Shows percentage of nodes mastered, which node to tackle next on the optimal path, concepts with the most difficulty (measured by quiz attempts, time spent, tutor queries), and spaced repetition reminders for long-term retention.

---

## Generative AI Features (Planned)

These features transform uploaded material into rich, generated learning assets rather than just displaying it.

### Visual Asset Generation
- **Contextual infographics**: from a node's content, generate timelines, cause-effect diagrams, actor maps, and concept trees as visual assets. Prompts are constructed from the student's material, not from general model knowledge.
- **Historical and scientific scene generation**: for History nodes, generate period-appropriate illustrations; for Biology/Chemistry, generate anatomical or molecular renders. Style is consistent per subject.
- **Animated concept maps**: node content "builds" visually as the student progresses through it.

### Video and Audio Generation
- **Mini-documentaries**: combine TTS narration, generated images, and contextual background audio into short explainer videos. Cinematic style for History, minimal for Math.
- **Two-voice podcast with distinct personalities**: build on the existing podcast format — one voice plays skeptic, one plays enthusiast, debating the topic from the student's material.
- **Tone adaptation**: if the student's profile indicates preferred analogies (sports, gaming, music), the narration rewrites explanations accordingly before generating audio.

### Interactive Simulations
- **Historical character simulator**: student "interviews" a historical figure (Napoleon, Marie Curie) who responds only based on the uploaded material — no hallucination outside the source.
- **Virtual labs**: for Chemistry and Biology, generate interactive simulations of experiments described in the uploaded PDFs.
- **What-if analysis**: student proposes a counterfactual hypothesis ("What if Spain won independence in 1810?") and the AI generates a structured analysis grounded in the material.

### Adaptive Personalization
- **Interest-mapped analogies**: the platform learns the student's interests over sessions and rewrites new node explanations using those contexts. The mitochondria explained as "the cell's hosting server" for a CS student.
- **Real-time level adaptation**: detects friction signals (response time, quiz failure patterns, repeated tutor queries) and auto-adjusts explanation complexity for the next node.

## Student Interest Profile

Each student has a set of interest tags stored in their `profiles` record (e.g. `["football", "gaming", "music"]`). These tags are hardcoded by the student during onboarding and do not change automatically.

The interest profile is injected into every AI prompt that produces student-facing content. It affects:

- **Analogies**: explanations use metaphors drawn from the student's interests. A student with `football` as an interest gets "the mitochondria is like the stadium's power grid — without it, no game happens."
- **Tutor chat**: the tutor naturally frames hints and guiding questions using interest-relevant contexts.
- **Quiz phrasing**: questions are worded using scenarios from the student's interests where possible, without changing the underlying concept being tested.
- **Podcast tone**: the two-voice podcast uses interest-adjacent examples when debating or illustrating a topic.
- **Mini-documentary narration**: the TTS script is rewritten to include interest-relevant framing before audio is generated.

### Implementation note
Interest tags are passed as a `user_interests` field in the system prompt of every LLM call that produces student-facing output. The prompt instructs the model to use them as analogical context only — they must never distort the factual accuracy of the content derived from the uploaded material.