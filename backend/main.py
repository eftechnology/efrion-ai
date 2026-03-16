import os
import re
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
ENABLE_SAFETY_LOCK = os.environ.get("ENABLE_SAFETY_LOCK", "false").lower() == "true"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the GenAI client with v1alpha for experimental model support
client = genai.Client(http_options={'api_version': 'v1alpha'})

# ==============================================================================
# 🛠️ CONFIGURE FUNCTION CALLING (TOOLS)
# ==============================================================================
base_tools = [
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
        description="Types text into an input field, textarea, or selects an option from a <select> dropdown using its ID from the provided Accessibility Tree.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "id": types.Schema(type=types.Type.STRING, description="The ID of the element to interact with."),
                "text": types.Schema(type=types.Type.STRING, description="The text to type or the option value/label to select."),
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
        name="undo_last_action",
        description="Reverts the last action performed by the AI (e.g., restores previous text or navigates back). Use this if the user says 'Undo' or 'Go back'.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}),
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
        name="set_plan",
        description="Silently sets the task plan shown in the HUD overlay. Call this BEFORE starting any actions to display your plan to the user without speaking each step aloud.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "steps": types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING),
                    description="List of plan steps in order, e.g. ['Click Orders', 'Fill customer name', 'Submit form']",
                ),
            },
            required=["steps"],
        ),
    ),
]

if ENABLE_SAFETY_LOCK:
    base_tools.append(
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
    )

