var graph = new LGraph();
var canvas = new LGraphCanvas("#mycanvas", graph);
canvas.show_info = false;
// canvas.background_color = "#ffffff";

////////////////////////////////////// background pattern////
// canvas.drawBackCanvas = function() {
//   var ctx = this.bgcanvas.getContext("2d");
//   ctx.save();

//   // Fill the background with a solid color
//   ctx.fillStyle = "#f0f0f0";
//   ctx.fillRect(0, 0, this.bgcanvas.width, this.bgcanvas.height);

//   ctx.restore();
// };
////////////////////////////////////// background pattern////

document.getElementById('saveGraph').addEventListener('click', function() {
  graph.save();
});

document.getElementById('loadGraph').addEventListener('click', function() {
  graph.load();
});


////////////////////////////////////////////////////////////

LiteGraph.LGraph.prototype.save = function () {

  var data = JSON.stringify(this.serialize());
  var file = new Blob([data]);
  var url = URL.createObjectURL(file);
  var element = document.createElement("a");
  element.setAttribute('href', url);
  element.setAttribute('download', "TenPointNine.jtn");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000 * 60); 

}

LiteGraph.LGraph.prototype.load = function () {
  const this_graph = this;

  if (typeof FileReader === 'TenPointNine') {
      console.error('File loading not supported by your browser');
      return; 
  }

  const inputElement = document.createElement('input');
  inputElement.type = 'file';
  inputElement.accept = '.jtn';
  inputElement.multiple = false;

  inputElement.addEventListener('change', function () {
      if (inputElement.files.length > 0) {
          const file = inputElement.files[0];
          const reader = new FileReader();

          reader.onloadend = function () {
              try {
                  const graphData = JSON.parse(reader.result);
                  // Configure and start the graph with the loaded data
                  this_graph.configure(graphData);
                  this_graph.start();
              } catch (error) {
                  console.error('Error parsing file data:', error);
              }
          };

          reader.onerror = function () {
              console.error('File load error');
          };

          reader.readAsText(file);
      }
  });

  inputElement.click();
};




////////////////////////////


class FactorialNode extends LGraphNode {
  constructor() {
    
    super();
    this.addOutput("int", "number");
    this.addProperty("value", 0); // Default value as integer
    // Set widget step to 1 and force value to be an integer
    this.widget = this.addWidget("number", "value", this.properties["value"], "value", {
      step: 10,  // Ensure integer step
      min: 0,  
      precision : 0, // Optional: set minimum value to 0
      max: 100  // Optional: set maximum value
    });
    this.widgets_up = true;
    this.size = [180, 30];
    this.title = "Factorial";
    this.desc = "Factorial";
  }

  // Function to compute factorial
  factorial(n) {
    if (n < 0) return 0; // Factorial is not defined for negative numbers
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  onExecute() {
    // Parse the input value and ensure it is treated as an integer
    const value = parseInt(this.properties["value"], 10);
    
    const factorialValue = this.factorial(value);
    this.setOutputData(0, factorialValue.toFixed(0));
  }

 

  setValue(v) {
    // Ensure value is always treated as an integer when set
    this.setProperty("value", parseInt(v, 10));
    this.widget.value = this.properties["value"]; // Update widget to reflect integer value
  }

  onDrawBackground(ctx) {
    // Show the current factorial value as an integer
    const value = parseInt(this.properties["value"], 10);
    this.outputs[0].label = this.factorial(value).toString();
  }
}



class ConstantNode extends LGraphNode {
    constructor() {
      super();
      this.addOutput("value", "number");
      this.addProperty("value", 0.0);
      this.widget = this.addWidget("number", "value", 0, "value");
      this.widgets_up = true;
      this.size = [180, 30];
      this.title = "Const Number";
      this.desc = "Constant Number";
    }

    onExecute() {
      this.setOutputData(0, parseFloat(this.properties["value"]));
      
    
    }

    getTitle() {
      if (this.flags.collapsed) {
        return this.properties.value;
      }
      return this.title;
    }

    setValue(v) {
      this.setProperty("value", v);
    }

    onDrawBackground(ctx) {
      //show the current value
      this.outputs[0].label = this.properties["value"].toFixed(3);
    }
  }

