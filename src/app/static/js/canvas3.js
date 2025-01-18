
class ForLoopNode extends LGraphNode {
  constructor() {
    super();
    this.addInput("Start", "number");
    this.addInput("Stop", "number");
    this.addInput("Increment", "number");
    this.addInput("Break Condition", "boolean");  // Input for the break condition

    this.addOutput("i", "number"); // Output the current loop variable (i)

    this.properties = {
      start: 0,
      stop: 10,
      increment: 1,
    };

    this.title = "For Loop";
    this.margin = 5;
    this.size = [180, 140];
    this.currentValue = this.properties.start;
    this.loopRunning = false;
    this.clicked = false;

    // Button to trigger loop start
    this.button = {
      width: 100,
      height: 40,
      x: 40,
      y: this.size[1] - 50,
      color: "#4CAF50",
      hoverColor: "#66BB6A",
      clickColor: "white",
    };
    this.mouseOverButton = false;

    // Internal variables for loop control
    this.currentIndex = this.properties.start;
  }

  onExecute() {
    if (!this.loopRunning) {
      return;  // Do nothing if loop is not running
    }

    let start = this.getInputData(0) || this.properties.start;
    let stop = this.getInputData(1) || this.properties.stop;
    let increment = this.getInputData(2) || this.properties.increment;
    let breakCondition = this.getInputData(3);  // Get the break condition

    // Ensure increment is positive for valid iteration
    increment = increment > 0 ? increment : this.properties.increment;

    // Break the loop if break condition is met
    if (breakCondition) {
      this.loopRunning = false;
      return;  // Exit the loop immediately if the break condition is true
    }

    // Check if the loop has reached its end
    if (this.currentIndex <= stop) {
      // Output the current index (i) and update it for the next iteration
      this.setOutputData(0, this.currentIndex);

      // Update current index by increment
      this.currentIndex += increment;
    } else {
      // Stop loop when the stop condition is met
      this.loopRunning = false;
    }
  }

  onDrawBackground(ctx) {
    if (this.flags.collapsed) {
      return;
    }

    const adjustedMargin = this.margin;
    const shift = this.marginShift;

    // Draw background
    ctx.fillStyle = "black";
    ctx.fillRect(
      adjustedMargin + 1,
      adjustedMargin + 1 + shift,
      this.size[0] - adjustedMargin * 2,
      this.size[1] - adjustedMargin * 2
    );
    ctx.fillStyle = "#AAF";
    ctx.fillRect(
      adjustedMargin - 1,
      adjustedMargin - 1 + shift,
      this.size[0] - adjustedMargin * 2,
      this.size[1] - adjustedMargin * 2
    );

    // Update button position based on node size
    this.updateButtonPosition();

    // Draw button
    this.drawButton(ctx, this.button, this.mouseOverButton, this.clicked);
  }

  updateButtonPosition() {
    // Update the button to be 50px from the bottom
    this.button.y = this.size[1] - 50;
  }

  drawButton(ctx, button, isMouseOver, isClicked) {
    const buttonColor = isClicked
      ? button.clickColor
      : isMouseOver
      ? button.hoverColor
      : button.color;

    ctx.fillStyle = buttonColor;
    ctx.fillRect(button.x, button.y, button.width, button.height);
  }

  onMouseMove(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    // Check if mouse is over button
    this.mouseOverButton = this.isPointInButton(canvasX, canvasY, this.button);
    this.clicked = false;
  }

  onMouseDown(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    if (this.isPointInButton(canvasX, canvasY, this.button)) {
      this.clicked = true;
      this.startLoop();  // Start loop when button is clicked
    } else {
      this.clicked = false;
    }
  }

  startLoop() {
    // Initialize loop parameters
    this.currentIndex = this.getInputData(0) || this.properties.start;
    this.loopRunning = true;
  }

  isPointInButton(x, y, button) {
    const nodeX = this.pos[0] || 0;  // Node's X position on canvas
    const nodeY = this.pos[1] || 0;  // Node's Y position on canvas

    return (
      x >= nodeX + button.x &&
      x <= nodeX + button.x + button.width &&
      y >= nodeY + button.y &&
      y <= nodeY + button.y + button.height
    );
  }

  // Serialize and deserialize loop state
  onSerialize(obj) {
    obj.properties = this.properties;
    obj.currentIndex = this.currentIndex;
  }

  onDeserialize(obj) {
    this.properties = obj.properties || this.properties;
    this.currentIndex = obj.currentIndex || this.properties.start;
  }
}



