# ⚠️ Important Note for Evaluation Judges

> **Apologies for the post-deadline documentation update.**
> 
> This commit is **strictly limited to correcting the Live Demo URL** in this README file. The previous link was incorrectly entered due to a typographical error. 
> 
> **Verification Details:**
> - **Zero Code Changes:** No modifications have been made to the `src/`, `public/`, or any configuration files.
> - **Logic Integrity:** The application logic, Gemini prompt structures, and PWA configurations remain exactly as they were at the time of the official submission deadline.
> - **Purpose:** This update is only to ensure the judging panel can access the correct live environment at: [https://studybuddytutr.netlify.app/](https://studybuddytutr.netlify.app/)

---
# 🎓 StudyBuddy AI

**An AI-powered adaptive learning companion built with the Google Gemini API.**

StudyBuddy AI transforms any study material into an interactive learning experience. Upload your documents, and an intelligent tutor — powered by Gemini — explains concepts at your level, generates detailed diagrams, creates quizzes, and even tutors you live through voice interaction with real-time captions.

> **Built for the Gemini 3 Hackathon** · [Live Demo](https://studybuddytutr.netlify.app/) · [Devpost](https://devpost.com/muntazirmahdi)

---

## 🚀 What It Does

StudyBuddy AI is a complete study assistant that adapts to the student's level:

1. **Upload** a PDF, DOCX, TXT, or Markdown file
2. **Chat** with the AI tutor about your document — it adjusts its language complexity to match your level (simple analogies for beginners, technical depth for advanced students)
3. **See** auto-generated Mermaid diagrams that visually break down every concept
4. **Take** AI-generated quizzes to test your understanding
5. **Talk** to your tutor in real-time using the Live Tutor mode with voice and live captions

---

## 🧠 Gemini API Integration

StudyBuddy AI uses the **Google Gemini API** as its core intelligence layer. Here's exactly how Gemini powers every feature:

### Adaptive Chat (Streaming)
- Uses **Gemini's streaming API** (`streamGenerateContent`) with Server-Sent Events for real-time response delivery
- A detailed **system instruction** tells Gemini to analyze the complexity of the user's question and adapt its tone — using simple words and analogies for basic questions, and technical terminology for advanced ones
- Full **conversation history** is sent with each request, giving Gemini the context to provide coherent multi-turn tutoring

### Diagram Generation
- The system instruction includes **strict Mermaid syntax rules** that guide Gemini to output properly formatted flowcharts with subgraphs, decision nodes, and labeled arrows
- Gemini generates these diagrams as part of its response — they are extracted and rendered client-side using Mermaid.js
- A **two-tier sanitizer** automatically fixes any syntax issues in the generated Mermaid code

### Quiz Generation
- Gemini generates **multiple-choice quizzes** from the uploaded document content, with a configurable topic focus
- The prompt instructs Gemini to return structured JSON with questions, options, correct answers, and explanations
- Quiz results are tracked in IndexedDB for progress monitoring

### Live Tutor Mode
- Combines the **Web Speech API** (browser-native speech recognition) with **Gemini streaming** and **Speech Synthesis**
- The user speaks → speech-to-text transcribes → Gemini processes and streams a response → text-to-speech reads the answer → mic auto-restarts for the next question
- **Contextual memory**: each voice turn includes the previous AI response as context, so Gemini can handle follow-up questions naturally

### Auto Model Discovery
- Uses Gemini's **ListModels API** to automatically discover available models
- Tries a prioritized list of model candidates and caches the working model in localStorage
- Supports both `v1beta` and `v1` API endpoints with automatic fallback

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📚 **Document Processing** | Upload PDF, DOCX, TXT, and Markdown files. Text is extracted client-side using pdf.js and mammoth.js |
| 🤖 **Adaptive AI Tutor** | Gemini-powered explanations that match the student's level of understanding |
| 📊 **Auto Diagrams** | Detailed Mermaid flowcharts generated for every explanation, rendered in real-time |
| 🎤 **Live Tutor Mode** | Voice-driven Q&A loop with hands-free interaction |
| 💬 **Live Captions** | Real-time captions panel showing user speech and AI responses during voice tutoring |
| 🧠 **Quiz Generator** | Topic-based multiple-choice quizzes with scoring and explanations |
| 📈 **Progress Tracking** | Quiz scores and study history stored locally with visual statistics |
| 🔑 **BYOK** | Bring Your Own Key — runs entirely client-side, no backend server needed |
| 🌗 **Dark Mode** | Full light/dark theme support |
| 📱 **Responsive** | Works on desktop and mobile devices |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Document │  │   Chat   │  │    Live Tutor     │ │
│  │ Upload   │  │   Page   │  │  (Voice + Captions)│ │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘ │
│       │              │                 │            │
│  ┌────▼─────┐  ┌─────▼──────┐  ┌──────▼─────────┐ │
│  │pdf.js    │  │  Gemini    │  │ Speech API     │ │
│  │mammoth.js│  │  Client    │  │ (Recognition   │ │
│  └────┬─────┘  │  (fetch)   │  │  + Synthesis)  │ │
│       │        └─────┬──────┘  └──────┬──────────┘ │
│       │              │                │            │
│  ┌────▼──────────────▼────────────────▼──────────┐ │
│  │              IndexedDB (Local Storage)         │ │
│  │   Documents · Chat History · Quiz Results     │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (streaming)
            ┌──────────▼──────────┐
            │  Google Gemini API  │
            │  (generativelanguage│
            │   .googleapis.com)  │
            └─────────────────────┘
```

**Key architectural decisions:**
- **No backend server** — all API calls go directly from the browser to Gemini (BYOK model)
- **Client-side document processing** — PDFs parsed with pdf.js, DOCX with mammoth.js
- **IndexedDB for persistence** — chat history, documents, and quiz results stored locally
- **Direct fetch to Gemini REST API** — SSE parsing for streaming, bypassing SDK limitations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **UI Components** | shadcn/ui + Radix UI |
| **Styling** | Tailwind CSS |
| **AI** | Google Gemini API (direct REST calls with streaming) |
| **Diagrams** | Mermaid.js |
| **Math Rendering** | KaTeX |
| **Document Processing** | pdf.js (PDF), mammoth.js (DOCX) |
| **Local Storage** | IndexedDB (via idb) |
| **Voice** | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| **Deployment** | Netlify |

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- A Google Gemini API Key ([Get one free](https://aistudio.google.com/apikey))

### Installation

```bash
git clone https://github.com/Mpitafi7/Study-Buddy.git
cd Study-Buddy
npm install
npm run dev
```

### Usage
1. Open `https://studybuddytutr.netlify.app/` in your browser
2. Click the ⚙️ Settings icon and enter your Gemini API key
3. Upload a PDF/DOCX/TXT file from the home page
4. Start chatting — diagrams appear automatically in the sidebar
5. Click **Live Tutor** for voice interaction with real-time captions
6. Click **Generate Quiz** to test your knowledge

---

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── DiagramPanel.tsx      # Mermaid diagram rendering with auto-retry
│   │   ├── LiveCaptionsPanel.tsx  # Real-time speech captions
│   │   ├── MessageContent.tsx    # Markdown + LaTeX message renderer
│   │   └── QuizPanel.tsx         # Interactive quiz component
│   ├── layout/
│   │   ├── Navbar.tsx            # Navigation bar
│   │   ├── Footer.tsx            # Footer with links
│   │   └── SettingsModal.tsx     # API key configuration
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── gemini.ts                 # Gemini API client with auto-discovery
│   ├── extractMermaid.ts         # Two-tier Mermaid sanitizer
│   ├── textExtractor.ts          # PDF/DOCX/TXT text extraction
│   ├── storage.ts                # IndexedDB operations
│   └── documentContext.ts        # Document state management
├── pages/
│   ├── ChatPage.tsx              # Main chat + Live Tutor page
│   ├── OnboardingPage.tsx        # Document upload page
│   ├── LibraryPage.tsx           # Document library
│   └── ProgressPage.tsx          # Quiz progress & statistics
└── hooks/
    └── useApiKey.ts              # API key management hook
```

---

## 🔒 Privacy & Security

- **Your API key stays in your browser** — stored in localStorage, never sent to any server except Google's Gemini API
- **Your documents stay local** — extracted text is stored in IndexedDB, never uploaded to any third-party server
- **No backend, no database** — everything runs client-side
- **No tracking, no analytics** — zero data collection

---

## 📄 Third-Party Tools & Licenses

This project uses the following open-source libraries:

| Library | Purpose | License |
|---|---|---|
| React | UI framework | MIT |
| Vite | Build tool | MIT |
| Tailwind CSS | Styling | MIT |
| shadcn/ui | UI components | MIT |
| Radix UI | Accessible primitives | MIT |
| Mermaid.js | Diagram rendering | MIT |
| KaTeX | Math/LaTeX rendering | MIT |
| pdf.js | PDF text extraction | Apache 2.0 |
| mammoth.js | DOCX text extraction | BSD-2 |
| Framer Motion | Animations | MIT |
| Lucide React | Icons | ISC |
| idb | IndexedDB wrapper | ISC |

The **Google Gemini API** is used under Google's [Terms of Service](https://ai.google.dev/gemini-api/terms).

---

## 👤 Author

**Mpitafi7** — Built with ❤️ for the Gemini 3 Hackathon

---

*© 2026 StudyBuddy AI. Built for the Gemini Hackathon.*
