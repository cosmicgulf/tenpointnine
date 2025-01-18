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
  
  
  LiteGraph.registerNodeType("tango/TangoDeviceNode", ListNode);


  class WidgetKnob extends LGraphNode {
    constructor() {
        this.addOutput("", "number");
        this.size = [64, 84];
        this.properties = {
            min: 0,
            max: 1,
            value: 0.5,
            color: "#7AF",
            precision: 2
        };
        this.value = -1;
    }

    static get title() {
        return "Knob";
    }

    static get desc() {
        return "Circular controller";
    }

    static get size() {
        return [80, 100];
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
        const center_y = this.size[1] * 0.5;
        const radius = Math.min(this.size[0], this.size[1]) * 0.5 - 5;

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(center_x, center_y);
        ctx.rotate(Math.PI * 0.75);

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.fillStyle = this.properties.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            radius - 4,
            0,
            Math.PI * 1.5 * Math.max(0.01, this.value)
        );
        ctx.closePath();
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(center_x, center_y, radius * 0.75, 0, Math.PI * 2, true);
        ctx.fill();

        ctx.fillStyle = this.mouseOver ? "white" : this.properties.color;
        ctx.beginPath();
        const angle = this.value * Math.PI * 1.5 + Math.PI * 0.75;
        ctx.arc(
            center_x + Math.cos(angle) * radius * 0.65,
            center_y + Math.sin(angle) * radius * 0.65,
            radius * 0.05,
            0,
            Math.PI * 2,
            true
        );
        ctx.fill();

        ctx.fillStyle = this.mouseOver ? "white" : "#AAA";
        ctx.font = `${Math.floor(radius * 0.5)}px Arial`;
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
        this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
        this.radius = this.size[0] * 0.5;
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
        this.size = [160, 26];
        this.addOutput("", "number");
        this.properties = { color: "#7AF", min: 0, max: 1, value: 0.5 };
        this.value = -1;
    }

    static get title() {
        return "H.Slider";
    }

    static get desc() {
        return "Linear slider controller";
    }

    onDrawForeground(ctx) {
        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(2, 2, this.size[0] - 4, this.size[1] - 4);

        ctx.fillStyle = this.properties.color;
        ctx.beginPath();
        ctx.rect(4, 4, (this.size[0] - 8) * this.value, this.size[1] - 8);
        ctx.fill();
    }

    onExecute() {
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
        if (e.canvasY - this.pos[1] < 0) {
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
        const delta = m[0] - this.oldmouse[0];
        v += delta / this.size[0];
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }

        this.value = v;

        this.oldmouse = m;
        this.setDirtyCanvas(true);
    }

    onMouseUp() {
        this.oldmouse = null;
        this.captureInput(false);
    }
}

LiteGraph.registerNodeType("widget/hslider", WidgetHSlider);