class WhileLoopNode extends LGraphNode {
  constructor() {
    super();
    this.addInput("Condition", "boolean");        // Input to control the loop continuation
    this.addInput("Start", "number");            // Starting value of the iterator
    this.addInput("Increment", "number");        // Value to increment the iterator by
    this.addInput("Break Condition", "boolean"); // Input to manually break the loop

    this.addOutput("Iterator", "number");        // Output the current iterator value

    this.properties = {
      start: 0,
      increment: 1,
    };

    this.title = "While Loop";
    this.size = [180, 140];
    this.margin = 5;

    // Internal state variables
    this.loopRunning = false;
    this.currentValue = this.properties.start;
    this.isPaused = false;

    // Start button configuration
    this.startButton = {
      width: 60,
      height: 30,
      x: 20,
      y: this.size[1] - 40,
      color: "#2196F3",
      hoverColor: "#42A5F5",
      clickColor: "#1E88E5",
      text: "Start",
    };

    // Pause button configuration
    this.pauseButton = {
      width: 60,
      height: 30,
      x: 100,
      y: this.size[1] - 40,
      color: "#F44336",
      hoverColor: "#EF5350",
      clickColor: "#E53935",
      text: "Pause",
    };

    // For visual feedback
    this.mouseOverStartBtn = false;
    this.mouseOverPauseBtn = false;
    this.startBtnClicked = false;
    this.pauseBtnClicked = false;
  }

  onExecute() {
    // Force canvas update so that the graph runs continuously
    // (especially important if using the built-in editor).
    // Also ensure your graph is in continuous mode or you call graph.runStep() in your own loop.
    if (this.graph) {
      this.graph.setDirtyCanvas(true, true);
    }

    // If not running or if paused, do nothing
    if (!this.loopRunning || this.isPaused) {
      return;
    }

    // Retrieve input data
    let condition = this.getInputData(0);    // Condition to continue the loop
    let startTrigger = this.getInputData(1); // Start value (only used once, if at all)
    let increment = this.getInputData(2);    // Increment
    let breakCondition = this.getInputData(3); // Manual break condition

    // Fallback to property values if not provided
    increment = increment !== undefined ? increment : this.properties.increment;

    // Check for break condition
    if (breakCondition) {
      this.loopRunning = false;
      return; // Exit the loop immediately
    }

    // Determine whether to continue looping based on the condition
    if (condition) {
      // Output the current iterator value
      this.setOutputData(0, this.currentValue);

      // Update the iterator
      this.currentValue += increment;
    } else {
      // Stop the loop if the condition is false
      this.loopRunning = false;
    }
  }

  onDrawBackground(ctx) {
    if (this.flags.collapsed) {
      return;
    }

    const adjustedMargin = this.margin;

    // Draw node background
    ctx.fillStyle = "#333";
    ctx.fillRect(
      adjustedMargin,
      adjustedMargin,
      this.size[0] - 2 * adjustedMargin,
      this.size[1] - 2 * adjustedMargin
    );

    // Draw the start and pause buttons
    this.drawButton(ctx, this.startButton, this.mouseOverStartBtn, this.startBtnClicked);
    this.drawButton(ctx, this.pauseButton, this.mouseOverPauseBtn, this.pauseBtnClicked);
  }

  drawButton(ctx, button, isMouseOver, isClicked) {
    const buttonColor = isClicked
      ? button.clickColor
      : isMouseOver
      ? button.hoverColor
      : button.color;

    ctx.fillStyle = buttonColor;
    ctx.fillRect(button.x, button.y, button.width, button.height);

    // Draw button text
    ctx.fillStyle = "#FFF";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
  }

  onMouseMove(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    // Check if the mouse is over the start button
    this.mouseOverStartBtn = this.isPointInButton(canvasX, canvasY, this.startButton);
    this.mouseOverPauseBtn = this.isPointInButton(canvasX, canvasY, this.pauseButton);

    // Reset clicked state for hover changes
    if (!this.mouseOverStartBtn) {
      this.startBtnClicked = false;
    }
    if (!this.mouseOverPauseBtn) {
      this.pauseBtnClicked = false;
    }
  }

  onMouseDown(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    // Check if the start button is clicked
    if (this.isPointInButton(canvasX, canvasY, this.startButton)) {
      this.startBtnClicked = true;
      const startValue = this.getInputData(1) || this.properties.start;
      this.startLoop(startValue);
      return;
    }

    // Check if the pause button is clicked
    if (this.isPointInButton(canvasX, canvasY, this.pauseButton)) {
      this.pauseBtnClicked = true;
      this.isPaused = !this.isPaused; // Toggle pause state
      return;
    }
  }

  startLoop(startValue) {
    // Initialize loop parameters
    this.currentValue = startValue;
    this.loopRunning = true;
    this.isPaused = false; // ensure it is not paused when we start
  }

  isPointInButton(x, y, button) {
    const nodeX = this.pos[0] || 0; // Node's X position on the canvas
    const nodeY = this.pos[1] || 0; // Node's Y position on the canvas

    return (
      x >= nodeX + button.x &&
      x <= nodeX + button.x + button.width &&
      y >= nodeY + button.y &&
      y <= nodeY + button.y + button.height
    );
  }

