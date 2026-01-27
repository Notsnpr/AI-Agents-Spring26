import os
import argparse
from dotenv import load_dotenv
from datetime import datetime
from openai import AsyncOpenAI
from agents import (
    Agent,
    Runner,
    HandoffOutputItem,
    ItemHelpers,
    MessageOutputItem,
    ToolCallItem,
    ToolCallOutputItem,
    set_default_openai_client,
    set_default_openai_api, # there's a new api from openai and this give us access to the old one we have access to in rgvaiclass
    set_tracing_disabled
)
from tools import geocode, get_weather, web_search, web_fetch, youtube_search, scholar_search, google_flights_search

# Load environment variables from .env file
load_dotenv()

# Get configuration from environment variables
BASE_URL = os.getenv("OPENAI_API_BASE_URL")
API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME") or "gpt-4o"

if not API_KEY:
    raise ValueError("Please set OPENAI_API_KEY in your .env file")

# Create custom client with specified base URL
client = AsyncOpenAI(
    base_url=BASE_URL, 
    api_key=API_KEY,
)

# Set as default client and configure API method
set_default_openai_client(client=client, use_for_tracing=False)
set_tracing_disabled(disabled=True)
set_default_openai_api("chat_completions")

# Parse command line arguments
parser = argparse.ArgumentParser(description="Custom tools example with OpenAI agents")
parser.add_argument("--debug", "-d", action="store_true", help="Enable debug/verbose mode")

def create_agent(debug: bool = False) -> Agent:
    """Create an agent with our custom tools"""
    # Get current date and time
    current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return Agent(
        name="Custom Tools Agent",
        tools=[geocode, get_weather, web_search, web_fetch, youtube_search, scholar_search, google_flights_search],
        model=MODEL_NAME,
        instructions=f"""
        Current date and time: {current_datetime}
        
        You are a helpful assistant that can:
        1. Find geographic coordinates for locations using geocode
        2. Get weather information for a location using latitude and longitude
        3. Search the web for information
        4. Fetch content from web pages
        5. Search YouTube for videos
        6. Search Google Scholar for academic papers
        7. Search for flights using Google Flights
        
        When asked about weather in a location:
        1. First use the geocode tool with ONLY the city name (do not include state or country)
           Example: geocode("Paris") is correct, geocode("Paris, France") will fail
        2. Then use the get_weather tool with the coordinates from the first result
        
        When asked for general information, use the web_search tool with num_results=10, include_news=false, and time_period=null.
        
        When asked to search for videos on YouTube, use the youtube_search tool with:
        - Required parameters: query, num_results, sort_by
        - Optional filtering: upload_date, duration
        
        For YouTube searches:
        - Default to sort_by="relevance" unless specified otherwise
        - Recommend using filters like upload_date and duration based on user's query
        - Example filter options:
          - sort_by: "relevance", "upload_date", "view_count", "rating"
          - upload_date: "last_hour", "today", "this_week", "this_month", "this_year"
          - duration: "short" (<4min), "medium" (4-20min), "long" (>20min)
        
        When asked to search for academic papers or research, use the scholar_search tool with:
        - Required parameters: query, num_results, sort_by
        - Optional filtering: publication_date, author
        
        For Google Scholar searches:
        - Default to sort_by="relevance" unless specified otherwise
        - Use publication date filters when recency matters
        - Filter by author when searching for specific researchers
        - Example filter options:
          - sort_by: "relevance" or "date"
          - publication_date: "since_2023", "since_2020", "since_2017", "since_2014"
        
        When asked to search for flights, use the google_flights_search tool with:
        - Required parameters: origin, destination, departure_date
        - Optional parameters: return_date, adults, children, infants, stops, flight_class, max_price, currency, airlines
        
        For flight searches:
        - Use airport or city codes for origin and destination (e.g., "NYC", "SFO", "LHR", "PAR")
        - Format dates as YYYY-MM-DD
        - For stops, valid options are: "any", "nonstop", "1stop", "2stops"
        - For flight_class, valid options are: "economy", "premium_economy", "business", "first"
        - Airlines should be provided as a list of IATA codes (e.g., ["UA", "AA", "DL"])
        
        Always be polite, informative and concise in your responses.
        """
    )

async def chat_with_agent(debug: bool = False):
    # Create the agent with debug mode if specified
    agent = create_agent()
    
    print("Chat with the Custom Tools Agent (type 'exit' to quit):")
    print("Try asking about weather in a city, searching for information, searching YouTube for videos,")
    print("searching Google Scholar for academic papers, or searching for flights.")
    print("Example 1: 'Find me YouTube videos about machine learning tutorials'")
    print("Example 2: 'Search Google Scholar for recent papers on quantum computing'")
    print("Example 3: 'Find flights from NYC to LHR on 2025-05-15 with a return on 2025-05-22'")
    if debug:
        print("Debug mode enabled - agent events will be displayed")
    
    # Initialize conversation history
    conversation = []
    
    while True:
        user_input = input("> ")
        if user_input.lower() == "exit":
            break
            
        # Add a newline after user input
        print()
        
        # If we have existing conversation history, use it
        if conversation:
            # Add the new user message to the existing conversation
            new_input = conversation + [{"role": "user", "content": user_input}]
            result = Runner.run_streamed(agent, new_input)
        else:
            # First message in the conversation
            result = Runner.run_streamed(agent, user_input)
        
        # Print debug header if in debug mode
        if debug:
            print("\n=== Run starting ===")
            
        # Stream events in real-time
        message_output = ""
        final_items = []
        async for event in result.stream_events():
            # We'll ignore the raw responses event deltas
            if event.type == "raw_response_event":
                continue
            elif event.type == "agent_updated_stream_event":
                if debug:
                    print(f"Agent updated: {event.new_agent.name}")
                continue
            elif event.type == "run_item_stream_event":
                final_items.append(event.item)
                if event.item.type == "tool_call_item":
                    # Show tool calls in both normal and debug mode
                    # Light green (cyan) color code for the ⏺ symbol
                    # Make tool name bold using ANSI escape codes
                    # Format arguments
                    import json
                    args_str = event.item.to_input_item()['arguments']
                    try:
                        args_dict = json.loads(args_str)
                        formatted_args = ", ".join([f"{k}: {repr(v)}" for k, v in args_dict.items()])
                    except:
                        formatted_args = args_str
                    print(f"\033[36m⏺\033[0m \033[1m{event.item.to_input_item()['name']}\033[0m({formatted_args})")
                elif event.item.type == "tool_call_output_item":
                    if debug:
                        print(f"Tool output: {event.item.output}")
                elif event.item.type == "message_output_item":
                    message_output = ItemHelpers.text_message_output(event.item)
                    if debug:
                        print(f"Message building: {message_output}")
                elif debug:
                    print(f"Other event type: {event.item.type}")
                    
        # Update the conversation history with new items
        # Instead of resetting conversation to [], build upon it
        for item in final_items:
            if hasattr(item, 'to_input_item'):
                input_item = item.to_input_item()
                if input_item:
                    conversation.append(input_item)
        
        # Display the final output
        print(f"\n⏺ {message_output}\n")
        
        if debug:
            print("=== Run complete ===\n")

if __name__ == "__main__":
    import asyncio
    args = parser.parse_args()
    asyncio.run(chat_with_agent(debug=args.debug))
