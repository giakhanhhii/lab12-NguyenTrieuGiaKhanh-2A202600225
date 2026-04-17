"""
Basic agent loop using the Anthropic Claude API.
Receives user input, calls tools as needed, and returns results.
"""

import logging
from openai import OpenAI
from .config import  DEFAULT_MODEL, LOG_LEVEL, OPENAI_API_KEY
from .tools import get_tool_schemas, execute_tool
from tools import LectureTools

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intelligent AI assistant.
You can use the provided tools to complete tasks.
Think step by step and use tools when necessary."""


def create_agent():
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=OPENAI_API_KEY)


def run_agent_loop(client, user_input: str, max_turns: int = 10) -> str:
    messages = [{"role": "user", "content": user_input}]
    tools = get_tool_schemas()

    for turn in range(max_turns):
        logger.info(f"Turn {turn + 1}/{max_turns}")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
        )

        msg = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # 1. Nếu không có tool call → trả kết quả luôn
        if not msg.tool_calls:
            return msg.content or ""

        # 2. Có tool call → xử lý
        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": msg.tool_calls
        })

        for tool_call in msg.tool_calls:
            tool_name = tool_call.function.name
            tool_args = tool_call.function.arguments

            logger.info(f"Calling tool: {tool_name}({tool_args})")

            result = execute_tool(tool_name, tool_args)

            logger.info(f"Result: {str(result)[:200]}")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })

    return "Agent reached the maximum number of processing turns."


def main():
    """Interactive loop - enter a prompt and receive results."""
    client = create_agent()
    print("Agentic App (type 'quit' to exit)")
    print("-" * 50)

    while True:
        user_input = input("\nYou: ").strip()
        if not user_input or user_input.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        try:
            response = run_agent_loop(client, user_input)
            print(f"\nAgent: {response}")
        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"\nError: {e}")

class LectureAgent:
    def __init__(self):
        self.tools = LectureTools()

    def run(self, user_prompt, output_type="slide"):
        print(f"--- Agent đang xử lý: {user_prompt} ---")
        
        # 1. Gọi LLM lấy kịch bản (Dùng System Prompt JSON đã soạn)
        # 2. Điều phối tool
        if output_type == "slide":
            script = self.get_llm_json(user_prompt)
            path = self.tools.create_pptx(script)
            pass
        return "Hoàn thành!"
    
if __name__ == "__main__":
    main()
