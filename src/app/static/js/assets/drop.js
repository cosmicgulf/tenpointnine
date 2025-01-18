class ListNode extends LGraphNode {
    constructor() {
      super();
      this.size = [240, 80];
      this.addInput("Index", "number"); // Optional input for index
      this.addInput("Element", 0); // Optional input for element
      this.addOutput("List", 0); // Outputs the whole list
      this.addOutput("Element", 0); // Outputs the selected element
      this.addOutput("Index", "number"); // Outputs the index of the selected element
      this.list = [];
      this.selectedIndex = 0;
      this.selectedElement = null;
      this.title = "List Node";
  
      // Widgets
      this.indexWidget = this.addWidget(
        "number",
        "Index",
        this.selectedIndex,
        (v) => {
          this.selectedIndex = parseInt(v);
          this.updateSelectedElement();
          this.setDirtyCanvas(true);
        }
      );
  
      this.elementWidget = this.addWidget(
        "text",
        "Element",
        "",
        (v) => {
          this.selectedElement = this.parseValue(v);
          this.updateSelectedIndex();
          this.setDirtyCanvas(true);
        }
      );
  
      // Fetch the list data on initialization
      fetchListData(this);
    }
  
    setListData(data) {
      this.list = data;
      this.updateSelectedElement(); // Update selection after setting data
      this.setDirtyCanvas(true);
    }
  
    updateSelectedElement() {
      if (this.list.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < this.list.length) {
        this.selectedElement = this.list[this.selectedIndex];
        if (this.elementWidget) {
          this.elementWidget.value = this.toString(this.selectedElement);
        }
      } else {
        this.selectedElement = null;
        if (this.elementWidget) {
          this.elementWidget.value = "";
        }
      }
    }
  
    updateSelectedIndex() {
      const index = this.list.indexOf(this.selectedElement);
      if (index !== -1) {
        this.selectedIndex = index;
        if (this.indexWidget) {
          this.indexWidget.value = this.selectedIndex;
        }
      } else {
        this.selectedIndex = 0;
        if (this.indexWidget) {
          this.indexWidget.value = this.selectedIndex;
        }
      }
    }
    
      
  
    onExecute() {
      // Update index and element based on inputs
      let indexUpdated = false;
      let elementUpdated = false;
  
      if (this.inputs[0]) {
        const indexInput = this.getInputData(0);
        if (typeof indexInput === "number") {
          this.selectedIndex = indexInput;
          indexUpdated = true;
        }
      }
  
      if (this.inputs[1]) {
        const elementInput = this.getInputData(1);
        if (elementInput !== undefined) {
          this.selectedElement = elementInput;
          elementUpdated = true;
        }
      }
  
      if (elementUpdated) {
        this.updateSelectedIndex();
      } else if (indexUpdated) {
        this.updateSelectedElement();
      } else {
        this.updateSelectedElement();
      }
  
      if (this.selectedIndex < 0) {
        this.selectedIndex = 0;
      } else if (this.selectedIndex >= this.list.length) {
        this.selectedIndex = this.list.length - 1;
      }
  
      this.setOutputData(0, this.list);
      this.setOutputData(1, this.selectedElement);
      this.setOutputData(2, this.selectedIndex);
    }
  
    onDrawForeground(ctx) {
      if (this.flags.collapsed) return;
  
      ctx.fillStyle = "#AAA";
      ctx.font = "12px Arial";
      const elementText = this.selectedElement !== null ? this.toString(this.selectedElement) : "null";
      ctx.fillText(`Element [${this.selectedIndex}]: ${elementText}`, 10, this.size[1] - 10);
    }
  
    toString(o) {
      if (o == null) {
        return "null";
      } else if (typeof o === "number") {
        return o.toString();
      } else if (Array.isArray(o)) {
        return "[" + o.map(this.toString).join(", ") + "]";
      } else {
        return String(o);
      }
    }
  
    parseValue(value) {
      if (!isNaN(value)) {
        return Number(value);
      }
      return value;
    }
  }
  async function fetchListData(node) {
    try {
      const response = await fetch('/tango');
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json(); // Assuming the endpoint returns JSON
      node.setListData(data); // Update the node's data
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  
  class DeviceListNode extends LGraphNode {
    constructor() {
        super();
        this.size = [240, 80];
        this.addInput("Refresh", "action"); // Input to trigger refresh
        this.addOutput("Devices", "list"); // Outputs the whole device list

        // Internal properties
        this.deviceList = [];
        this.title = "Device List Node";

        // Fetch the initial list of devices
        fetchDeviceList(this);
    }

    /**
     * Sets the device list and updates output ports accordingly.
     * @param {Array} devices - Array of device objects or identifiers.
     */
    setDeviceList(devices) {
        console.log("Setting device list:", devices);
        if (!Array.isArray(devices)) {
            console.error("Fetched data is not an array:", devices);
            return;
        }
        this.deviceList = devices;
        this.updateOutputPorts();
        this.setDirtyCanvas(true);
    }

    /**
     * Updates the output ports to match the current device list.
     * Removes old device ports and adds new ones based on the device list.
     */
    updateOutputPorts() {
        console.log("Updating output ports for devices:", this.deviceList);

        // First, remove all existing device output ports except the "Devices" list port
        // Identify device ports by their naming convention (e.g., "Device 1", "Device 2", etc.)
        const devicePortNames = this.outputs
            .filter(output => output.name.startsWith("Device "))
            .map(output => output.name);

        devicePortNames.forEach(portName => {
            const slot = this.findOutputSlot(portName);
            if (slot !== -1) {
                console.log(`Removing output port: ${portName}`);
                this.removeOutput(slot);
            }
        });

        // Add a new output port for each device
        this.deviceList.forEach((device, index) => {
            const portName = `Device ${index + 1}`;
            console.log(`Adding output port: ${portName}`);
            this.addOutput(portName, "device");
        });

        // Adjust the node size based on the number of device ports
        const additionalHeight = this.deviceList.length * 20;
        this.size = [240, 80 + additionalHeight];
    }

    /**
     * Finds the slot index of the output port by its name.
     * @param {string} portName - The name of the output port.
     * @returns {number} - The slot index or -1 if not found.
     */
    findOutputSlot(portName) {
        for (let i = 0; i < this.outputs.length; i++) {
            if (this.outputs[i].name === portName) return i;
        }
        return -1;
    }

    /**
     * Executes the node logic.
     * If the "Refresh" input is triggered, it fetches the device list again.
     */
    onExecute() {
        if (this.inputs[0] && this.getInputData(0)) { // If "Refresh" is triggered
            console.log("Refresh input received. Fetching device list...");
            fetchDeviceList(this);
        }

        // Output the entire device list
        this.setOutputData(0, this.deviceList);

        // Output individual devices
        this.deviceList.forEach((device, index) => {
            const portName = `Device ${index + 1}`;
            const outputSlot = this.findOutputSlot(portName);
            if (outputSlot !== -1) {
                console.log(`Setting output for ${portName}:`, device);
                this.setOutputData(outputSlot, device);
            }
        });
    }

    /**
     * Draws the node's foreground, including device names.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     */
    onDrawForeground(ctx) {
        if (this.flags.collapsed) return;

        ctx.fillStyle = "#AAA";
        ctx.font = "12px Arial";

        // Display each device name next to its output port
        this.deviceList.forEach((device, index) => {
            const portName = `Device ${index + 1}`;
            // Use device.name if available, else fallback to the port name
            const text = device.name ? device.name : portName;
            ctx.fillText(text, 10, 60 + index * 20);
        });
    }
}

/**
 * Fetches the device list from the server and updates the node.
 * @param {DeviceListNode} node - The instance of the DeviceListNode.
 */
async function fetchDeviceList(node) {
    console.log("Fetching device list from '/tango'...");
    try {
        const response = await fetch('/tango');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        const data = await response.json(); // Assuming the endpoint returns JSON array
        console.log("Fetched data:", data);
        node.setDeviceList(data);
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// Register the new node type with LiteGraph
LiteGraph.registerNodeType("tango/DeviceListNode", DeviceListNode);


// Register the new node type with LiteGraph

LiteGraph.registerNodeType("tango/TangoDeviceNode", ListNode);



class WidgetKnob extends LGraphNode {
    constructor() {
      super();
      
            this.addOutput("", "number");
            this.size = [120, 160]; // Increased size
            this.properties = {
                min: 0,
                max: 1,
                value: 0.5,
                color: "#4CAF50", // Updated color
                precision: 2,
                title: "Knob Control" // Added title
            };
            this.value = -1;
        }
    
        static get title() {
            return "Knob";
        }
    
        static get desc() {
            return "Circular controller";
        }
    
        onDrawForeground(ctx) {
            if (this.flags.collapsed) {
                return;
            }
    
            if (this.value == -1) {
                this.value =
                    (this.properties.value - this.properties.min) /
                    (this.properties.max - this.properties.min);
            }
    
            const center_x = this.size[0] * 0.5;
            const center_y = this.size[1] * 0.6; // Adjusted center position
            const radius = Math.min(this.size[0], this.size[1]) * 0.4;
    
            // Draw Title
            ctx.fillStyle = "#333";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.properties.title, center_x, 20);
    
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(center_x, center_y);
            ctx.rotate(Math.PI * 0.75);
    
            // Draw Background Arc
            ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 1.5, false);
            ctx.fill();
    
            // Draw Value Arc
            ctx.strokeStyle = this.properties.color;
            ctx.lineWidth = 6; // Increased width for a bolder look
            ctx.beginPath();
            ctx.arc(
                0,
                0,
                radius - 6,
                0,
                Math.PI * 1.5 * Math.max(0.01, this.value),
                false
            );
            ctx.stroke();
    
            ctx.restore();
    
            // Draw Inner Circle with Threads
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(center_x, center_y, radius * 0.75, 0, Math.PI * 2, true);
            ctx.fill();
    
            // Add threads inside the white area
            ctx.strokeStyle = "#DDD"; // Light gray threads
            ctx.lineWidth = 1;
            const numThreads = 12; // Number of threads
            const innerRadius = radius * 0.75;
            for (let i = 0; i < numThreads; i++) {
                const angle = (Math.PI * 2 * i) / numThreads;
                const x1 = center_x + Math.cos(angle) * (innerRadius * 0.5);
                const y1 = center_y + Math.sin(angle) * (innerRadius * 0.5);
                const x2 = center_x + Math.cos(angle) * innerRadius;
                const y2 = center_y + Math.sin(angle) * innerRadius;
    
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
    
            // Draw Mini Ball
            ctx.fillStyle = this.mouseOver ? "#FF5722" : this.properties.color;
            ctx.beginPath();
            const angle = this.value * Math.PI * 1.5 + Math.PI * 0.75;
            ctx.arc(
                center_x + Math.cos(angle) * radius * 0.65,
                center_y + Math.sin(angle) * radius * 0.65,
                radius * 0.06,
                0,
                Math.PI * 2,
                true
            );
            ctx.fill();
    
            // Draw Value Text
            ctx.fillStyle = this.mouseOver ? "black" : "#666";
            ctx.font = "20px Arial"; // Larger font for better readability
            ctx.textAlign = "center";
            ctx.fillText(
                this.properties.value.toFixed(this.properties.precision),
                center_x,
                center_y + radius * 0.15
            );
        }
    
        onExecute() {
            this.setOutputData(0, this.properties.value);
            this.boxcolor = LiteGraph.colorToString([
                this.value,
                this.value,
                this.value
            ]);
        }
    
        onMouseDown(e) {
            this.center = [this.size[0] * 0.5, this.size[1] * 0.6];
            this.radius = this.size[0] * 0.4;
            if (
                e.canvasY - this.pos[1] < 20 ||
                LiteGraph.distance(
                    [e.canvasX, e.canvasY],
                    [this.pos[0] + this.center[0], this.pos[1] + this.center[1]]
                ) > this.radius
            ) {
                return false;
            }
            this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
            this.captureInput(true);
            return true;
        }
    
        onMouseMove(e) {
            if (!this.oldmouse) {
                return;
            }
    
            const m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
    
            let v = this.value;
            v -= (m[1] - this.oldmouse[1]) * 0.01;
            if (v > 1.0) {
                v = 1.0;
            } else if (v < 0.0) {
                v = 0.0;
            }
            this.value = v;
            this.properties.value =
                this.properties.min +
                (this.properties.max - this.properties.min) * this.value;
            this.oldmouse = m;
            this.setDirtyCanvas(true);
        }
    
        onMouseUp() {
            if (this.oldmouse) {
                this.oldmouse = null;
                this.captureInput(false);
            }
        }
    
        onPropertyChanged(name, value) {
            if (name === "min" || name === "max" || name === "value") {
                this.properties[name] = parseFloat(value);
                return true;
            }
        }
    }
    
    LiteGraph.registerNodeType("widget/knob", WidgetKnob);
    

class WidgetHSlider extends LGraphNode {
  constructor() {
          super();
          this.size = [200, 40]; // Increased size for better visuals
          this.addOutput("", "number");
          this.addInput("Set Value", "number"); // Added input
          this.properties = { color: "#4CAF50", min: 0, max: 1, value: 0.5 };
          this.value = -1;
      }
  
      static get title() {
          return "H.Slider";
      }
  
      static get desc() {
          return "Linear slider controller with input";
      }
  
      onDrawForeground(ctx) {
          if (this.value === -1) {
              this.value =
                  (this.properties.value - this.properties.min) /
                  (this.properties.max - this.properties.min);
          }
  
          const padding = 5;
          const sliderWidth = this.size[0] - padding * 2;
          const sliderHeight = this.size[1] - 20;
  
          // Draw Title
          ctx.fillStyle = "#333";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("H.Slider", this.size[0] * 0.5, 12);
  
          // Draw Background
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#EEE"; // Light gray background
          ctx.fillRect(padding, 20, sliderWidth, sliderHeight);
  
          // Add Threads (lines) inside the slider background
          const numThreads = 10;
          ctx.strokeStyle = "#DDD"; // Light gray threads
          ctx.lineWidth = 1;
          for (let i = 0; i <= numThreads; i++) {
              const x = padding + (sliderWidth * i) / numThreads;
              ctx.beginPath();
              ctx.moveTo(x, 20);
              ctx.lineTo(x, 20 + sliderHeight);
              ctx.stroke();
          }
  
          // Draw Filled Area (Value)
          ctx.fillStyle = this.properties.color; // Slider color
          ctx.fillRect(
              padding,
              20,
              sliderWidth * this.value,
              sliderHeight
          );
  
          // Draw Border
          ctx.strokeStyle = "#AAA";
          ctx.lineWidth = 1;
          ctx.strokeRect(padding, 20, sliderWidth, sliderHeight);
  
          // Display Current Value
          ctx.fillStyle = "#333";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          const currentValueText = `${this.properties.value.toFixed(2)}`;
          ctx.fillText(
              `Value: ${currentValueText}`,
              this.size[0] * 0.5,
              40 + sliderHeight
          );
      }
  
      onExecute() {
          // Set value from input, if connected
          if (this.isInputConnected(0)) {
              const inputValue = this.getInputData(0);
              if (typeof inputValue === "number") {
                  this.properties.value = Math.min(
                      Math.max(inputValue, this.properties.min),
                      this.properties.max
                  );
                  this.value =
                      (this.properties.value - this.properties.min) /
                      (this.properties.max - this.properties.min);
              }
          }
  
          this.properties.value =
              this.properties.min +
              (this.properties.max - this.properties.min) * this.value;
          this.setOutputData(0, this.properties.value);
          this.boxcolor = LiteGraph.colorToString([
              this.value,
              this.value,
              this.value
          ]);
      }
  
      onMouseDown(e) {
          const padding = 5;
          const sliderWidth = this.size[0] - padding * 2;
  
          if (e.canvasY - this.pos[1] < 20) {
              return false;
          }
  
          this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
          this.captureInput(true);
  
          const relativeX = e.canvasX - this.pos[0] - padding;
          this.value = Math.min(Math.max(relativeX / sliderWidth, 0), 1);
          this.properties.value =
              this.properties.min +
              (this.properties.max - this.properties.min) * this.value;
  
          this.setDirtyCanvas(true);
          return true;
      }
  
      onMouseMove(e) {
          if (!this.oldmouse) {
              return;
          }
  
          const padding = 5;
          const sliderWidth = this.size[0] - padding * 2;
  
          const relativeX = e.canvasX - this.pos[0] - padding;
          this.value = Math.min(Math.max(relativeX / sliderWidth, 0), 1);
          this.properties.value =
              this.properties.min +
              (this.properties.max - this.properties.min) * this.value;
  
          this.setDirtyCanvas(true);
      }
  
      onMouseUp() {
          this.oldmouse = null;
          this.captureInput(false);
      }
  }
  
  LiteGraph.registerNodeType("widget/hslider", WidgetHSlider);
  
