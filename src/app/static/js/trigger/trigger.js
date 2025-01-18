class TriggerNode extends LGraphNode {
  constructor() {
    super();

    // Allow any type of input
    this.addInput("In", LiteGraph.ANY);

    // Output is always an event
    this.addOutput("Out", LiteGraph.EVENT);

    this.title = "Trigger";

    // Store previous input value
    this._prevInputValue = undefined;

    // Add a button widget to manually trigger the output
    this.addWidget("button", "Trigger", null, () => {
      // Trigger the output regardless of input connection
      this.triggerSlot(0, this.getInputData(0));
    });
  }

  /**
   * Called when the node is executed
   */
  onExecute() {
    // Get the current input value
    const inputValue = this.getInputData(0);

    // If the input value has changed, trigger the output
    if (inputValue !== this._prevInputValue) {
      this.triggerSlot(0, inputValue);
      this._prevInputValue = inputValue;
    }
  }

  /**
   * Called when connections change (inputs/outputs are connected/disconnected)
   * @param {number} type - The type of connection (input/output)
   * @param {number} slot - The slot index
   * @param {boolean} isConnected - Whether it's connected or disconnected
   * @param {object} link_info - Link information
   */
  onConnectionsChange(type, slot, isConnected, link_info) {
    if (type === LiteGraph.INPUT && slot === 0) {
      // Trigger the output when input connection changes
      this.triggerSlot(0, this.getInputData(0));
    }
  }

  /**
   * Called when an action is received on the input.
   * @param {string} action - The action name.
   * @param {any} param - The parameter passed with the action.
   */
  onAction(action, param) {
    // Forward the received action as an event to the output
    this.triggerSlot(0, param);
  }

  /**
   * Draws the node. Optionally, you can provide visual feedback
   * when the node is waiting for an input or when it's idle.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvas_width
   * @param {number} canvas_height
   */
  onDrawForeground(ctx, canvas_width, canvas_height) {
    // Optionally, indicate the node status
    if (!this.isInputConnected(0)) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, 0, canvas_width, canvas_height);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "14px Arial";
      ctx.fillText("Manual Mode", 10, 20);
    }
  }
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("trigger/TriggerNode", TriggerNode);