  class AddNode extends LGraphNode {
    constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A+B", "number");
      this.properties = { precision: 1, inputCounter: 2 }; // Store inputCounter in properties
      this.title = "Sum";
      this.margin = 5;
      this.size = [164, 84];
      this.button = {
        width: 100,
        height: 40,
        x: 32,
        y: this.size[1] - 50,
        color: "#334",
        hoverColor: "#668",
        clickColor: "white"
      };
      this.resetButton = {
        width: 100,
        height: 40,
        x: 32,
        y: this.size[1] - 50 + 50,
        color: "#944",
        hoverColor: "#f66",
        clickColor: "white"
      };
      this.mouseOverButton = false;
      this.mouseOverResetButton = false;
      this.clicked = false;
      this.inputCounter = this.properties.inputCounter; // Initialize inputCounter from properties
    }
  
    onExecute() {
      let result = 0;
      for (let i = 0; i < this.inputs.length; i++) {
        result += this.getInputData(i) || 0;
      }
      this.setOutputData(0, result);
    }
  
    onDrawBackground(ctx) {
      if (this.flags.collapsed) {
        return;
      }
  
      const adjustedMargin = this.margin;
      const shift = this.marginShift;
  
      // Draw widget background
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
  
      // Update button positions based on node size
      this.updateButtonPositions();
  
      // Draw buttons
      this.drawButton(ctx, this.button, this.mouseOverButton, this.clicked);
      this.drawButton(ctx, this.resetButton, this.mouseOverResetButton, false);
    }
  
    updateButtonPositions() {
      // Move the buttons relative to the current node size
      this.button.y = this.size[1] - 50; // Button 1 (add input) moves 50px from the bottom
      this.resetButton.y = this.size[1] - 50 + 50; // Button 2 (reset) moves below the add button
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
  
      // Check if mouse is over either button
      this.mouseOverButton = this.isPointInButton(canvasX, canvasY, this.button);
      this.mouseOverResetButton = this.isPointInButton(canvasX, canvasY, this.resetButton);
      this.clicked = false;
    }
  
    onMouseDown(e) {
      const canvasX = e.canvasX;
      const canvasY = e.canvasY;
  
      if (this.isPointInButton(canvasX, canvasY, this.button)) {
        this.clicked = true;
        this.addInputField(); // Add an input field when the button is clicked
      } else if (this.isPointInButton(canvasX, canvasY, this.resetButton)) {
        this.resetInputs(); // Reset inputs when the reset button is clicked
      } else {
        this.clicked = false;
      }
    }
  
    addInputField() {
      this.inputCounter++;
      const inputName = `Input ${this.inputCounter}`;
      this.addInput(inputName, "number");
  
      // Increase the node's height by 30 pixels to make room for the new input
      this.size[1] += 30;
  
      // Update the stored inputCounter value
      this.properties.inputCounter = this.inputCounter;
  
      // Update button positions after size change
      this.updateButtonPositions();
    }
  
    resetInputs() {
      // Remove all inputs
      while (this.inputs.length > 0) {
        this.removeInput(0);
      }
  
      // Reset input counter and add the default inputs (A, B)
      this.inputCounter = 2;
      this.addInput("A", "number");
      this.addInput("B", "number");
  
      // Reset the size of the node to its original height
      this.size[1] = 84;
  
      // Update the stored inputCounter value
      this.properties.inputCounter = this.inputCounter;
  
      // Update button positions after reset
      this.updateButtonPositions();
    }
  
    isPointInButton(x, y, button) {
      const nodeX = this.pos[0] || 0; // Node's X position on canvas
      const nodeY = this.pos[1] || 0; // Node's Y position on canvas
  
      return (
        x >= nodeX + button.x &&
        x <= nodeX + button.x + button.width &&
        y >= nodeY + button.y &&
        y <= nodeY + button.y + button.height
      );
    }
  
    // Method to serialize the node's state
    onSerialize(obj) {
      obj.inputCounter = this.inputCounter; // Save inputCounter to the serialized object
    }
  
