# ✈️ TripMate AI

**A Multi-Agent AI Travel Planner powered by LangGraph, FastAPI, and Groq**

TripMate AI plans complete trips end-to-end — flights, hotels, sightseeing, and a day-by-day itinerary — using a coordinated pipeline of AI agents. Give it a single natural-language prompt like *"Plan a 7 day Japan trip from Bangladesh under 2 lakhs"* and it handles the rest.

---

## 🧠 How It Works

TripMate AI is built as a **LangGraph state machine** with four specialized agents that run in sequence, each enriching a shared state object:

```
START
  │
  ▼
┌────────────────┐
│  Flight Agent   │  → Fetches live flight data (AviationStack API)
└────────────────┘
  │
  ▼
┌────────────────┐
│  Hotel Agent    │  → Searches hotel options (Tavily web search)
└────────────────┘
  │
  ▼
┌────────────────┐
│ Itinerary Agent │  → Drafts a day-by-day plan (Groq LLM)
└────────────────┘
  │
  ▼
┌────────────────┐
│  Final Agent    │  → Formats a polished, complete travel response
└────────────────┘
  │
  ▼
 END
```

Conversation state is checkpointed to **PostgreSQL** via `langgraph-checkpoint-postgres`, so each session (`thread_id`) can be resumed or continued later.

---

## 🚀 Features

- **Natural language trip planning** — just describe the trip, no forms
- **Live flight lookups** with smart parsing of cities, countries, and IATA codes (`flight_tool.py` resolves "Japan" → `NRT`, "from Bangladesh" → `DAC`, etc.)
- **Hotel & sightseeing search** via Tavily web search
- **AI-generated itinerary** with trip summary, budget estimate, and recommendations, formatted in Markdown
- **Persistent conversation threads** backed by PostgreSQL checkpointing
- **Clean web UI** with quick-start prompt suggestions, Markdown rendering, and one-click **PDF export**
- **Dockerized** for easy deployment

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI |
| Agent orchestration | LangGraph |
| LLM | Groq (`llama-3.3-70b-versatile`) via `langchain-groq` |
| Flight data | AviationStack API |
| Web/hotel search | Tavily |
| State persistence | PostgreSQL (`langgraph-checkpoint-postgres`) |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Markdown rendering | marked.js |
| PDF export | html2pdf.js |
| Containerization | Docker |

---

## 📁 Project Structure

```
.
├── app.py                 # FastAPI app, routes, and server entrypoint
├── backend.py              # LangGraph agent graph, state, and orchestration logic
├── tools/
│   ├── flight_tool.py       # Flight search + location/IATA resolution
│   └── tavily_tool.py       # Hotel/web search via Tavily
├── templates/
│   └── index.html           # Main UI page
├── static/
│   ├── script.js             # Frontend logic (API calls, rendering, PDF export)
│   └── style.css             # Styling
├── Dockerfile
└── requirements.txt
```

> **Note:** `flight_tool.py` and `tavily_tool.py` are imported from a `tools` package in `backend.py` (`from tools.flight_tool import search_flights`) — make sure they live inside a `tools/` directory with an `__init__.py`, and that `templates/` and `static/` folders exist alongside `app.py` as referenced by `Jinja2Templates` and `StaticFiles`.

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/tripmate-ai.git
cd tripmate-ai
```

### 2. Create a virtual environment & install dependencies

```bash
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# LLM
GROQ_API_KEY=your_groq_api_key

# Flight data
AVIATIONSTACK_API_KEY=your_aviationstack_api_key
DEFAULT_ORIGIN_IATA=DEL          # fallback origin airport if none specified

# Hotel / web search
TAVILY_API_KEY=your_tavily_api_key

# Database (checkpointing)
DATABASE_URL=postgresql://user:password@host:port/dbname
```

> `DATABASE_URL` should point to a PostgreSQL instance (e.g. Render, Supabase, or a local Postgres server). `sslmode=require` is appended automatically if not already present.

### 4. Run the app locally

```bash
python app.py
```

Or with `uvicorn` directly:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Visit **http://127.0.0.1:8000** in your browser.

---

## 🐳 Run with Docker

```bash
docker build -t tripmate-ai .
docker run -p 8000:8000 --env-file .env tripmate-ai
```

The app will be available at **http://localhost:8000**.

---

## 🔌 API Reference

### `POST /api/travel`

Plan a trip from a natural language message.

**Request body:**
```json
{
  "message": "Plan a complete 7 days Japan trip from Bangladesh under 2 lakhs.",
  "thread_id": null
}
```

**Response:**
```json
{
  "success": true,
  "thread_id": "user_xxxxxxxx",
  "answer": "Full formatted travel plan in Markdown...",
  "flight_results": "...",
  "hotel_results": "...",
  "itinerary": "...",
  "llm_calls": 3
}
```

Pass the returned `thread_id` back on the next request to continue the same conversation/session.

### `GET /health`

Simple health check — returns `{"status": "ok"}`.

---

## 💡 Example Prompts

- *"Plan a complete 7 days Japan trip from Bangladesh including flights, hotels and sightseeing under 2 lakhs."*
- *"Plan a 5 days Dubai trip from Dhaka with flights, hotels and sightseeing."*
- *"Plan a 7 days Thailand trip from Bangladesh with budget hotels and sightseeing."*
- *"Give me all country flight info."*

---

## ⚠️ Known Limitations

- AviationStack provides **live/status flight data**, not ticket prices — the itinerary agent is prompted to note this limitation when generating budgets.
- Location resolution (city/country → IATA) relies on heuristics and a static preferred-airport map; unusual phrasing may not resolve correctly.
- Requires a reachable PostgreSQL instance at startup — the app will fail to start if `DATABASE_URL` is missing or invalid.

---

## 🛣️ Roadmap Ideas

- [ ] Real fare pricing via Amadeus or a similar flight-pricing API
- [ ] Streaming responses for a more interactive UI
- [ ] Multi-turn refinement of an existing itinerary (edit specific days/budget)
- [ ] User accounts and saved trip history

---

## 📄 License

This project is open source. Add your preferred license (e.g. MIT) here.

---

Built with FastAPI, LangGraph, Groq, PostgreSQL, Tavily, and AviationStack.