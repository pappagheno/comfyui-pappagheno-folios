import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

function linkedSource(node, inputName) {
  const input = node.inputs?.find((i) => i.name === inputName);
  if (!input || input.link == null) return null;
  const link = node.graph?.links?.[input.link] ?? node.graph?.getLink?.(input.link);
  return link ? node.graph.getNodeById(link.origin_id) : null;
}

function connectedOptions(node) {
  const options = [];
  for (const input of node.inputs ?? []) {
    const match = /^prompt_(\d+)$/.exec(input.name);
    if (!match || input.link == null) continue;
    const source = linkedSource(node, input.name);
    const title = source?.title || source?.type || `prompt_${match[1]}`;
    options.push(`${match[1]}: ${title}`);
  }
  return options;
}

function indexOf(value) {
  return parseInt(String(value).split(":")[0], 10);
}

function sourceText(source) {
  if (!source?.widgets) return null;
  const textWidgets = source.widgets.filter(
    (w) => typeof w.value === "string" && w.type !== "combo"
  );
  if (!textWidgets.length) return null;
  const multiline = textWidgets.find((w) => w.type === "customtext" || w.inputEl?.tagName === "TEXTAREA");
  return (multiline ?? textWidgets[0]).value;
}

const GLYPH_CHARS = [
  "𓋹", "𓁹", "𓇅", "𓏞", "𓅓", "𓊹", "𓈖", "𓉐", "𓌃", "𓂋", 
  "𓎛", "𓋹", "𓏞", "𓁹", "𓅓", "𓇅", "𓊹", "𓈖", "𓌃", "𓉐",
  "𓆓", "𓍯", "𓊃", "𓏏", "𓅱", "𓂧", "𓆑", "𓄿", "𓈎", "𓋴"
];

