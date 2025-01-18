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

  
