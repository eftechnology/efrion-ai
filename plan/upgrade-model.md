# Plan: Upgrade Gemini Model

**Objective:**
Upgrade the Gemini model used in the ERP AI Autopilot from `gemini-2.0-flash-exp` to `gemini-2.5-flash-native-audio-preview-12-2025` to leverage native audio capabilities.

**Key Files & Context:**
*   `backend/main.py`: Contains the `client.aio.live.connect` initialization and configuration for the Gemini Live API.

**Implementation Steps:**
1.  **Update Model String:** In `backend/main.py`, locate the connection string:
    ```python
    async with client.aio.live.connect(model="gemini-2.0-flash-exp", config=config) as gemini_session:
    ```
    Change it to:
    ```python
    async with client.aio.live.connect(model="gemini-2.5-flash-native-audio-preview-12-2025", config=config) as gemini_session:
    ```
2.  **Update Logging:** Update the corresponding print statement for clarity:
    ```python
    print("Connected to Gemini 2.5 Native Audio Preview Multimodal Live API")
    ```

**Verification & Testing:**
1.  Start the backend server: `cd backend && uv run main.py`.
2.  Observe the startup logs to confirm the new connection string is printed.
3.  Connect the Chrome extension (`test_erp.html`) and test voice input/output to ensure the native audio model is functioning correctly.