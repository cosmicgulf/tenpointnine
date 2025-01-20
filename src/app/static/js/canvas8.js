// Define the DelayNode class with improved handling
class DelayNode extends LGraphNode {
  constructor() {
    super();
    // Add an input port named "input" of any type
    this.addInput("input");
    // Add an output port named "output" of any type
    this.addOutput("output");
    
    // Add a property to specify the delay in milliseconds
    this.addProperty("delay", 1000); // default delay is 1000ms (1 second)
    
    // Add a number widget to allow users to set the delay
    this.addWidget("number", "Delay (ms)", this.properties.delay, (v) => {
      this.properties.delay = v;
      this.setDirtyCanvas(true);
    });
    
    // Initialize internal state
    this.size = [180, 60];
    this.title = "Delay Node";
    this.desc = "Delays the input data by a specified time.";
    
    // Queue to handle multiple inputs
    this._queue = [];
    this._isProcessing = false;
  }

  // Called when the node is executed
  onExecute() {
    const input = this.getInputData(0);
    if (input === undefined) return;

    const delay = this.properties.delay;

    // Push the input data to the queue with its timestamp
    this._queue.push({ data: input, timestamp: LiteGraph.getTime() });

    // If not already processing, start the processing loop
    if (!this._isProcessing) {
      this._isProcessing = true;
      this.processQueue();
    }
  }

  // Function to process the queue
  processQueue() {
    if (this._queue.length === 0) {
      this._isProcessing = false;
      return;
    }

    const currentTime = LiteGraph.getTime();
    const nextItem = this._queue[0];
    const elapsedTime = (currentTime - nextItem.timestamp) * 1000; // Convert to ms

    if (elapsedTime >= this.properties.delay) {
      // Time to emit the output
      this.setOutputData(0, nextItem.data);
      this._queue.shift(); // Remove the processed item
      // Continue processing the next item
      this.processQueue();
    } else {
      // Schedule the next check
      const remainingTime = this.properties.delay - elapsedTime;
      setTimeout(() => {
        this.processQueue();
      }, remainingTime);
    }
  }

  // Display the current delay on the node
  getTitle() {
    return `${this.title}\nDelay: ${this.properties.delay}ms`;
  }

  // Clean up when the node is removed
  onDestroy() {
    this._queue = [];
    this._isProcessing = false;
  }

  // Optional: Draw additional information on the node's background
  onDrawBackground(ctx) {
    ctx.font = "12px Arial";
    ctx.fillStyle = "#AAA";
    ctx.fillText(`Queued: ${this._queue.length}`, 10, this.size[1] - 10);
  }
}

// Register the node type with LiteGraph


class RandomNode extends LGraphNode {
constructor() {
  super();
  this.addInput("Min", "number");
  this.addInput("Max", "number");
  this.addOutput("Random Value", "number");
  this.properties = { type: "float" };  // Default type is float, options are "float" and "int"
  this.title = "Random Generator";
}

onExecute() {
  const min = this.getInputData(0) || 0;
  const max = this.getInputData(1) || 1;
  const type = this.properties.type;

  let result;
  if (type === "int") {
    result = Math.floor(Math.random() * (max - min + 1)) + min;  // Generate integer in range [min, max]
  } else {
    result = Math.random() * (max - min) + min;  // Generate float in range [min, max)
  }

  this.setOutputData(0, result);
}
}
LiteGraph.registerNodeType("utility/delay", DelayNode);
LiteGraph.registerNodeType("math/random_generator", RandomNode);

