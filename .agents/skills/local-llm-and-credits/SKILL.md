---
name: local-llm-and-credits
description: Instructions for managing AI premium credits, monitoring credit usage, and falling back to local LLM instances (like Ollama or local slm-engine).
---

# Local LLM Fallback & Credits Management in Antigravity

This skill helps the agent and user optimize credit usage, monitor credit balance, and switch seamlessly to a local LLM when cloud credits run out.

## 1. Monitoring Premium Credits

To check your remaining AI premium credits, usage history, or update subscription settings:
*   **Command:** Type `/credits` in the chat input panel of the Antigravity IDE and hit enter. This will open the Credits panel displaying your current balance and usage.
*   **Settings:** You can toggle whether to use premium cloud credits using the `settings.json` file key:
    ```json
    "useG1Credits": true
    ```

## 2. Setting Up a Local LLM (Ollama)

For offline work or when cloud credits are depleted, run a local LLM on your machine using Ollama:

1.  **Download and Install:** Download Ollama for Windows from [ollama.com](https://ollama.com) and run the installer.
2.  **Start Ollama:** Make sure the Ollama application is running (an icon will appear in the Windows taskbar system tray).
3.  **Download a Coding Model:** Open PowerShell and run a model optimized for your hardware:
    *   **For Lightweight/Normal Devices (Recommended):** Run `ollama pull qwen2.5-coder:1.5b`. It requires less than 2 GB RAM, starts instantly, and produces high-quality coding suggestions on standard CPUs.
    *   **For Higher-End Devices (8GB+ RAM):** Run `ollama pull qwen2.5-coder:7b` or `ollama pull gemma2:2b` for richer context and better reasoning.

## 3. Invoking Local LLM Tools

Once the `ollama` MCP server is registered, the following tools become available in your Antigravity session:
*   `ollama.query_local_llm(prompt, model)`: Sends a prompt to the local Ollama instance and returns the output.
*   `ollama.check_local_ollama_status()`: Verifies if the local Ollama instance is running and lists the available models downloaded.

When cloud credits are exhausted or when performing heavy reasoning tasks, the agent can call `query_local_llm` to process code generation locally.
