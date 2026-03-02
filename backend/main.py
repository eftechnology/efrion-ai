import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

# ==============================================================================
# 🔑 INSERT YOUR GEMINI API KEY HERE
# You can also set it in your terminal before running: export GEMINI_API_KEY="..."
# ==============================================================================
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
# 🛠️ CONFIGURE FUNCTION CALLING (TOOLS) FOR GEMINI 2.0
# Define the tools the model can call to navigate the UI.
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
        )
    ]
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Configure the Gemini Live API session
    # We use gemini-2.5-flash-native-audio-preview-12-2025 for multimodal live interactions
    config = types.LiveConnectConfig(
        response_modalities=[types.LiveModality.AUDIO], # We want audio back to play to the user
        tools=[ui_tools], # Attach our function calling tools here
        system_instruction=types.Content(
            parts=[
                types.Part.from_text(
                    "You are an AI autopilot for a complex ERP system. "
                    "You can see the user's screen and hear their voice commands. "
                    "You will receive a visual screenshot AND a text-based Accessibility Tree representing the interactive elements currently visible on the screen. "
                    "To take actions, you must cross-reference the visual UI with the Accessibility Tree to find the correct element 'id' (e.g., 'el-5'), and then call the appropriate tool (click_element or type_text). "
                    "Always wait for confirmation that the action completed before proceeding to the next step."
                )
            ]
        )
    )

    try:
        # Connect to the Gemini Live API
        async with client.aio.live.connect(model="gemini-2.5-flash-native-audio-preview-12-2025", config=config) as gemini_session:
            print("Connected to Gemini 2.5 Native Audio Preview Multimodal Live API")
            
            pending_tool_calls = {}

            # Task 1: Receive audio/images/status from extension and forward to Gemini
            async def receive_from_extension():
                try:
                    while True:
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        
                        if message.get("type") == "audio":
                            # Note: The extension sends audio/webm. For production, you may need
                            # to decode this into raw PCM 16kHz for Gemini, depending on SDK strictness.
                            audio_data = message.get("data")
                            await gemini_session.send(input=types.LiveClientRealtimeInput(
                                media_chunks=[types.Blob(
                                    mime_type="audio/webm",
                                    data=audio_data
                                )]
                            ))
                            
                        elif message.get("type") == "image":
                            # Receive base64 image (screenshot) and pageState from the extension
                            image_data = message.get("data")
                            if "," in image_data:
                                image_data = image_data.split(",")[1] # Strip the data URI prefix
                            
                            page_state = message.get("pageState", {})
                            
                            input_args = {
                                "media_chunks": [types.Blob(
                                    mime_type="image/jpeg",
                                    data=image_data
                                )]
                            }

                            # Only send the textual representation of the DOM if it has changed
                            if page_state.get('domChanged'):
                                dom_text = f"URL: {page_state.get('url')}\n"
                                dom_text += f"Title: {page_state.get('title')}\n"
                                dom_text += f"Ready State: {page_state.get('readyState')}\n"
                                dom_text += f"Accessibility Tree:\n{json.dumps(page_state.get('accessibilityTree', []), indent=2)}"
                                input_args["text"] = dom_text

                            await gemini_session.send(input=types.LiveClientRealtimeInput(**input_args))
                            
                        elif message.get("type") == "status":
                            print(f"Frontend Status: {message.get('message')} - {message.get('detail', '')}")
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
                    print("Extension disconnected.")
                except Exception as e:
                    print(f"Error receiving from extension: {e}")

            # Task 2: Receive audio/function calls from Gemini and send to extension
            async def receive_from_gemini():
                try:
                    async for response in gemini_session.receive():
                        server_content = response.server_content
                        
                        # 1. Handle Audio/Text responses from the model
                        if server_content is not None:
                            # Check if the user interrupted the AI
                            if getattr(server_content, 'interrupted', False):
                                print("User interrupted the model! Flushing queues.")
                                await websocket.send_json({"type": "command", "command": "stop_audio"})
                                
                            if server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data:
                                        # Forward the audio response back to the Chrome Extension
                                        await websocket.send_json({
                                            "type": "audio",
                                            "data": part.inline_data.data, # Base64 encoded audio
                                            "mime_type": part.inline_data.mime_type # Usually audio/pcm
                                        })
                                    
                        # 2. Handle Function Calls (e.g., click_element)
                        if response.tool_call is not None:
                            for function_call in response.tool_call.function_calls:
                                name = function_call.name
                                args = function_call.args
                                
                                if name in ["click_element", "type_text", "scroll_page"]:
                                    print(f"Gemini requested tool call: {name}(args={args})")
                                    
                                    pending_tool_calls[name] = function_call.id
                                    
                                    # Send command to the Chrome extension to execute the UI action
                                    command_payload = {
                                        "type": "command",
                                        "command": name
                                    }
                                    # Merge arguments into the payload
                                    command_payload.update(args)
                                    
                                    await websocket.send_json(command_payload)

                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"Error receiving from Gemini: {e}")

            # Run both bidirectional communication tasks concurrently
            await asyncio.gather(
                asyncio.create_task(receive_from_extension()),
                asyncio.create_task(receive_from_gemini())
            )

    except Exception as e:
        print(f"Gemini connection error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    # Start the local WebSocket server on ws://localhost:8000/ws
    uvicorn.run(app, host="0.0.0.0", port=8000)
