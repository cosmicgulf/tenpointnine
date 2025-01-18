// Define and register custom nodes before initializing the graph

// Define the Context Input node
function ContextInputNode() {
  this.addOutput("value", "any");
  this.properties = { name: "" };
}

ContextInputNode.title = "Context Input";
ContextInputNode.prototype.onExecute = function () {
  const name = this.properties.name;
  if (name && this.graph.globalContext) {
      const value = this.graph.globalContext[name];
      this.setOutputData(0, value);
      console.log(`ContextInputNode '${name}': Outputting value:`, value);
  }
};

LiteGraph.registerNodeType("macro/context_input", ContextInputNode);

// Define the Context Output node
function ContextOutputNode() {
  this.addInput("value", "any");
  this.properties = { name: "" };
}

ContextOutputNode.title = "Context Output";
ContextOutputNode.prototype.onExecute = function () {
  const name = this.properties.name;
  if (name && this.graph.globalContext) {
      const value = this.getInputData(0);
      this.graph.globalContext[name] = value;
      console.log(`ContextOutputNode '${name}': Received value:`, value);
  }
};

LiteGraph.registerNodeType("macro/context_output", ContextOutputNode);

// Initialize the graph and canvas
var graph = new LiteGraph.LGraph();
var canvas = new LiteGraph.LGraphCanvas("#mycanvas", graph);
canvas.show_info = false;

// Function to load macro data
function loadMacroData(macroData, inputs, outputs) {
  try {
      // Configure the graph with the existing macro data if available
      if (macroData) {
          console.log("Configuring graph with macroData:", macroData);
          graph.configure(macroData);
      } else {
          console.warn("No valid macroData to configure.");
      }

      // Synchronize Context Input Nodes
      synchronizeNodes("macro/context_input", inputs, [50, 100]);

      // Synchronize Context Output Nodes
      synchronizeNodes("macro/context_output", outputs, [400, 100]);

      // Redraw the canvas
      canvas.draw(true, true);
  } catch (error) {
      console.error("Error loading macro data:", error);
  }
}

// Synchronize nodes of a specific type with provided names
function synchronizeNodes(nodeType, names, positionBase) {
  const existingNodes = graph.findNodesByType(nodeType);

  // Remove extra nodes not in names
  existingNodes.forEach((node) => {
      if (!names.includes(node.properties.name)) {
          graph.remove(node);
      }
  });

  // Add or update nodes for the provided names
  names.forEach((name, index) => {
      let node = existingNodes.find((n) => n.properties.name === name);
      if (!node) {
          // Create new node if it doesn't exist
          node = LiteGraph.createNode(nodeType);
          if (node) {
              node.properties.name = name;
              node.pos = [positionBase[0], positionBase[1] + index * 100];
              graph.add(node);
              console.log(`Created node: ${nodeType} with name '${name}'`);
          } else {
              console.error(`Failed to create node of type '${nodeType}'.`);
          }
      } else {
          // Update position if needed
          node.pos = [positionBase[0], positionBase[1] + index * 100];
      }
  });
}

// Request macro data from the main window
if (window.opener) {
  window.opener.postMessage({ type: 'requestMacroData' }, '*');
}

// Listen for messages from the main window
window.addEventListener('message', function (event) {
  const message = event.data;

  if (message.type === 'loadMacro') {
      try {
          const macroData = message.data ? JSON.parse(message.data) : null;
          const inputs = message.inputs || [];
          const outputs = message.outputs || [];
          console.log("Received macro data:", macroData);
          console.log("Inputs:", inputs);
          console.log("Outputs:", outputs);
          loadMacroData(macroData, inputs, outputs);
      } catch (error) {
          console.error("Failed to process incoming macro data:", error);
      }
  }
}, false);

// Save the macro graph data and send it back to the main window
document.getElementById('saveGraph').addEventListener('click', function () {
  try {
      const macroData = graph.serialize();
      const macroDataStr = JSON.stringify(macroData);
      // Send the macro data back to the main window
      if (window.opener) {
          window.opener.postMessage({ type: 'saveMacro', data: macroDataStr }, '*');
          console.log("Saved macro graph data sent to main window.");
      }
  } catch (error) {
      console.error("Failed to save macro graph data:", error);
  }
});

// Implement saveToFile and loadFromFile functions if needed
LiteGraph.LGraph.prototype.saveToFile = function (filename) {
  const data = JSON.stringify(this.serialize());
  const file = new Blob([data]);
  const url = URL.createObjectURL(file);
  const element = document.createElement("a");
  element.setAttribute('href', url);
  element.setAttribute('download', filename || "graph.json");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
};

LiteGraph.LGraph.prototype.loadFromFile = function () {
  const thisGraph = this;

  if (typeof FileReader === 'undefined') {
      console.log('File loading not supported by your browser');
      return;
  }

  const inputElement = document.createElement('input');
  inputElement.type = 'file';
  inputElement.accept = '.json';
  inputElement.multiple = false;

  inputElement.addEventListener('change', function () {
      if (inputElement.files) {
          const file = inputElement.files[0];
          const reader = new FileReader();

          reader.addEventListener('loadend', function () {
              if (reader.result) {
                  // Configure the graph with the loaded data
                  thisGraph.configure(JSON.parse(reader.result));
                  // Start the graph after it has been loaded
                  thisGraph.start();
              }
          });

          reader.addEventListener('error', function () {
              console.log('File load error');
          });

          reader.readAsText(file);
      }
  });

  inputElement.click();
  return;
};