ui_tools = types.Tool(function_declarations=base_tools)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 New extension connection accepted")
    
    # ==============================================================================
    # 🤖 CONFIGURE SYSTEM INSTRUCTION
    # ==============================================================================
    if ENABLE_SAFETY_LOCK:
        safety_protocol = (
            "2. Safety & Confirmation (MANDATORY): \n"
            "   - For any CRITICAL action (e.g., clicking 'Submit', 'Delete', 'Pay', 'Confirm', 'Save Changes'), you MUST NOT execute the click immediately.\n"
            "   - First, call `highlight_element(id)` to show the user what you intend to do.\n"
            "   - Verbally ask: 'I am about to [action] on [element], should I proceed?'\n"
            "   - ONLY call `click_element(id)` after the user gives verbal approval ('Yes', 'Proceed', 'Go ahead').\n"
        )
    else:
        safety_protocol = (
            "2. Speed & Autonomy: \n"
            "   - You should execute actions IMMEDIATELY without asking for verbal permission first. "
            "The user has disabled the safety lock for faster interaction. Perform the requested task directly.\n"
        )

    # Configure the Gemini Live API session
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        tools=[ui_tools],
        # Configure the AI voice (Puck, Charon, Kore, Fenrir, Aoede)
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Puck"
                )
            )
        ),
        # Enable real-time transcription (enabled=True is not allowed in some SDK versions)
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(
            parts=[
                types.Part.from_text(
                    text=(
                        "You are an expert AI Autopilot for an Enterprise Resource Planning (ERP) system. "
                        "You can see the user's screen through screenshots and hear their voice commands via audio. "
                        "You also receive a textual 'Accessibility Tree' that lists interactive elements and their IDs. "
                        "\n\n"
                        "### OPERATIONAL PROTOCOL:\n"
                        "1. **Analyze & Plan**: When the user gives a command, first analyze the screen. "
                        "Call `set_plan(steps=[...])` SILENTLY before taking any actions — do NOT read the steps aloud, they will be shown in the HUD overlay. "
                        "Then immediately start executing.\n"
                        f"{safety_protocol}"
                        "3. **Tool Selection**: \n"
                        "   - Use `click_element(id)` to click buttons, links, or inputs.\n"
                        "   - Use `type_text(id, text)` to fill out forms AND to select options from `<select>` dropdowns. Always click the field first if needed.\n"
                        "   - Use `scroll_page(direction)` if the element you need isn't visible.\n"
                        "   - Use `navigate_to(url)` to switch between different modules.\n"
                        "   - Use `read_text()` to extract data from the page.\n"
                        "   - Use `undo_last_action()` if the user wants to revert the last thing you did.\n"
                        "   - Use `set_plan(steps)` silently at the start of every multi-step task.\n"
                        "4. **Progress Updates**: After ALL steps are done, give a brief spoken summary. Do NOT narrate each individual step — the HUD shows progress.\n"
                        "5. **Communication**: Be professional and concise. If you are unsure or need clarification, ask the user."
                    )
                )
            ]
        )
    )

    try:
        # Connect to the Gemini Live API
        print(f"🔗 Connecting to Gemini Live API with model: gemini-2.5-flash-native-audio-preview-12-2025")
        async with client.aio.live.connect(model="gemini-2.5-flash-native-audio-preview-12-2025", config=config) as gemini_session:
            pending_tool_calls = {}
            locked_commands = {}
            confirmed_ids = set()
            stats = {"audio_chunks_sent": 0}
            plan_state = {"steps": [], "active_index": 0, "output_buffer": ""}
            silent_mode = False
            
            # Synchronization event: only send input when no tool calls are pending
            ready_for_input = asyncio.Event()
            ready_for_input.set()

            # Queues for decoupling
            audio_input_queue = asyncio.Queue()
            video_input_queue = asyncio.Queue()
            text_input_queue = asyncio.Queue()

            # Task: Dispatch audio from queue to Gemini
            async def dispatch_audio():
                try:
                    while True:
                        audio_bytes = await audio_input_queue.get()
                        # AUDIO MUST NOT BE BLOCKED so Gemini can hear "Proceed"
                        await gemini_session.send_realtime_input(
                            audio=types.Blob(mime_type="audio/pcm;rate=16000", data=audio_bytes)
                        )
                        stats["audio_chunks_sent"] += 1
                except asyncio.CancelledError:
                    pass

            # Task: Dispatch video from queue to Gemini
            async def dispatch_video():
                try:
                    while True:
                        video_bytes = await video_input_queue.get()
                        await ready_for_input.wait() # VIDEO/DOM ARE STILL BLOCKED
                        await gemini_session.send_realtime_input(video=types.Blob(mime_type="image/jpeg", data=video_bytes))
                except asyncio.CancelledError:
                    pass

            # Task: Dispatch text from queue to Gemini
            async def dispatch_text():
                try:
                    while True:
                        text = await text_input_queue.get()
                        await ready_for_input.wait() # VIDEO/DOM ARE STILL BLOCKED
                        await gemini_session.send_realtime_input(text=text)
                except asyncio.CancelledError:
                    pass

            # Task 1: Receive messages from extension and push to queues
            async def receive_from_extension():
                while True:
                    try:
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        
                        if message.get("type") == "audio" or message.get("action") == "send_audio":
                            audio_b64 = message.get("data")
                            if audio_b64:
                                audio_bytes = base64.b64decode(audio_b64)
                                await audio_input_queue.put(audio_bytes)
                            
                        elif message.get("type") == "image":
                            image_data = message.get("data")
                            page_state = message.get("pageState", {})
                            dom_update = page_state.get('domUpdate')
                            
                            if image_data:
                                if "," in image_data:
                                    image_data = image_data.split(",")[1]
                                await video_input_queue.put(base64.b64decode(image_data))

                            if dom_update:
                                text_msg = f"URL: {page_state.get('url')}\n"
                                if dom_update['type'] == 'full':
                                    text_msg += f"FULL ACCESSIBILITY TREE UPDATE:\n{json.dumps(dom_update['tree'], indent=2)}"
                                else:
                                    diff = dom_update['diff']
                                    text_msg += "UI CHANGES DETECTED:\n"
                                    if diff['added']: text_msg += f"- ADDED: {json.dumps(diff['added'])}\n"
                                    if diff['removed']: text_msg += f"- REMOVED IDs: {', '.join(diff['removed'])}\n"
                                    if diff['updated']: text_msg += f"- UPDATED: {json.dumps(diff['updated'])}\n"
                                
                                await text_input_queue.put(text_msg)
                            
                        elif message.get("type") == "action" and message.get("action") == "confirm":
                            if locked_commands:
                                print(f"🔓 Safety Lock RELEASED via HUD button.")
                                for el_id, cmd in list(locked_commands.items()):
                                    confirmed_ids.add(el_id)
                                    await websocket.send_json(cmd)
                                locked_commands.clear()
                                await websocket.send_json({"type": "command", "command": "hide_confirm_ui"})

                        elif message.get("type") == "silent_mode":
                            nonlocal silent_mode
                            silent_mode = message.get("enabled", False)
                            print(f"🔇 Silent mode: {'ON' if silent_mode else 'OFF'}")

                        elif message.get("type") == "status":
                            print(f"📡 Extension Status: {message.get('message')} - {message.get('detail', '')}")

                            action_completed = message.get("action")
                            # Advance plan step on each successful action
                            if action_completed and message.get("message") == "success" and plan_state["steps"]:
                                plan_state["active_index"] = min(plan_state["active_index"] + 1, len(plan_state["steps"]))
                                await websocket.send_json({
                                    "type": "command",
                                    "command": "update_plan",
                                    "steps": plan_state["steps"],
                                    "activeIndex": plan_state["active_index"],
                                })

                            if pending_tool_calls:
                                function_responses = []
                                for call_id, tool_name in list(pending_tool_calls.items()):
                                    if action_completed and tool_name != action_completed:
                                        continue
                                        
                                    function_responses.append(
                                        types.FunctionResponse(
                                            name=tool_name,
                                            id=call_id,
                                            response={"result": message.get("message"), "detail": message.get("detail", "")}
                                        )
                                    )
                                    del pending_tool_calls[call_id]
                                
                                if function_responses:
                                    await gemini_session.send_tool_response(function_responses=function_responses)
                                    # ONLY resume input if ALL tool calls are cleared
                                    if not pending_tool_calls:
                                        print("🟢 All tool calls resolved. Resuming input dispatchers.")
                                        ready_for_input.set()
                                        # Advance plan step
                                        if plan_state["steps"]:
                                            plan_state["active_index"] = min(plan_state["active_index"] + 1, len(plan_state["steps"]))
                                            await websocket.send_json({
                                                "type": "command",
                                                "command": "update_plan",
                                                "steps": plan_state["steps"],
                                                "activeIndex": plan_state["active_index"]
                                            })

                    except WebSocketDisconnect:
                        print("🔴 Extension disconnected.")
                        break
                    except Exception as e:
                        print(f"❌ Error receiving from extension: {e}")
                        break

            # Task 2: Receive audio/function calls from Gemini and send to extension
            async def receive_from_gemini():
                try:
                    while True:
                        async for response in gemini_session.receive():
                            # Handle Transcriptions, Interruptions, and Audio
                            server_content = response.server_content
                            if server_content is not None:
                                if getattr(server_content, 'interrupted', False):
                                    await websocket.send_json({"type": "command", "command": "stop_audio"})
                                
                                if server_content.input_transcription and server_content.input_transcription.text:
                                    transcript = server_content.input_transcription.text.lower()
                                    await websocket.send_json({"type": "transcription", "source": "USER", "text": transcript})
                                    
                                    # SAFETY LOCK RELEASE CHECK
                                    affirmations = ["proceed", "yes", "go ahead", "do it", "confirm", "ok", "okay", "yep", "sure"]
                                    if any(word in transcript for word in affirmations):
                                        if locked_commands:
                                            print(f"🔓 Safety Lock RELEASED via voice: '{transcript}'")
                                            for el_id, cmd in list(locked_commands.items()):
                                                confirmed_ids.add(el_id)
                                                await websocket.send_json(cmd)
                                            locked_commands.clear()
                                            await websocket.send_json({"type": "command", "command": "hide_confirm_ui"})
                                    
                                    # UNDO SHORTCUT
                                    if "undo" in transcript or "go back" in transcript:
                                        print(f"🔙 Undo triggered via voice: '{transcript}'")
                                        await websocket.send_json({"type": "command", "command": "undo_last_action"})

                                if server_content.output_transcription and server_content.output_transcription.text:
                                    text = server_content.output_transcription.text
                                    plan_state["output_buffer"] += text
                                    await websocket.send_json({"type": "transcription", "source": "MODEL", "text": text})

                                if getattr(server_content, 'turn_complete', False):
                                    buf = plan_state["output_buffer"]
                                    plan_state["output_buffer"] = ""
                                    if "PLAN:" in buf.upper():
                                        plan_start = buf.upper().find("PLAN:")
                                        plan_raw = buf[plan_start + 5:].strip()
                                        # Try numbered list first: "1. Step" or "1) Step"
                                        numbered = re.split(r'\d+[.)]\s+', plan_raw)
                                        numbered = [s.strip().rstrip('.,;').strip() for s in numbered if s.strip() and len(s.strip()) > 2]
                                        if len(numbered) > 1:
                                            steps = numbered
                                        else:
                                            steps = [s.strip().rstrip('.').strip() for s in plan_raw.split(',') if s.strip() and len(s.strip()) > 2]
                                        if steps:
                                            plan_state["steps"] = steps
                                            plan_state["active_index"] = 0
                                            await websocket.send_json({
                                                "type": "command",
                                                "command": "update_plan",
                                                "steps": steps,
                                                "activeIndex": 0
                                            })
                                    
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            if not silent_mode:
                                                audio_data = base64.b64encode(part.inline_data.data).decode('utf-8')
                                                await websocket.send_json({"type": "audio", "data": audio_data, "mime_type": part.inline_data.mime_type})

                            # Handle Function Calls
                            if response.tool_call is not None:
                                function_responses = []
                                
                                for function_call in response.tool_call.function_calls:
                                    name = function_call.name
                                    args = function_call.args
                                    el_id = args.get('id', 'global')
                                    
                                    command_payload = {"type": "command", "command": name}
                                    command_payload.update(args)
                                    
                                    # 0. set_plan — silent, instant, no extension round-trip
                                    if name == "set_plan":
                                        steps = args.get("steps", [])
                                        if steps:
                                            plan_state["steps"] = steps
                                            plan_state["active_index"] = 0
                                            await websocket.send_json({
                                                "type": "command",
                                                "command": "update_plan",
                                                "steps": steps,
                                                "activeIndex": 0,
                                            })
                                            print(f"📋 Plan set: {steps}")
                                        function_responses.append(types.FunctionResponse(
                                            name=name, id=function_call.id,
                                            response={"result": "Plan displayed in HUD."}
                                        ))
                                        continue

                                    # 1. Structural Safety Lock Interception
                                    sensitive_tools = ["click_element", "type_text", "navigate_to"]
                                    if ENABLE_SAFETY_LOCK and name in sensitive_tools and el_id not in confirmed_ids:
                                        print(f"🔒 Safety Lock ACTIVE: Intercepted {name}({json.dumps(args)})")
                                        locked_commands[el_id] = command_payload
                                        
                                        # Acknowledge to Gemini immediately
                                        function_responses.append(types.FunctionResponse(
                                            name=name, id=function_call.id,
                                            response={"result": "Action intercepted. Waiting for human confirmation."}
                                        ))
                                        
                                        await websocket.send_json({"type": "command", "command": "show_confirm_ui", "action_name": name})
                                        await websocket.send_json({"type": "transcription", "source": "SYSTEM", "text": f"Waiting for confirmation to {name}..."})
                                    
                                    # 2. Direct Execution (Lock disabled or already confirmed)
                                    else:
                                        if not ENABLE_SAFETY_LOCK and name in sensitive_tools:
                                            print(f"⚡ Safety Lock DISABLED: Auto-executing {name}")
                                        elif el_id in confirmed_ids:
                                            print(f"⏩ Auto-Releasing confirmed action: {name}({el_id})")
                                        
                                        # ALWAYS ACKNOWLEDGE IMMEDIATELY to prevent Error 1008
                                        function_responses.append(types.FunctionResponse(
                                            name=name, id=function_call.id,
                                            response={"result": f"Execution started for {name}."}
                                        ))
                                        
                                        await websocket.send_json(command_payload)
                                
                                if function_responses:
                                    await gemini_session.send_tool_response(function_responses=function_responses)
                        
                        await asyncio.sleep(0.1)
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"❌ Error receiving from Gemini: {e}")

            # Run all tasks concurrently
            tasks = [
                asyncio.create_task(receive_from_extension()),
                asyncio.create_task(receive_from_gemini()),
                asyncio.create_task(dispatch_audio()),
                asyncio.create_task(dispatch_video()),
                asyncio.create_task(dispatch_text())
            ]
            
            # Wait for either receiver to finish (extension disconnect or Gemini session end)
            done, pending = await asyncio.wait(
                tasks[:2], # Only watch the receivers
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    except Exception as e:
        print(f"❌ Gemini connection error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
