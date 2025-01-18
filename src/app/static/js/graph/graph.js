class DynamicGraphNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Dynamic Graph";
        this.size = [400, 300]; // Increased node size
        this.time = 0;
        this.values = new Array(100).fill(0);
    
        // Add an input for external data (optional)
        this.addInput("Value", "number");
    
        // Create a canvas widget for drawing the graph
        this.addCustomWidget();
    }
    
    // Add a custom widget for the canvas
    addCustomWidget() {
        this.widgets = this.widgets || [];
        const canvasWidget = {
            name: "Graph",
            type: "canvas",
            draw: (ctx, node, width, height) => {
                this.drawGraph(ctx, width, height);
            },
            // Adjusted widget height for larger canvas
            height: 250
        };
        this.widgets.push(canvasWidget);
    }
    
    // Draw the graph on the canvas
    drawGraph(ctx, width, height) {
        // Clear the canvas
        ctx.clearRect(0, 0, width, height);
    
        // Draw background
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, width, height);
    
        // Draw grid lines (optional)
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += width / 10) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i < height; i += height / 5) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
    
        // Draw the graph line
        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const len = this.values.length;
        for (let i = 0; i < len; i++) {
            const x = (i / (len - 1)) * width;
            const y = ((1 - this.values[i]) / 2) * height;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Process the node (called every frame)
    onExecute() {
        // Update time
        this.time += this.graph.elapsed_time * 0.1;
    
        // Get input value or generate random fluctuations
        let value = this.getInputData(0);
        if (value === undefined) {
            // Generate a sine wave with added random noise
            const sineValue = Math.sin(this.time);
            const noise = (Math.random() - 0.5) * 0.5; // Random value between -0.25 and 0.25
            value = sineValue + noise;
        }
    
        // Keep value within -1 to 1
        value = Math.max(-1, Math.min(1, value));
    
        // Add value to the array
        this.values.push(value);
        if (this.values.length > 100) {
            this.values.shift();
        }
    
        // Mark the canvas widget as dirty to redraw
        this.setDirtyCanvas(true, false);
    }
}
    
// Register the node type with LiteGraph
LiteGraph.registerNodeType("Display/DynamicGraph", DynamicGraphNode);

class SineWaveNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Sine Wave";
        this.size = [200, 50];
        this.time = 0;
        this.addOutput("Value", "number");
    }

    onExecute() {
        this.time += this.graph.elapsed_time;
        const sineValue = Math.sin(this.time);
        this.setOutputData(0, sineValue);
    }
}

LiteGraph.registerNodeType("Display/SineWave", SineWaveNode);

class DynamicGraphNodes extends LGraphNode {
    constructor() {
        super();
        this.title = "Dynamic Graph";
        
        // Initial configuration
        this.numInputs = 3; 
        this.historyLength = 900; 
        // Increased default size: width is now 1200, height is 1200
        this.size = [1200, 1200]; 
        this.time = 0;

        // Initialize values arrays
        this.values = Array.from(
            { length: this.numInputs }, 
            () => new Array(this.historyLength).fill(0)
        );

        // Create the inputs
        this.createInputs();

        // Add widget to adjust number of inputs dynamically
        this.addWidget("number", "Number of Inputs", this.numInputs, (v) => {
            const newNumInputs = Math.max(1, Math.floor(v));
            if (newNumInputs !== this.numInputs) {
                this.numInputs = newNumInputs;
                this.resetInputsAndValues();
            }
        });

        // Add the custom canvas widget for the graph
        this.addCustomWidget();
    }

    /**
     * Create inputs based on numInputs
     */
    createInputs() {
        // Remove existing inputs
        this.inputs = [];
        for (let i = 0; i < this.numInputs; i++) {
            this.addInput(`Value ${i + 1}`);
        }
    }

    /**
     * Reset inputs and values when numInputs changes
     */
    resetInputsAndValues() {
        this.createInputs();
        this.values = Array.from(
            { length: this.numInputs }, 
            () => new Array(this.historyLength).fill(0)
        );

        // Adjust the node size if needed when inputs change
        this.size = [1200, this.computeNodeHeight()];

        // Rebuild the canvas widget so its height matches new number of inputs
        this.addCustomWidget();
        this.setDirtyCanvas(true, true);
    }

