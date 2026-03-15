import os
import json
import asyncio
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from dotenv import load_dotenv

# ==============================================================================
# 🔑 LOAD ENVIRONMENT VARIABLES
# ==============================================================================
load_dotenv()
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the GenAI client
client = genai.Client()

# ==============================================================================
# 🛠️ CONFIGURE FUNCTION CALLING (TOOLS)
# ==============================================================================
ui_tools = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="click_element",
            description="Clicks on an interactive element on the screen using its ID from the provided Accessibility Tree.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "id": types.Schema(type=types.Type.STRING, description="The ID of the element to click (e.g., 'el-4')."),
                },
                required=["id"],
            ),
        ),
        types.FunctionDeclaration(
            name="type_text",
            description="Types text into an input field or textarea using its ID from the provided Accessibility Tree.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "id": types.Schema(type=types.Type.STRING, description="The ID of the element to type into."),
                    "text": types.Schema(type=types.Type.STRING, description="The text to type."),
                },
                required=["id", "text"],
            ),
        ),
        types.FunctionDeclaration(
            name="scroll_page",
            description="Scrolls the page up or down.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "direction": types.Schema(
                        type=types.Type.STRING, 
                        description="The direction to scroll ('up' or 'down').",
                        enum=["up", "down"]
                    ),
                },
                required=["direction"],
            ),
        ),
        types.FunctionDeclaration(
            name="navigate_to",
            description="Navigates the browser to a specific URL (e.g., another ERP module).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="The full URL to navigate to."),
                },
                required=["url"],
            ),
        ),
        types.FunctionDeclaration(
            name="read_text",
            description="Returns the visible text content of the entire page or a specific area.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(type=types.Type.STRING, description="Optional search term to find specific text."),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="highlight_element",
            description="Visually highlights an element on the screen. Use this before critical actions to confirm with the user.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "id": types.Schema(type=types.Type.STRING, description="The ID of the element to highlight."),
                },
                required=["id"],
            ),
        )
    ]
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Configure the Gemini Live API session
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        tools=[ui_tools],
        # Enable transcription for debugging
        generation_config=types.GenerationConfig(
            candidate_count=1,
        ),
        system_instruction=types.Content(
            parts=[
                types.Part.from_text(
                    text=(
                        "You are an expert AI Autopilot for an Enterprise Resource Planning (ERP) system. "
                        "You can see the user's screen through screenshots and hear their voice commands via audio. "
                        "You also receive a textual 'Accessibility Tree' that lists interactive elements and their IDs. "
                        "\n\n"
                        "### OPERATIONAL PROTOCOL:\n"
                        "1. **Analyze First**: When the user gives a command, look at the screenshot and Accessibility Tree to find the relevant elements. "
                        "2. **Safety & Confirmation (MANDATORY)**: \n"
                        "   - For any CRITICAL action (e.g., clicking 'Submit', 'Delete', 'Pay', 'Confirm', 'Save Changes'), you MUST NOT execute the click immediately.\n"
                        "   - First, call `highlight_element(id)` to show the user what you intend to do.\n"
                        "   - Verbally ask: 'I am about to [action] on [element], should I proceed?'\n"
                        "   - ONLY call `click_element(id)` after the user gives verbal approval ('Yes', 'Proceed', 'Go ahead').\n"
                        "3. **Tool Selection**: \n"
                        "   - Use `click_element(id)` to click buttons, links, or inputs.\n"
                        "   - Use `type_text(id, text)` to fill out forms. Always click the field first if needed.\n"
                        "   - Use `scroll_page(direction)` if the element you need isn't visible.\n"
                        "   - Use `navigate_to(url)` to switch between different modules if you know the destination URL.\n"
                        "   - Use `read_text()` to extract data from the page that isn't in the Accessibility Tree.\n"
                        "4. **Feedback Loop**: Wait for a status update confirming the action was completed before making the next tool call. "
                        "5. **Communication**: Be professional, concise, and confirm the actions you are taking over the voice channel. "
                        "If you are unsure or need clarification, ask the user."
                    )
                )
            ]
        )
    )

    try:
        # Connect to the Gemini Live API
        async with client.aio.live.connect(model="gemini-2.5-flash-native-audio-preview-12-2025", config=config) as gemini_session:
            print("🟢 Connected to Gemini 2.5 Live API")
            
            pending_tool_calls = {}

            # Task 1: Receive audio/images/status from extension and forward to Gemini
            async def receive_from_extension():
                while True:
                    try:
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        
                        if message.get("type") == "audio":
                            audio_b64 = message.get("data")
                            if audio_b64:
                                audio_bytes = base64.b64decode(audio_b64)
                                await gemini_session.send(input=types.LiveClientRealtimeInput(
                                    media_chunks=[types.Blob(
                                        mime_type="audio/pcm;rate=16000",
                                        data=audio_bytes
                                    )]
                                ))
                            
                        elif message.get("type") == "image":
                            image_data = message.get("data")
                            page_state = message.get("pageState", {})
                            input_args = {}
                            
                            if image_data:
                                if "," in image_data:
                                    image_data = image_data.split(",")[1]
                                image_bytes = base64.b64decode(image_data)
                                input_args["media_chunks"] = [types.Blob(mime_type="image/jpeg", data=image_bytes)]

                            if page_state.get('domChanged'):
                                dom_text = f"URL: {page_state.get('url')}\nTitle: {page_state.get('title')}\nAccessibility Tree:\n{json.dumps(page_state.get('accessibilityTree', []), indent=2)}"
                                input_args["text"] = dom_text

                            if input_args:
                                await gemini_session.send(input=types.LiveClientRealtimeInput(**input_args))
                            
                        elif message.get("type") == "status":
                            print(f"📡 Extension Status: {message.get('message')} - {message.get('detail', '')}")
                            # Resolve pending tool calls
                            for tool_name, call_id in list(pending_tool_calls.items()):
                                await gemini_session.send(input=types.LiveClientToolResponse(
                                    function_responses=[types.FunctionResponse(
                                        name=tool_name,
                                        id=call_id,
                                        response={"result": message.get("message"), "detail": message.get("detail", "")}
                                    )]
                                ))
                            pending_tool_calls.clear()

                    except WebSocketDisconnect:
                        print("🔴 Extension disconnected.")
                        break
                    except Exception as e:
                        print(f"❌ Error receiving from extension: {e}")

            # Task 2: Receive audio/function calls from Gemini and send to extension
            async def receive_from_gemini():
                try:
                    async for response in gemini_session.receive():
                        server_content = response.server_content
                        
                        # 1. Handle Transcriptions and Audio
                        if server_content is not None:
                            if getattr(server_content, 'interrupted', False):
                                print("⚠️ User interrupted the model!")
                                await websocket.send_json({"type": "command", "command": "stop_audio"})
                                
                            # Debug: Print Model Transcriptions
                            if server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data:
                                        audio_data = part.inline_data.data
                                        if isinstance(audio_data, bytes):
                                            audio_data = base64.b64encode(audio_data).decode('utf-8')
                                        await websocket.send_json({
                                            "type": "audio",
                                            "data": audio_data,
                                            "mime_type": part.inline_data.mime_type
                                        })
                            
                            # Debug: Print Input/Output Transcriptions (if available)
                            if server_content.turn_complete:
                                # This can be used to see when a thought is finished
                                pass

                        # 2. Handle Function Calls
                        if response.tool_call is not None:
                            for function_call in response.tool_call.function_calls:
                                name = function_call.name
                                args = function_call.args
                                
                                print(f"🤖 Gemini Tool Call: {name}({json.dumps(args)})")
                                pending_tool_calls[name] = function_call.id
                                
                                command_payload = {"type": "command", "command": name}
                                command_payload.update(args)
                                await websocket.send_json(command_payload)

                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"❌ Error receiving from Gemini: {e}")

            # Run both bidirectional communication tasks concurrently
            await asyncio.gather(
                asyncio.create_task(receive_from_extension()),
                asyncio.create_task(receive_from_gemini())
            )

    except Exception as e:
        print(f"❌ Gemini connection error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