    // Method to load the node's state
    onDeserialize(obj) {
      this.inputCounter = obj.inputCounter || 2; // Load inputCounter from the serialized object
    }
  }
  
  

  class SubtractNode extends LGraphNode {
    constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A-B", "number");
      this.properties = { precision: 1 };
      this.title = "Subtract";
      // this.bgcolor="#FF0000"
      // this.color="#FF0000"
    }

    onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = A - B;
      this.setOutputData(0, result);
          
      
    }
  }

  class MultiplyNode extends LGraphNode {
    constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A*B", "number");
      this.properties = { precision: 1 };
      this.title = "Multiply";
      // this.bgcolor="#FF0000"
      // this.color="#FF0000"
    }

    onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = A * B;
      this.setOutputData(0, result);
          
      
    }
  }
  class DivisionNode extends LGraphNode {
    constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A/B", "number");
      this.properties = { precision: 1 };
      this.title = "Divide";
      // this.bgcolor="#FF0000"
      // this.color="#FF0000"
    }

    onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = A / B;
      this.setOutputData(0, result);
          
      
    }
  }

  class EqualityNode extends LGraphNode {
    constructor() {
        super();
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("A == B", "boolean");
        this.title = "Equal";
    }

    onExecute() {
        const A = this.getInputData(0) || 0;
        const B = this.getInputData(1) || 0;
        const result = (A == B);
        this.setOutputData(0, result);
    }
}

class GreaterOrEqualNode extends LGraphNode {
  constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A >= B", "boolean");
      this.title = "Greater or Equal";
  }

  onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = (A >= B);
      this.setOutputData(0, result);
  }
}

class LessOrEqualNode extends LGraphNode {
  constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A <= B", "boolean");
      this.title = "Less or Equal";
  }

  onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = (A <= B);
      this.setOutputData(0, result);
  }
}

class GreaterThanNode extends LGraphNode {
  constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A > B", "boolean");
      this.title = "Greater Than";
  }

  onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = (A > B);
      this.setOutputData(0, result);
  }
}

class LessThanNode extends LGraphNode {
  constructor() {
      super();
      
      // Normal inputs/outputs
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A < B", "boolean");
      
      // Special input/output for loop or function connection
      this.addInput("In Loop/Function", "boolean", { shape: LiteGraph.ROUND_SHAPE });
      this.addOutput("In Loop/Function", "boolean", { shape: LiteGraph.ROUND_SHAPE });
      
      // Title for the node
      this.title = "Less Than";
  }

  onExecute() {
      // Get normal inputs
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      
      // Calculate the result of the comparison
      const result = (A < B);
      this.setOutputData(0, result);
      
      // Check if the node is inside a loop/function
      const isInLoopOrFunction = this.getInputData(2) || false;
      this.setOutputData(1, isInLoopOrFunction);
  }
}


class NotEqualNode extends LGraphNode {
  constructor() {
      super();
      this.addInput("A", "number");
      this.addInput("B", "number");
      this.addOutput("A ≠ B", "boolean");
      // this.horizontal = true;
      this.title = "Not equal to";
  }

  onExecute() {
      const A = this.getInputData(0) || 0;
      const B = this.getInputData(1) || 0;
      const result = (A != B);
      this.setOutputData(0, result);
  }
}





  class WatchNode extends LGraphNode {
    constructor() {
      super();
      this.size = [60, 30];
      this.addInput("value", 0, { label: "" });
      this.value = 0;
      
      this.title = "Watch";
      this.desc = "Show value of input";
      
    }

    onExecute() {
      if (this.inputs[0]) {
        this.value = this.getInputData(0);
      }
    }

    getTitle() {
      if (this.flags.collapsed) {
        return this.inputs[0].label;
      }
      return this.title;
    }

    toString(o) {
      if (o == null) {
        return "null";
      } else if (o.constructor === Number) {
        return o.toFixed(3);
      } else if (o.constructor === Array) {
        var str = "[";
        for (var i = 0; i < o.length; ++i) {
          str += this.toString(o[i]) + (i + 1 !== o.length ? "," : "");
        }
        str += "]";
        return str;
      } else {
        return String(o);
      }
    }

    onDrawBackground(ctx) {
      //show the current value
      this.inputs[0].label = this.toString(this.value);
    }
  }

  

// Register the IfGroup class to make it available for use

class TrueFalseNode extends LGraphNode {
  constructor() {
      super();
      this.title = "True/False Selector";  // Node title

      // Add output for true/false value
      this.addOutput("Value", "boolean");

      // Dropdown options for true and false
      this.properties = { value: "true" };  // Default selected value is true

      // Create a widget for selecting true/false (Dropdown)
      this.widgets_up = true;  // Widgets appear at the top
      this.addWidget("combo", "Select", this.properties.value, (v) => {
          this.properties.value = v;
      }, { values: ["true", "false"] });  // Combo box for selecting between true/false
  }

  // Execute the node logic
  onExecute() {
      // Output the boolean value based on dropdown selection
      const value = this.properties.value === "true";
      this.setOutputData(0, value);  // Output true if selected "true", else false
  }
}