    /**
     * Compute the node height based on the number of inputs
     */
    computeNodeHeight() {
        // Base height for one input
        const baseHeight = 150;
        // Extra space for the top bars, widgets, and padding
        const padding = 250; 
        return baseHeight * this.numInputs + padding;
    }

    /**
     * Add a custom canvas widget for the graph
     */
    addCustomWidget() {
        this.widgets = this.widgets || [];
        // Remove existing canvas widgets if any
        this.widgets = this.widgets.filter(w => w.type !== "canvas");

        const canvasWidget = {
            name: "Graph",
            type: "canvas",
            draw: (ctx, node, width, height) => {
                this.drawGraph(ctx, width, height);
            },
            height: this.computeCanvasHeight()
        };
        this.widgets.push(canvasWidget);
    }

    /**
     * Compute canvas height based on number of inputs
     */
    computeCanvasHeight() {
        // Give each input line ~100 px
        const perInputHeight = 100;
        return perInputHeight * this.numInputs;
    }

    /**
     * Draw the graph on the canvas
     */
    drawGraph(ctx, width, height) {
        // Clear the canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += width / 10) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i < height; i += height / 5) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }

        // Determine the global min and max across all inputs
        // Flatten the 2D array to 1D and apply Math.min/Math.max
        const allValues = this.values.flat();
        let minVal = Math.min(...allValues);
        let maxVal = Math.max(...allValues);
        // Avoid division by zero if all values are the same
        let range = maxVal - minVal;
        if (range === 0) {
            range = 1;
        }

        // Colors for graph lines (cycled if more inputs than colors)
        const colors = [
            "#4caf50", "#2196f3", "#ff5722", "#ffeb3b",
            "#9c27b0", "#00e5ff", "#e91e63", "#cddc39",
            "#00bcd4", "#8bc34a"
        ];

        // Draw the graph lines for each input
        this.values.forEach((valueArray, index) => {
            ctx.strokeStyle = colors[index % colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();

            const len = valueArray.length;
            for (let i = 0; i < len; i++) {
                const value = valueArray[i];
                // Map the current value between minVal (bottom) and maxVal (top)
                // because Canvas (0,0) is top-left:
                //   - we want minVal -> y = height
                //   - and maxVal -> y = 0
                // So: y = height - [ (value - minVal) / range ] * height
                const ratio = (value - minVal) / range; 
                const y = height - ratio * height;
                const x = (i / (len - 1)) * width;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });
    }

    /**
     * Process the node (called every frame)
     */
    onExecute() {
        // Update time (not strictly necessary if only reading inputs)
        this.time += this.graph.elapsed_time * 0.1;

        // Update values for each input
        for (let i = 0; i < this.numInputs; i++) {
            let value = this.getInputData(i);

            // If the input is undefined, use the last known value; default 0 if none
            if (value === undefined) {
                value = this.values[i][this.values[i].length - 1] || 0;
            } 
            // If it's a string, parse it to float; default to -1 if invalid
            else if (typeof value === "string") {
                const parsedValue = parseFloat(value);
                value = isNaN(parsedValue) ? -1 : parsedValue;
            }
            // If it's neither a number nor a string, treat as -1
            else if (typeof value !== "number") {
                value = -1;
            }

            // (Optional) clamp to [-1, 1] if you still want a guard
            // -- if you want the dynamic range to show the actual data extremes,
            //    you might remove this clamp. Otherwise, uncomment below:
            // value = Math.max(-1, Math.min(1, value));

            // Add the value to the array and remove the oldest to maintain size
            this.values[i].push(value);
            if (this.values[i].length > this.historyLength) {
                this.values[i].shift();
            }
        }

        // Mark the canvas widget as dirty to trigger a redraw
        this.setDirtyCanvas(true, false);
    }
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("Display/DynamicGraphs", DynamicGraphNodes);





// Example Input Node: Provides Test Data
class SliderInputNodes extends LGraphNode {
    constructor() {
        super();
        this.title = "Slider Input";
        this.size = [200, 50];
        this.value = 0.5; // Default slider value
        this.addOutput("Value", "number");

        // Add a slider widget
        this.addWidget("slider", "Value", this.value, (v) => {
            this.value = v;
        }, { min: -1, max: 1 });
    }

    onExecute() {
        this.setOutputData(0, this.value);
    }
}

// Register the input node
LiteGraph.registerNodeType("Display/Slider", SliderInputNodes);
