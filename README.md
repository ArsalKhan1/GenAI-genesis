# Signal Decoder

An AI-powered relationship dynamics analyzer that decodes communication patterns and behavioral signals in real-time conversations.

## What It Does

Signal Decoder lets two people chat in a shared room, then runs a hybrid ML + heuristic analysis pipeline to surface:

- **Effort balance** — who's putting in more work
- **Power dynamics** — relative conversational dominance
- **Ghosting probability** — likelihood of withdrawal based on response patterns
- **Manipulation signals** — breadcrumbing, love bombing, boundary violations
- **Attachment style** — secure, anxious, avoidant, or disorganized
- **Actionable recommendations** — plain-language advice based on detected patterns

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Real-time | Socket.io 4 |
| ML Inference | Python 3, scikit-learn (ExtraTreesRegressor), joblib |
| Vector Storage | Moorcheh API (semantic message history) |
| AI | Anthropic Claude API |

## Architecture

```
Browser (React)
    │  WebSocket (Socket.io)
    ▼
Custom Node.js Server (server.ts)
    ├── Socket.io Server  →  Moorcheh (vector DB)
    └── POST /api/analyze
            ├── 1. Retrieve history from Moorcheh
            ├── 2. Extract 14 rolling features (features.ts)
            ├── 3. Spawn Python → ML model inference
            │       └── relationship_signal_model_v4.joblib
            │           (ExtraTreesRegressor, 123 features → 5 risk scores)
            └── 4. Return AnalysisResult
```

The ML model predicts five scores (0–1): `effort_balance`, `ghosting_probability`, `breadcrumbing_risk`, `lovebombing_risk`, `boundary_violation_risk`. If Python is unavailable, the server falls back to rule-based heuristics.

## Getting Started

### Prerequisites

- Node.js (v18+) and npm
- Python 3 with `joblib`, `scikit-learn`, `numpy`, and `pandas`

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```
MOORCHEH_API_KEY=your_moorcheh_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Navigate to `http://localhost:3000`.

## Usage

1. Enter your name and click **Create Room**
2. Share the room ID with the other person — they enter the same ID to join
3. Chat in real time
4. Click **Analyze** to run the relationship signal analysis

## Project Structure

```
src/
├── app/
│   ├── page.tsx               # Home — room creation / join
│   └── api/
│       └── analyze/route.ts   # Analysis endpoint
├── components/
│   └── ChatPanel.tsx          # Real-time chat UI
├── lib/
│   ├── features.ts            # Rolling feature extraction (14 metrics)
│   ├── model.ts               # Model orchestration + heuristic fallback
│   ├── moorcheh.ts            # Vector DB store & retrieval
│   └── socket-server.ts       # Socket.io room/message management
├── model/
│   ├── predict.py             # Python ML inference script
│   └── relationship_signal_model_v4.joblib
├── types/
│   └── index.ts               # Shared TypeScript types
model_training/
└── final model.ipynb          # Training notebook (Google Colab)
server.ts                      # Custom Node.js server entry point
```

## Model Details

The model was trained on ~3,000 labeled conversations in Google Colab. It uses:

- **23 numeric features** — message counts, response times, initiation ratios, question frequency, gap durations, effort scores
- **100 TF-IDF/SVD components** — semantic text features extracted with `TfidfVectorizer` + `TruncatedSVD`
- **MultiOutputRegressor(ExtraTreesRegressor)** — predicts all 5 risk scores simultaneously
