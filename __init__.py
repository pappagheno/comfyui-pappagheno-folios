"""Prompt Picker: pick one of several connected prompts from a dropdown."""

MAX_PROMPTS = 100
WEB_DIRECTORY = "./js"


class PromptPicker:
    CATEGORY = "utils/prompt"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "pick"

    color = "#231b12"
    bgcolor = "#000000"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "selected": ([str(i) for i in range(1, MAX_PROMPTS + 1)],),
            },
            "optional": {
                f"prompt_{i}": ("STRING", {"forceInput": True, "lazy": True})
                for i in range(1, MAX_PROMPTS + 1)
            },
        }

    @classmethod
    def VALIDATE_INPUTS(cls, selected):
        try:
            index = _index(selected)
        except ValueError:
            return f"Prompt Picker: can't read selection '{selected}'"
        if not 1 <= index <= MAX_PROMPTS:
            return f"Prompt Picker: selection {index} is out of range"
        return True

    def check_lazy_status(self, selected, **kwargs):
        return [f"prompt_{_index(selected)}"]

    def pick(self, selected, **kwargs):
        index = _index(selected)
        text = kwargs.get(f"prompt_{index}")
        if text is None:
            raise ValueError(f"Prompt Picker: nothing is connected to prompt_{index}")
        return (text,)


def _index(selected):
    return int(str(selected).split(":", 1)[0].strip())


NODE_CLASS_MAPPINGS = {"PromptPicker": PromptPicker}
NODE_DISPLAY_NAME_MAPPINGS = {"PromptPicker": "📜 FOLIOS"}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]