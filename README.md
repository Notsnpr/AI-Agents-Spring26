# AI Agents Spring 26

This repo is a course workspace for AI agents. It mixes hands-on notebooks (labs + lecture notes) with a small Python toolset and a runnable example agent that wires those tools together.

## What's here

- `ClassWork/`: course material
  - `ClassWork/labs-1-2/`: lab notebooks and small examples
  - `ClassWork/notes/`: lecture note notebooks
- `tools/`: reusable agent tools (geocoding, weather, web search/fetch, YouTube, Scholar, flights)
- `example.py`: a CLI chat agent that demonstrates using the tools with `openai-agents`
- `pyproject.toml`: base dependencies for the example agent

## Quick start (example agent)

1) Create a `.env` file with your credentials:

```env
OPENAI_API_KEY=your_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o
```

2) Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

3) Run the demo agent:

```bash
python example.py
```

The agent supports web search/fetch, geocoding + weather lookup, YouTube/Scholar search, and Google Flights queries. See the prompts printed on startup for example questions.

## Notebooks

The lab and notes notebooks use separate requirements:

```bash
pip install -r ClassWork/labs-1-2/requirements.txt
pip install -r ClassWork/notes/requirements.txt
```

## Tools overview

The `tools/` package provides function-style tools compatible with the `openai-agents` API:

- `geocoding.py`: convert a city name to coordinates
- `weather.py`: current weather via Open-Meteo
- `web_search.py` / `web_fetch.py`: search + fetch web content
- `youtube_search.py`: YouTube search with filters
- `scholar_search.py`: Google Scholar search
- `google_flights.py`: basic flight search helper

These tools are imported and wired up in `example.py` to create a single demo agent.