class DelayEventNode extends LGraphNode {
constructor() {
    super();
    this.size = [180, 80];
    this.title = "Delay Event Node";
    this.desc = "Delays an event by a specified time.";

    // Define input and output event ports
    this.addInput("Trigger", LiteGraph.EVENT);
    this.addOutput("Trigger", LiteGraph.EVENT);

    // Add a property to specify the delay in milliseconds
    this.addProperty("delay", 1000); // default delay is 1000ms (1 second)

    // Add a number widget to allow users to set the delay
    this.addWidget("number", "Delay (ms)", this.properties.delay, (v) => {
        this.properties.delay = v;
        this.setDirtyCanvas(true);
    });

    // Internal list to handle multiple pending events
    this._pendingEvents = [];
}

/**
 * Called when an event is received on the input.
 * @param {string} event - The name of the event.
 * @param {*} param - The parameter/data associated with the event.
 */
onAction(event, param) {
    // Push the event to the pending events list
    const delay = this.properties.delay;
    const eventData = { event, param, timestamp: LiteGraph.getTime() };
    this._pendingEvents.push(eventData);
    this.setDirtyCanvas(true); // Update the node's display

    // Schedule the event to be emitted after the specified delay
    setTimeout(() => {
        this.emitDelayedEvent(eventData);
    }, delay);
}

/**
 * Emits the delayed event and removes it from the pending list.
 * @param {Object} eventData - The event data containing event name and parameters.
 */
emitDelayedEvent(eventData) {
    // Emit the event via the output slot
    this.triggerSlot(0, eventData.param);

    // Remove the event from the pending list
    const index = this._pendingEvents.indexOf(eventData);
    if (index > -1) {
        this._pendingEvents.splice(index, 1);
        this.setDirtyCanvas(true); // Update the node's display
    }

    // Optional: Log the emission for debugging
    // console.log(`Emitted event: ${eventData.event} with param:`, eventData.param);
}

/**
 * Updates the node's title to display the current delay.
 * @returns {string} The updated title.
 */
getTitle() {
    return `${this.title}\nDelay: ${this.properties.delay}ms`;
}

/**
 * Cleans up the node when it's removed from the graph.
 */
onDestroy() {
    // Clear all pending events
    this._pendingEvents.forEach(eventData => {
        // No need to clear timeouts since they are already set
        // However, if you store timeout IDs, you could clear them here
    });
    this._pendingEvents = [];
}

/**
 * Optionally draws additional information on the node's background.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 */
onDrawBackground(ctx) {
    ctx.font = "12px Arial";
    ctx.fillStyle = "#AAA";
    ctx.fillText(`Queued: ${this._pendingEvents.length}`, 10, this.size[1] - 10);
}
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("events/delay_event", DelayEventNode);
class StepSequencerNode extends LGraphNode {
constructor() {
    super();

    this.title = "Step Sequencer";
    this.desc = "Triggers multiple steps in sequence, each with its own delay.";
    this.size = [300, 150]; // Increased width for better layout

    // Remove any existing input ports if any
    // (Optional: If you have an input port, remove it)
    // this.removeInput(0);

    // Add a Start button to trigger the sequence
    this.addWidget("button", "Start Sequence", null, () => {
        this.startSequence();
    });

    // Add a text widget to input delay for new step
    this.addWidget("number", "Delay for new step (ms)", 1000, (value) => {
        this._newStepDelay = parseInt(value) || 0;
    });
    this._newStepDelay = 1000; // Default delay

    // Add a button to add new steps
    this.addWidget("button", "Add Step", null, () => {
        this.addNewStep();
    });

    // Initialize properties
    this.addProperty("steps", []); // Array of { delay: number }

    // Track active timeouts for cleanup
    this._pendingTimeouts = [];

    // Rebuild outputs and step widgets if loaded from saved graph
    this.rebuildOutputsFromSteps();
}

/**
 * Adds a new step with its own delay.
 */
addNewStep() {
    const delayValue = this._newStepDelay;

    // Add the new step to properties
    this.properties.steps.push({ delay: delayValue });

    // Determine the step index (1-based)
    const stepIndex = this.properties.steps.length;

    // Add a new output port for this step
    this.addOutput(`Step ${stepIndex}`, LiteGraph.EVENT);

    // Add a number widget for this step's delay
    this.addWidget("number", `Step ${stepIndex} Delay (ms)`, delayValue, (value) => {
        const parsedValue = parseInt(value) || 0;
        this.properties.steps[stepIndex - 1].delay = parsedValue;
        this.setDirtyCanvas(true);
    });

    // Adjust the node's size to accommodate the new widget
    this.size[1] += 30; // Increase height by 30px per step
    this.setDirtyCanvas(true);
}

/**
 * Rebuilds output ports and step widgets based on existing steps.
 * This is useful when loading a saved graph.
 */
rebuildOutputsFromSteps() {
    // Remove existing output ports and step widgets
    while (this.outputs && this.outputs.length > 0) {
        this.removeOutput(0);
    }

    // Remove existing step delay widgets
    this.removeStepWidgets();

    // Re-add outputs and widgets for each step
    for (let i = 0; i < this.properties.steps.length; i++) {
        const stepIndex = i + 1;

        // Add output port
        this.addOutput(`Step ${stepIndex}`, LiteGraph.EVENT);

        // Add delay widget
        this.addWidget("number", `Step ${stepIndex} Delay (ms)`, this.properties.steps[i].delay, (value) => {
            const parsedValue = parseInt(value) || 0;
            this.properties.steps[i].delay = parsedValue;
            this.setDirtyCanvas(true);
        });

        // Adjust node size
        this.size[1] += 30;
    }

    this.setDirtyCanvas(true);
}

/**
 * Removes all step delay widgets, keeping only the initial widgets.
 */
removeStepWidgets() {
    // Initial widgets: Start button, Delay for new step, Add Step button
    const initialWidgetCount = 3;

    // Remove widgets beyond the initial ones
    while (this.widgets && this.widgets.length > initialWidgetCount) {
        this.widgets.pop();
    }

    // Reset node size based on number of steps
    this.size[1] = 150; // Reset to initial height
}

/**
 * Starts the step sequence when the Start button is clicked.
 */
startSequence() {
    if (!this.properties.steps || this.properties.steps.length === 0) {
        console.warn("No steps to execute.");
        return;
    }

    // Clear any existing timeouts to prevent overlapping sequences
    this.clearAllTimeouts();

    let currentStepIndex = 0;

    const triggerNextStep = () => {
        if (currentStepIndex >= this.properties.steps.length) {
            return; // All steps have been triggered
        }

        const stepInfo = this.properties.steps[currentStepIndex];
        const stepDelay = parseInt(stepInfo.delay) || 0;

        // Schedule the current step
        const timeoutId = setTimeout(() => {
            // Trigger the corresponding output port
            this.triggerSlot(currentStepIndex, null); // 'null' can be replaced with desired param

            // Remove the timeout from tracking
            const idx = this._pendingTimeouts.indexOf(timeoutId);
            if (idx !== -1) {
                this._pendingTimeouts.splice(idx, 1);
            }

            // Move to the next step
            currentStepIndex++;
            triggerNextStep(); // Recursively trigger the next step
        }, stepDelay);

        // Track the timeout for potential cleanup
        this._pendingTimeouts.push(timeoutId);
    };

    // Start the sequence
    triggerNextStep();
}

/**
 * Clears all active timeouts to stop any ongoing sequences.
 */
clearAllTimeouts() {
    for (let i = 0; i < this._pendingTimeouts.length; i++) {
        clearTimeout(this._pendingTimeouts[i]);
    }
    this._pendingTimeouts = [];
}

/**
 * Cleanup when the node is destroyed.
 */
onDestroy() {
    this.clearAllTimeouts();
}

/**
 * Draw additional information on the node's background.
 */
onDrawBackground(ctx) {
    ctx.fillStyle = "#AAA";
    ctx.font = "12px Arial";

    // Show total steps
    ctx.fillText(`Total Steps: ${this.properties.steps.length}`, 10, this.size[1] - 40);

    // Show how many timeouts are pending
    ctx.fillText(`Pending Timeouts: ${this._pendingTimeouts.length}`, 10, this.size[1] - 20);
}
}

// Register the node so it appears in the LiteGraph editor under "events/step_sequencer"
LiteGraph.registerNodeType("events/step_sequencer", StepSequencerNode);