/////////////////////////////
/////////////////////////////

////////////////////////////
////////////////////////////

class MacroNode extends LiteGraph.LGraphNode {
  constructor() {
      super();
      this.title = "Macro Node";
      this.size = [180, 60];
      this.resizable = true;

      // Widgets for adding inputs and outputs
      this.addWidget("button", "Add Input", "", () => this.addInputPort());
      this.addWidget("button", "Add Output", "", () => this.addOutputPort());

      // Widget to open macro editor
      this.addWidget("button", "Edit Macro", "", () => this.openMacroEditor());

      // Initialize properties
      this.macroGraphData = null; // Stores the serialized macro graph data
      this.internalGraph = null; // The internal graph representation
  }

  addInputPort(name = "input", type = 0) {
      const inputName = prompt("Enter input name:", name);
      if (inputName) {
          this.addInput(inputName, type);
      }
  }

  addOutputPort(name = "output", type = 0) {
      const outputName = prompt("Enter output name:", name);
      if (outputName) {
          this.addOutput(outputName, type);
      }
  }

  onExecute() {
      if (!this.macroGraphData) {
          return;
      }

      if (!this.internalGraph) {
          this.internalGraph = new LiteGraph.LGraph();
          this.internalGraph.configure(this.macroGraphData);
          this.internalGraph.start();
      }

      // Pass inputs to the internal graph
      for (let i = 0; i < this.inputs.length; i++) {
          const inputName = this.inputs[i].name;
          const inputValue = this.getInputData(i);
          this.internalGraph.setInputData(inputName, inputValue);
          console.log(`MacroNode: Set input '${inputName}' to`, inputValue);
      }

      // Execute the internal graph
      this.internalGraph.runStep();

      // Retrieve outputs from the internal graph
      for (let i = 0; i < this.outputs.length; i++) {
          const outputName = this.outputs[i].name;
          const outputValue = this.internalGraph.getOutputData(outputName);
          this.setOutputData(i, outputValue);
          console.log(`MacroNode: Got output '${outputName}' value:`, outputValue);
      }
  }

  openMacroEditor() {
      const macroWindow = window.open(
          "/macro-graph-editor",
          "MacroEditor",
          `width=800,height=600,left=100,top=100`
      );

      const messageHandler = (event) => {
          if (event.source !== macroWindow) return;
          const message = event.data;

          if (message.type === 'requestMacroData') {
              const inputs = this.inputs.map(input => input.name);
              const outputs = this.outputs.map(output => output.name);

              macroWindow.postMessage({
                  type: 'loadMacro',
                  data: this.macroGraphData ? JSON.stringify(this.macroGraphData) : null,
                  inputs: inputs,
                  outputs: outputs
              }, '*');
          } else if (message.type === 'saveMacro') {
              try {
                  this.macroGraphData = JSON.parse(message.data); // Ensure we correctly parse incoming data
                  this.internalGraph = null; // Reset internal graph to force reconfiguration
                  macroWindow.close();
                  window.removeEventListener('message', messageHandler);
              } catch (error) {
                  console.error("Failed to parse macro data:", error);
              }
          }
      };

      window.addEventListener('message', messageHandler);
  }

  serialize() {
      const o = super.serialize();
      o.macroGraphData = this.macroGraphData;
      return o;
  }

  configure(o) {
      super.configure(o);
      if (o.macroGraphData) {
          this.macroGraphData = o.macroGraphData;
          this.internalGraph = null; // Force reinitialization of the graph
      }
  }
}

// Register the MacroNode


class ExpressionNode extends LGraphNode {
  constructor() {
      super();
      this.title = "Expression";  // Node title
      
      // Properties to hold the expression
      this.properties = { expression: "x" };  // Default expression

      // Create a widget for editing the expression
      this.widgets_up = true;  // Widgets appear at the top
      this.addWidget("text", "Expression", this.properties.expression, (v) => {
          this.properties.expression = v;
          this.updateSize();  // Update size when expression changes
      });

      // Add output socket
      this.addOutput("Output", "string");

      this.updateSize();  // Initial size based on default expression
  }

  // Update the node size based on the expression length
  updateSize() {
      const ctx = LGraphCanvas.active_canvas.ctx;  // Get the current drawing context
      ctx.font = "14px Arial";  // Set the font to calculate width
      const textWidth = ctx.measureText(this.properties.expression).width;

      // Set minimum and maximum sizes
      const minWidth = 150;  // Increased minimum width
      const maxWidth = 300;
      const height = 80;  // Increased height for better visibility

      // Calculate width with limits
      this.size[0] = Math.min(Math.max(textWidth + 20, minWidth), maxWidth);
      this.size[1] = height;  // Fixed height
  }