app.registerExtension({
  name: "PromptPicker.dropdown",
  nodeCreated(node) {
    if (node.comfyClass !== "PromptPicker") return;

    if (!node.title.includes("📜")) {
      node.title = "📜 " + node.title.replace(/^📜\s*/, "");
    }
    node.color = "#231b12";
    node.bgcolor = "#000000";

    const origOnDrawBackground = node.onDrawBackground;
    node.onDrawBackground = function (ctx) {
      if (origOnDrawBackground) {
        origOnDrawBackground.apply(this, arguments);
      }
      if (this.flags?.collapsed) return;

      const [w, h] = this.size;
      const slotHeight = LiteGraph.NODE_SLOT_HEIGHT || 20;
      const numInputs = (this.inputs ?? []).length;

      // In LiteGraph onDrawBackground, y = 0 is ALREADY the bottom of the title bar!
      const boxX = 6;
      const boxY = 2; // Starts right under the FOLIOS title bar, enclosing prompt_1
      const boxW = w - 12;

      const selectedWidget = this.widgets?.find((w) => w.name === "selected");
      const boxBottom = selectedWidget?.last_y
        ? selectedWidget.last_y - 4
        : numInputs * slotHeight + 6;
      const boxH = boxBottom - boxY;

      if (boxH <= 10) return;

      ctx.save();

      // 1. Dark papyrus background for the entire socket zone (prompt_1 to prompt_N)
      ctx.fillStyle = "#1e170f";
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // 2. Gold border around the socket zone
      ctx.strokeStyle = "#8a7042";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // 3. Clip inside the gold box
      ctx.beginPath();
      ctx.rect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);
      ctx.clip();

      // 4. Draw one row of hieroglyphs per input slot (starting at slot 0 = prompt_1)
      ctx.font = "14px serif";
      ctx.fillStyle = "#d4af37";
      ctx.globalAlpha = 0.38;
      ctx.textAlign = "left";

      const startX = 84; // Clear of "prompt_10" text on the left

      for (let i = 0; i < numInputs; i++) {
        // LiteGraph draws slot i text baseline at (i * slotHeight) + 18
        const textY = i * slotHeight + 18;
        if (textY > boxBottom - 2) break;

        // On row 0 (prompt_1), stop before the "prompt" output label on the right (w - 68).
        // On all rows below (prompt_2..N), go all the way to the right border (w - 14).
        const endX = (i === 0) ? (w - 68) : (w - 14);
        const availableWidth = endX - startX;

        if (availableWidth > 15) {
          let line = "";
          let idx = i * 4;
          while (ctx.measureText(line).width < availableWidth) {
            line += GLYPH_CHARS[idx % GLYPH_CHARS.length] + "  ";
            idx++;
          }
          ctx.fillText(line, startX, textY);
        }
      }

      ctx.restore();
    };

    const widget = node.widgets?.find((w) => w.name === "selected");
    if (!widget) return;

    const fallback = widget.options.values;
    Object.defineProperty(widget.options, "values", {
      configurable: true,
      get() {
        const options = connectedOptions(node);
        return options.length ? options : fallback;
      },
    });

    const preview = ComfyWidgets["STRING"](
      node,
      "preview",
      ["STRING", { multiline: true }],
      app
    ).widget;
    preview.serialize = false;
    preview.options = { ...(preview.options ?? {}), serialize: false };
    preview.serializeValue = () => undefined;

    const enforcePapyrusBoxStyle = () => {
      if (preview.inputEl) {
        preview.inputEl.readOnly = true;
        preview.inputEl.placeholder = "Selected prompt displays here...";

        preview.inputEl.style.setProperty("background-color", "#f2e6cf", "important");
        preview.inputEl.style.setProperty("color", "#1c1710", "important");
        preview.inputEl.style.setProperty("font-weight", "500", "important");
        preview.inputEl.style.setProperty("font-size", "12px", "important");
        preview.inputEl.style.setProperty("line-height", "1.5", "important");
        preview.inputEl.style.setProperty("border", "1.5px solid #7c6239", "important");
        preview.inputEl.style.setProperty("border-radius", "4px", "important");
        preview.inputEl.style.setProperty("padding", "8px", "important");
        preview.inputEl.style.setProperty("opacity", "1.0", "important");
        preview.inputEl.style.setProperty("box-shadow", "inset 0 2px 5px rgba(45, 30, 10, 0.3)", "important");
      }
    };

    enforcePapyrusBoxStyle();
    preview.value = "";

    const setPreview = (text) => {
      const value = text ?? "";
      if (preview.value !== value) {
        preview.value = value;
        if (preview.inputEl) preview.inputEl.value = value;
      }
    };

    const refreshPreview = () => {
      enforcePapyrusBoxStyle();
      const index = indexOf(widget.value);
      if (Number.isNaN(index)) return setPreview("");
      const source = linkedSource(node, `prompt_${index}`);
      if (!source) return setPreview(`(nothing connected to prompt_${index})`);
      const live = sourceText(source);
      if (live != null) return setPreview(live);
      setPreview("(this prompt is built by other nodes upstream; no typed text to show)");
    };

    const syncLabel = () => {
      const index = indexOf(widget.value);
      const current = connectedOptions(node).find((o) => indexOf(o) === index);
      if (current && current !== widget.value) widget.value = current;
    };

    const PROMPT_INPUT = /^prompt_(\d+)$/;
    const maxInputs = 100;

    const updateInputs = () => {
      if (!node.inputs) return;

      // Strip the dummy " " input if it was saved in the node from before
      const gapIdx = node.inputs.findIndex((i) => i.name === " ");
      if (gapIdx >= 0) node.removeInput(gapIdx);

      let highest = 0;
      for (const input of node.inputs) {
        const match = PROMPT_INPUT.exec(input.name);
        if (match && input.link != null) highest = Math.max(highest, Number(match[1]));
      }
      const wanted = Math.min(highest + 1, maxInputs);

      for (let n = 1; n <= wanted; n++) {
        if (!node.inputs.some((i) => i.name === `prompt_${n}`)) node.addInput(`prompt_${n}`, "STRING");
      }
      for (let i = node.inputs.length - 1; i >= 0; i--) {
        const match = PROMPT_INPUT.exec(node.inputs[i].name);
        if (match && Number(match[1]) > wanted && node.inputs[i].link == null) node.removeInput(i);
      }

      const minHeight = node.computeSize()[1];
      if (node.size[1] < minHeight || node.size[1] > minHeight + 300) {
        node.setSize([node.size[0], minHeight + 150]);
      }
      node.setDirtyCanvas(true, true);
    };

    let updatePending = false;
    const scheduleUpdate = () => {
      if (updatePending) return;
      updatePending = true;
      setTimeout(() => {
        updatePending = false;
        updateInputs();
        syncLabel();
        refreshPreview();
      }, 0);
    };

    const onConnectionsChange = node.onConnectionsChange;
    node.onConnectionsChange = function () {
      const result = onConnectionsChange?.apply(this, arguments);
      syncLabel();
      refreshPreview();
      scheduleUpdate();
      return result;
    };

    const onDrawForeground = node.onDrawForeground;
    node.onDrawForeground = function () {
      syncLabel();
      refreshPreview();
      return onDrawForeground?.apply(this, arguments);
    };

    const callback = widget.callback;
    widget.callback = function () {
      const result = callback?.apply(this, arguments);
      refreshPreview();
      return result;
    };

    const timer = setInterval(() => {
      if (!node.graph) return;
      refreshPreview();
    }, 300);
    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
      clearInterval(timer);
      return onRemoved?.apply(this, arguments);
    };

    const dropLabel = () => {
      const i = node.outputs?.findIndex((o) => o.name === "label") ?? -1;
      if (i >= 0) node.removeOutput(i);
    };
    const onConfigure = node.onConfigure;
    node.onConfigure = function () {
      const result = onConfigure?.apply(this, arguments);
      if (!this.title.includes("📜")) {
        this.title = "📜 " + this.title.replace(/^📜\s*/, "");
      }
      this.color = "#231b12";
      this.bgcolor = "#000000";
      dropLabel();
      scheduleUpdate();
      return result;
    };

    requestAnimationFrame(() => {
      dropLabel();
      updateInputs();
      node.setSize([Math.max(node.size[0], 430), node.size[1]]);
      refreshPreview();
      node.setDirtyCanvas(true, true);
    });
  },
});