  // Serialize the node's state
  onSerialize(obj) {
    obj.properties = this.properties;
    obj.currentValue = this.currentValue;
    obj.loopRunning = this.loopRunning;
    obj.isPaused = this.isPaused;
  }

  // Deserialize the node's state
  onDeserialize(obj) {
    this.properties = obj.properties || this.properties;
    this.currentValue =
      obj.currentValue !== undefined ? obj.currentValue : this.properties.start;
    this.loopRunning = obj.loopRunning || false;
    this.isPaused = obj.isPaused || false;
  }
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("repeater/while_loop", WhileLoopNode);


  class ClockNode extends LGraphNode {
    constructor() {
        super();
        this.addOutput("Time", "time");
        this.addProperty("hours", 12);
        this.addProperty("minutes", 0);
        //this.widget_hours = this.addWidget("number", "Hours", this.properties["hours"], "hours");
        this.widget_hours = this.addWidget("number", "Hours", this.properties["hours"], "hours", {
          step: 10,  // Ensure integer step
          min: 0,  
          precision : 0, // Optional: set minimum value to 0
          max: 23 // Optional: set maximum value
        });
        this.widget_minutes = this.addWidget("number", "Minutes", this.properties["minutes"], "minutes", {
          step: 10,  // Ensure integer step
          min: 0,  
          precision : 0, // Optional: set minimum value to 0
          max: 59.9 // Optional: set maximum value
        });
        //this.widget_minutes = this.addWidget("number", "Minutes", this.properties["minutes"], "minutes");
        this.widgets_up = true;
        this.size = [280, 180];
        this.title = "Clock Node";
        this.lastTime = Date.now();
    }

    onExecute() {
        const hours = this.properties["hours"];
        const minutes = this.properties["minutes"];
        this.setOutputData(0, { hours, minutes });
    }

    // Ensure that hour and minute values wrap around using modulo
    setValue(hours, minutes) {
        // Ensure hours are between 0 and 23
        hours = hours % 24;
        if (hours < 0) hours += 24;

        // Ensure minutes are between 0 and 59
        minutes = minutes % 60;
        if (minutes < 0) minutes += 60;

        // Update the property values and the widget display values
        this.properties["hours"] = hours;
        this.properties["minutes"] = minutes;
        this.widget_hours.value = hours;
        this.widget_minutes.value = minutes;

        // Trigger a redraw to update the analog and digital clock
        this.trigger("changed");
    }

    // Listen for arrow key presses and update the time values
    onKeyDown(e) {
        if (e.key === "ArrowUp") {
            if (document.activeElement === this.widget_hours.input) {
                this.setValue(this.properties["hours"] + 1, this.properties["minutes"]);
            } else if (document.activeElement === this.widget_minutes.input) {
                this.setValue(this.properties["hours"], this.properties["minutes"] + 1);
            }
        } else if (e.key === "ArrowDown") {
            if (document.activeElement === this.widget_hours.input) {
                this.setValue(this.properties["hours"] - 1, this.properties["minutes"]);
            } else if (document.activeElement === this.widget_minutes.input) {
                this.setValue(this.properties["hours"], this.properties["minutes"] - 1);
            }
        }
    }

    // Redraw the analog clock
    drawAnalogClock(ctx, cx, cy, radius) {
        ctx.clearRect(cx - radius - 5, cy - radius - 5, 2 * radius + 10, 2 * radius + 10);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "#000";
        ctx.stroke();

        const hours = this.properties["hours"];
        const minutes = this.properties["minutes"];
        const hourAngle = ((hours % 12) + minutes / 60) * (Math.PI / 6);
        const minuteAngle = minutes * (Math.PI / 30);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(hourAngle - Math.PI / 2) * radius * 0.5, cy + Math.sin(hourAngle - Math.PI / 2) * radius * 0.5);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(minuteAngle - Math.PI / 2) * radius * 0.8, cy + Math.sin(minuteAngle - Math.PI / 2) * radius * 0.8);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#000";
        ctx.fill();
    }

    onDrawForeground(ctx) {
        const cx = this.size[0] / 2;
        const cy = this.size[1] - 60;
        const radius = 50;
        this.drawAnalogClock(ctx, cx, cy, radius);
    }

    onDrawBackground(ctx) {
        const hours = this.properties["hours"];
        const minutes = this.properties["minutes"];
        const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

        // ctx.font = "16px Arial";
        // ctx.fillStyle = "#000";
        // ctx.fillText("Digital Time: " + timeString, 10, 30);

        this.onDrawForeground(ctx);
    }
}

  LiteGraph.registerNodeType("repeater/clocknode", ClockNode);
  LiteGraph.registerNodeType("repeater/forloop",ForLoopNode );
  LiteGraph.registerNodeType("repeater/whileloop",WhileLoopNode );