  // Execute the node logic
  onExecute() {
      // Set output data to the expression
      this.setOutputData(0, this.properties.expression);
  }

  // Draw the node
  onDrawBackground(ctx) {
      ctx.fillStyle = "#FFFFFF";  // Background color
      ctx.fillRect(0, 0, this.size[0], this.size[1]);

      ctx.fillStyle = "#000000";  // Text color
      ctx.font = "14px Arial";  // Font size for rendering

      const maxDisplayLength = 30;  // Maximum length to display before truncation
      let displayText = this.properties.expression;

      if (displayText.length > maxDisplayLength) {
          const startText = displayText.slice(0, 15);  // First 15 characters
          const endText = displayText.slice(-15);  // Last 15 characters
          displayText = `${startText} ... ${endText})`;
      }

      ctx.textBaseline = "middle";  // Align text vertically in the middle
      ctx.fillText(displayText, 10, this.size[1] / 2);  // Center text vertically
  }
}

class LogarithmNode extends LGraphNode {
  constructor() {
      super();
      this.addInput("f(x)", "string");   // Input: string expression
      this.addOutput("Simplified log(f(x))", "string"); // Output: simplified logarithmic expression
      this.title = "Simplified Logarithm (Base e)";
  }

  onExecute() {
        // Ensure math.js is available
      const fx = this.getInputData(0);   // Get the input expression as a string

      if (typeof fx !== 'string') {
          this.setOutputData(0, "Invalid input");
          return;
      }

      try {
          // Parse the input expression
          const parsedFunction = math.parse(fx);

          // Compute the natural logarithm (base e)
          const logExpression = math.parse(`log(${fx})`); // Natural log (log base e)

          // Simplify the logarithmic expression
          const simplifiedLog = math.simplify(logExpression);

          // Convert the simplified expression to a string
          const simplifiedLogString = simplifiedLog.toString();

          // Set the output to the simplified logarithmic expression
          this.setOutputData(0, simplifiedLogString);
      } catch (error) {
          console.error("Error during logarithm simplification:", error);
          this.setOutputData(0, "Error");
      }
  }
}
class ConstantStringNode extends LGraphNode {
  constructor() {
    super();
    this.addOutput("value", "string");
    this.addProperty("value", "");
    this.widget = this.addWidget("text", "value", "", "value");
    this.widgets_up = true;
    this.size = [180, 30];
    this.title = "Const String";
    this.desc = "Constant String";
  }

  onExecute() {
    this.setOutputData(0, this.properties["value"]);
  }

  getTitle() {
    if (this.flags.collapsed) {
      return this.properties.value;
    }
    return this.title;
  }

  setValue(v) {
    this.setProperty("value", v);
  }

  onDrawBackground(ctx) {
    // Show the current value
    this.outputs[0].label = this.properties["value"];
  }
}

// Register the node in the LiteGraph system
LiteGraph.registerNodeType("basic/const_string", ConstantStringNode);
LiteGraph.registerNodeType("math/log_simplifier", LogarithmNode);
LiteGraph.registerNodeType("output/",ExpressionNode);
LiteGraph.registerNodeType("output/",MacroNode);
LiteGraph.registerNodeType("condition/true_false", TrueFalseNode);
LiteGraph.registerNodeType("output/watch", WatchNode);
LiteGraph.registerNodeType("input/const", ConstantNode);
LiteGraph.registerNodeType("operation/sum", AddNode);
LiteGraph.registerNodeType("operation/divide", DivisionNode);
LiteGraph.registerNodeType("operation/multiply", MultiplyNode);
LiteGraph.registerNodeType("operation/subtract", SubtractNode);
LiteGraph.registerNodeType("operation/fact", FactorialNode);
LiteGraph.registerNodeType("condition/check if equal/",EqualityNode);
LiteGraph.registerNodeType("condition/check if greater or equal/",GreaterOrEqualNode);
LiteGraph.registerNodeType("condition/check if less or equal/",LessOrEqualNode);
LiteGraph.registerNodeType("condition/check if greater/",GreaterThanNode);
LiteGraph.registerNodeType("condition/check if less/",LessThanNode);
LiteGraph.registerNodeType("condition/check if not equal/",NotEqualNode);

graph.start();