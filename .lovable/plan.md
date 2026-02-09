

# StudyBuddy AI - Implementation Plan

## Overview
An AI-powered textbook tutor that lets students upload PDF textbooks and have intelligent conversations about the content. Built with a modern, polished dark theme and smooth animations from the start.

---

## Phase 1: Foundation & Home Page

### 1.1 Project Setup
- Install required dependencies: framer-motion, pdfjs-dist, recharts, react-markdown, idb (IndexedDB wrapper)
- Configure Tailwind with custom dark theme colors and animations
- Set up routing structure for all pages

### 1.2 Home Page (Landing)
A stunning, animated landing experience with:
- **Hero Section**: Full-viewport gradient background (slate-900 to purple-900), animated headline "Your Textbooks, Finally Decoded", dual CTA buttons with pulse effects
- **Stats Section**: Animated counter showing "500+ Pages", "< 10s Response", "100% Free", "24/7 Available"
- **Features Grid**: 4 cards with icons (Brain, Zap, Target, TrendingUp), hover scale + glow effects
- **How It Works**: 3-step animated flow that reveals on scroll
- **Demo Preview**: Mockup of the chat interface with fake conversation
- **Final CTA**: Full-width section with upload button
- **Footer**: Hackathon credit, GitHub link

---

## Phase 2: PDF Processing System

### 2.1 PDF Upload & Extraction
- **PDFUploader Component**: Beautiful drag-drop zone with dotted border, file validation (PDF only, max 50MB)
- **TextExtractor Component**: Uses pdf.js for 100% browser-based processing
- **Real-time Progress**: Shows "Processing page 45/234..." with animated progress bar
- **Extraction Stats**: Display page count, word count after processing

### 2.2 IndexedDB Storage
- Store extracted text locally in browser
- Save textbook metadata (title, page count, upload date)
- Quick retrieval for returning users
- No cloud dependency - works offline

---

## Phase 3: Chat Interface (Core Feature)

### 3.1 Chat Page Layout
- **Left Sidebar** (collapsible): Current textbook info, recent questions list, "New Chat" button
- **Main Chat Area**: Message thread with user/AI bubbles, markdown rendering, typing indicator
- **Right Sidebar** (desktop): Quick actions (summarize, quiz, find formulas)

### 3.2 Message Components
- **User Bubbles**: Right-aligned, purple gradient
- **AI Bubbles**: Left-aligned, dark with border, copy button
- **Typing Indicator**: 3 bouncing dots animation
- **Empty State**: Welcome message with clickable suggestion chips

### 3.3 AI Integration
- Edge function for Gemini API calls (secure key storage)
- Streaming responses for faster perceived performance
- Context-aware prompts including textbook content
- Error handling with friendly messages

---

## Phase 4: Library & Management

### 4.1 Library Page
- **Grid View**: Textbook cards with auto-generated covers (gradient + letter)
- **Search & Filter**: Real-time client-side filtering
- **Card Info**: Title, page count, questions asked, mastery percentage
- **Actions**: Open chat, view progress, delete with confirmation modal
- **Empty State**: Friendly prompt to upload first textbook

### 4.2 Textbook Management
- Delete functionality with confirmation modal
- Quick stats per textbook
- "Last used" sorting option

---

## Phase 5: Progress Dashboard

### 5.1 Analytics Overview
- **Hero Stats**: 4 cards showing total questions, average mastery, study streak, time saved
- **Topic Mastery Chart**: Bar chart with color-coded performance (red/yellow/green)
- **Activity Timeline**: Questions over time line chart

### 5.2 Learning Insights
- **Weak Topics Alert**: Yellow warning box for topics below 60%
- **Practice Recommendations**: Quick links to review struggling areas
- **Recent Activity Feed**: Clickable timeline of recent questions

---

## Phase 6: Onboarding Flow

### 6.1 First-Time Experience
- 3-step guided onboarding with step indicator
- Step 1: Welcome message
- Step 2: Upload instructions with animated illustration
- Step 3: PDF upload with live processing

### 6.2 Success State
- Confetti animation on successful upload
- Auto-redirect to chat page
- Toast notification celebration

---

## Phase 7: Polish & Responsiveness

### 7.1 Shared Components
- **Navbar**: Logo, navigation links, upload button, mobile hamburger
- **Loading States**: Skeleton screens, spinners
- **Error Handling**: Error boundary, network error states
- **Toast System**: Success/error/info notifications

### 7.2 Responsive Design
- Mobile-first approach
- Collapsible sidebars on tablet/mobile
- Touch-friendly targets
- Bottom navigation on mobile

### 7.3 Accessibility
- Keyboard navigation
- ARIA labels on interactive elements
- Focus visible states
- Screen reader announcements

---

## Technical Architecture

### Data Flow
```
PDF File → pdf.js extraction → IndexedDB storage → Chat context → Gemini AI → Response
```

### Storage Schema (IndexedDB)
- **textbooks**: id, title, content, pageCount, wordCount, uploadDate
- **chats**: id, textbookId, messages[], createdAt
- **progress**: id, textbookId, topic, mastery, questionsAsked

---

## Design System

### Colors
- Background: `slate-900` to `purple-900` gradient
- Primary: `purple-500` to `pink-500` gradient
- Text: White (headings), `gray-300` (body)
- Accents: `cyan-400`, `pink-400`

### Animations
- Page transitions: Fade + slide
- Card hovers: Scale 1.05 + glow shadow
- Buttons: Subtle pulse on hover
- Messages: Slide in from bottom
- Stats: Count up on scroll into view

