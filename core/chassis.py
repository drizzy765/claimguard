import importlib
from typing import Any, Dict, Optional

import yaml
from langchain_core.tools import StructuredTool
from langgraph.prebuilt import create_react_agent

from core.llm import get_llm
from tools.pii_regex_masker import pii_regex_masker
from tools.tariff_lookup import tariff_lookup


class AgentChassis:
    """
    Unified engine infrastructure. Spawns distinct persona states
    by swapping runtime configurations dynamically without mutating code.
    """

    def __init__(
        self,
        profile_name: str,
        client_openrouter_key: Optional[str] = None,
        client_cerebras_key: Optional[str] = None,
    ):
        self.profile = self._load_profile(profile_name) or {}
        self.engine = self._initialize_llm_routing(
            client_openrouter_key, client_cerebras_key
        )
        self.tool_registry = {
            "tariff_lookup": tariff_lookup,
            "pii_regex_masker": pii_regex_masker,
        }

    def _load_profile(self, profile_name: str) -> Dict[str, Any]:
        profile_path = f"profiles/{profile_name}.yaml"
        with open(profile_path, "r", encoding="utf-8") as file:
            return yaml.safe_load(file)

    def _initialize_llm_routing(
        self,
        client_openrouter_key: Optional[str] = None,
        client_cerebras_key: Optional[str] = None,
    ):
        model_override = self.profile.get("model")
        return get_llm(
            model=model_override,
            temperature=0.0,
            client_openrouter_key=client_openrouter_key,
            client_cerebras_key=client_cerebras_key,
        )

    def _resolve_tools(self):
        resolved = []
        allocated_tools = self.profile.get("tools") or []
        for tool_path in allocated_tools:
            try:
                if hasattr(self, "tool_registry") and tool_path in self.tool_registry:
                    tool_func = self.tool_registry[tool_path]
                    if hasattr(tool_func, "args_schema"):
                        resolved.append(tool_func)
                    else:
                        resolved.append(
                            StructuredTool.from_function(
                                func=tool_func,
                                name=tool_path,
                                description=tool_func.__doc__ or f"Execute {tool_path}",
                            )
                        )
                elif "." in tool_path:
                    module_name, func_name = tool_path.split(".", 1)
                    module = importlib.import_module(f"mcp_servers.{module_name}")
                    func = getattr(module, func_name)
                    resolved.append(
                        StructuredTool.from_function(
                            func=func,
                            name=func_name,
                            description=func.__doc__ or f"Execute {func_name}",
                        )
                    )
                else:
                    print(f"Skipping invalid tool path format: {tool_path}")
            except Exception as e:
                print(f"Error loading tool {tool_path}: {e}")
        return resolved

    def run(self, user_prompt: str) -> str:
        """Executes the agent loop using LangGraph's prebuilt react agent."""
        tools = self._resolve_tools()
        persona = self.profile.get("personality") or {}
        system_prompt = (
            persona.get("system_prompt")
            or self.profile.get("system_prompt")
            or ""
        )
        agent_executor = create_react_agent(
            model=self.engine,
            tools=tools,
            prompt=system_prompt,
        )
        response = agent_executor.invoke({"messages": [("user", user_prompt)]})
        messages = response.get("messages", [])
        if messages:
            return messages[-1].content
        return "No response generated."
