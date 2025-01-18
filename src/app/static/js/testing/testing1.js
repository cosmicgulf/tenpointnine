class BDDClauseNodeCustom extends LGraphNode {
  constructor() {
      super();
      this.title = "BDD Clause";

      // Use nodeData for custom properties but maintain a minimal this.properties for LiteGraph compatibility
      this.nodeData = {
          clause: "Given a telescope"
      };
      this.properties = { ...this.nodeData }; // Sync properties initially

      this.widgets_up = true;
      this.size = [300, 220];

      // Add an input port for connecting previous clauses
      this.addInput("Previous Clause", LiteGraph.EVENT);

      // Add a multi-line text widget for the clause input
      // If multiline is not supported by your LiteGraph version, consider using a custom widget.
      this.addWidget("text", "Clause", this.nodeData.clause, (v) => {
          this.nodeData.clause = v;
          this.properties.clause = v; // Sync with properties
      }, { multiline: true });

      // Initialize outputs_count if not already set
      if (typeof this.outputs_count === 'undefined') {
          this.outputs_count = 2;
      }

      // Only update outputs if they haven't been set already
      if (!this.outputs || this.outputs.length === 0) {
          this.updateOutputs();
      }

      // Add buttons to add/remove steps (output ports)
      this.addWidget("button", "Add Step", null, (value, widget, node, pos, event) => {
          if (event && event.type === "mouseup") {
              this.outputs_count += 1;
              this.updateOutputs();
              this.setDirtyCanvas(true, true);
          }
      });

      this.addWidget("button", "Remove Step", null, (value, widget, node, pos, event) => {
          if (event && event.type === "mouseup") {
              if (this.outputs_count > 0) {
                  this.outputs_count -= 1;
                  this.updateOutputs();
                  this.setDirtyCanvas(true, true);
              }
          }
      });

      // Add a button to create and chain another BDD Clause node
      this.addWidget("button", "Add Clause", null, (value, widget, node, pos, event) => {
          if (event && event.type === "mouseup") {
              if (this.graph) {
                  this.addClauseNode();
              }
          }
      });

      // Add the 'Trigger' button
      this.addWidget("button", "Trigger", null, (value, widget, node, pos, event) => {
          if (event && event.type === "mouseup") {
              this.triggerAllOutputs();
          }
      });
  }

  // Method to update the output ports based on outputs_count
  updateOutputs() {
      const currentOutputs = this.outputs ? this.outputs.length : 0;

      // Update output names if necessary
      for (let i = 0; i < Math.min(currentOutputs, this.outputs_count); i++) {
          if (this.outputs[i].name !== "Step " + (i + 1)) {
              this.outputs[i].name = "Step " + (i + 1);
          }
      }

      // If we need more outputs, add them
      for (let i = currentOutputs; i < this.outputs_count; i++) {
          this.addOutput("Step " + (i + 1), LiteGraph.EVENT);
      }

      // If we have too many outputs, remove the extra ones
      for (let i = currentOutputs - 1; i >= this.outputs_count; i--) {
          // Disconnect existing connections first
          if (this.outputs[i] && this.outputs[i].links && this.outputs[i].links.length > 0) {
              this.disconnectOutput(i);
          }
          this.removeOutput(i);
      }
  }

  // Create a new BDD Clause node and chain it to the right
  addClauseNode() {
      const newNode = LiteGraph.createNode("Testing/Clause");
      if (!newNode) {
          console.error("Failed to create new BDD/Clause node. Check if the node type is registered.");
          return;
      }

      newNode.nodeData = {
          clause: "Given a new step"
      };
      newNode.properties = { ...newNode.nodeData };

      // Update widget values
      if (newNode.widgets) {
          newNode.widgets.forEach(widget => {
              if (widget.name === "Clause") {
                  widget.value = newNode.nodeData.clause;
              }
          });
      }
      newNode.pos = [this.pos[0] + 320, this.pos[1]];
      this.graph.add(newNode);
      // Connect the first output slot of current node to the input of the new node
      this.connect(0, newNode, 0);
      this.setDirtyCanvas(true, true);
      newNode.setDirtyCanvas(true, true);
  }

  // Send events to all outputs
  triggerAllOutputs() {
      for (let i = 0; i < this.outputs.length; i++) {
          this.triggerSlot(i);
      }
  }

  // Handle incoming events
  onAction(action, param) {
      this.triggerAllOutputs();
  }

  // Save the outputs_count and nodeData when serializing the graph
  onSerialize(o) {
      o.outputs_count = this.outputs_count;
      o.nodeData = { ...this.nodeData }; // Save custom node data
  }

  // Restore the outputs_count and nodeData when loading the graph
  onConfigure(o) {
      this.outputs_count = o.outputs_count || 2;
      this.nodeData = { ...o.nodeData } || {
          clause: "Given a telescope"
      };
      this.properties = { ...this.nodeData }; // Sync with properties

      // Update widget values to reflect restored data
      if (this.widgets) {
          this.widgets.forEach(widget => {
              if (widget.name === "Clause") {
                  widget.value = this.nodeData.clause;
              }
          });
      }
      this.setDirtyCanvas(true, true);
  }
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("Testing/Clause", BDDClauseNodeCustom);

class ReadAttributeNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Read Attribute";

        // Properties
        this.properties = {
            device: "",
            deviceInputMode: false // Read device from input or from property
        };

        // Inputs
        // [0] -> Trigger
        // [1] -> Device (optional)
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");

        // Outputs
        this.addOutput("Attribute Value", "any");
        this.addOutput("Attributes List", "array"); // List of attributes
        this.addOutput("Status", "string"); // Success or error message

        // Internal State
        this.attributes = []; // List of attributes fetched from the device
        this.selectedAttribute = ""; // Currently selected attribute

        this.updateWidgets();
    }

    updateWidgets() {
        this.widgets = [];

        // Toggle widget for device input mode
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });

        // Device input or property
        if (this.properties.deviceInputMode) {
            this.inputs[1].name = "Device";
            this.addWidget("info", "Device", "From Input");
        } else {
            this.inputs[1].name = "(unused)";
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
                // Optionally, fetch attributes when device changes
                this.fetchAttributes();
            });
        }

        // Button to fetch attributes
        this.addWidget("button", "Fetch Attributes", null, () => {
            this.fetchAttributes();
        });

        // Dropdown for selecting attribute
        if (this.attributes.length > 0) {
            const comboValues = this.attributes.map(attr => attr);
            this.addWidget("combo", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
            }, { values: comboValues });
        } else {
            this.addWidget("text", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
            });
        }

        // Button to read attribute
        this.addWidget("button", "Read Attribute", null, () => {
            this.readAttribute();
        });

        this.size = this.computeSize();
        this.setDirtyCanvas(true, true);
    }

    onAction(action, param) {
        if (action === "Trigger") {
            this.readAttribute();
        }
    }

    fetchAttributes() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(2, "Error: No device provided.");
            return;
        }

        // Prepare the request payload
        let payload = {
            device_name: device
        };

        // POST to /attribute_list
        fetch(`/module1/attribute_list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "attributes": ["ampli", "xyz", ...] }
            console.log("Attribute List response:", data);
            if (data.attributes && Array.isArray(data.attributes)) {
                this.attributes = data.attributes;
                // Set default selected attribute
                if (!this.attributes.includes(this.selectedAttribute)) {
                    this.selectedAttribute = this.attributes[0] || "";
                }
                this.setOutputData(1, this.attributes); // Output the attributes list
                this.setOutputData(2, "Success: Attributes fetched.");
            } else {
                console.error("Invalid attributes list in response.");
                this.attributes = [];
                this.setOutputData(1, []); // Output empty list
                this.setOutputData(2, "Error: Invalid attributes list.");
            }
            this.updateWidgets();
        })
        .catch((error) => {
            console.error("Error fetching attributes:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.setOutputData(1, []); // Output empty list
            this.setOutputData(2, `Error: ${errorMessage}`);
        });
    }

    readAttribute() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(2, "Error: No device provided.");
            return;
        }

        if (!this.selectedAttribute) {
            console.error("No attribute selected.");
            this.setOutputData(2, "Error: No attribute selected.");
            return;
        }

        // Prepare the request payload
        let payload = {
            device: device,
            attributes: [this.selectedAttribute]
        };

        // POST to /read_attributes
        fetch(`/module1/read_attributes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "device": device_name, "values": { "attribute_name": value } }
            console.log("Read Attribute response:", data);
            let attributeValue = data.values && data.values[this.selectedAttribute] !== undefined 
                ? data.values[this.selectedAttribute] 
                : null;

            if (attributeValue !== null) {
                // Output the attribute value
                this.setOutputData(0, attributeValue);
                this.setOutputData(2, "Success: Attribute read.");
            } else {
                console.error("Attribute not found in response.");
                this.setOutputData(2, "Error: Attribute not found.");
            }
        })
        .catch((error) => {
            console.error("Error reading attribute:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.setOutputData(2, `Error: ${errorMessage}`);
        });
    }

    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
        o.selectedAttribute = this.selectedAttribute;
        o.attributes = this.attributes;
    }

    onConfigure(config) {
        if (config.properties) {
            this.properties = config.properties;
        }
        if (config.selectedAttribute !== undefined) {
            this.selectedAttribute = config.selectedAttribute;
        }
        if (config.attributes !== undefined) {
            this.attributes = config.attributes;
        }
        this.updateWidgets();
    }
}

// Register the node
LiteGraph.registerNodeType("tango/readAttribute/manual", ReadAttributeNode);

///////////////////////////
///////////////////////////
class ReadAttributePollButtonNode extends LiteGraph.LGraphNode {
    constructor() {
        super();
        this.title = "Read Attribute (Poll Button)";

        // Properties
        this.properties = {
            device: "",
            deviceInputMode: false, // Read device from input or from property
            pollingPeriod: 2000     // Default polling period in ms
        };

        // Inputs
        // [0] -> Trigger (toggles start/pause of polling)
        // [1] -> Device (optional)
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");

        // Outputs
        this.addOutput("Attribute Value", "any");
        this.addOutput("Attributes List", "array"); // List of attributes
        this.addOutput("Status", "string");         // Success or error message

        // Internal State
        this.attributes = [];        // List of attributes fetched from the device
        this.selectedAttribute = ""; // Currently selected attribute
        this._intervalId = null;     // ID for setInterval
        this._pollingActive = false; // Flag to indicate if polling is active

        // Debounce flag
        this._buttonDebounce = false;

        this.updateWidgets();
    }

    updateWidgets() {
        // Clear existing widgets before re-adding
        this.widgets = [];

        // Toggle widget for device input mode
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });

        // Device input or property
        if (this.properties.deviceInputMode) {
            this.inputs[1].name = "Device";
            this.addWidget("info", "Device", "From Input");
        } else {
            this.inputs[1].name = "(unused)";
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
                // Optionally, fetch attributes when device changes
                this.fetchAttributes();
            });
        }

        // Polling period (in ms)
        this.addWidget("text", "Polling Period (ms)", this.properties.pollingPeriod.toString(), (value) => {
            const num = parseInt(value, 10);
            // only update if it's a valid integer
            if (!isNaN(num) && num > 0) {
                this.properties.pollingPeriod = num;
                // if currently polling, restart with the new period
                if (this._pollingActive) {
                    this.startPolling();
                }
            }
        });

        // Button to fetch attributes
        this.addWidget("button", "Fetch Attributes", null, () => {
            this.fetchAttributes();
        });

        // Dropdown (or text) for selecting attribute
        if (this.attributes.length > 0) {
            const comboValues = this.attributes.map(attr => attr);
            this.addWidget("combo", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
            }, { values: comboValues });
        } else {
            this.addWidget("text", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
            });
        }

        // Button to start/pause polling (with debounce logic)
        const buttonLabel = this._pollingActive ? "Pause Polling" : "Start Polling";
        this.addWidget("button", buttonLabel, null, () => {
            // Debounce logic
            if (this._buttonDebounce) {
                // If already in cooldown, ignore the click
                return;
            }
            // Set debounce flag, clear it after 200ms
            this._buttonDebounce = true;
            setTimeout(() => {
                this._buttonDebounce = false;
            }, 200);

            // Actual start/pause logic
            if (this._pollingActive) {
                this.stopPolling();
            } else {
                this.startPolling();
            }

            // Refresh widgets to update button label
            this.updateWidgets();
        });

        // Adjust node size and redraw
        this.size = this.computeSize();
        this.setDirtyCanvas(true, true);
    }

    onAction(action, param) {
        // Toggling on the Trigger input
        if (action === "Trigger") {
            if (this._pollingActive) {
                this.stopPolling();
            } else {
                this.startPolling();
            }
            this.updateWidgets();
        }
    }

    fetchAttributes() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(2, "Error: No device provided.");
            return;
        }

        // Prepare the request payload
        let payload = { device_name: device };

        // POST to /attribute_list
        fetch(`/module1/attribute_list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "attributes": ["ampli", "xyz", ...] }
            console.log("Attribute List response:", data);
            if (data.attributes && Array.isArray(data.attributes)) {
                this.attributes = data.attributes;
                // Set default selected attribute if current is not in the list
                if (!this.attributes.includes(this.selectedAttribute)) {
                    this.selectedAttribute = this.attributes[0] || "";
                }
                this.setOutputData(1, this.attributes); // Output the attributes list
                this.setOutputData(2, "Success: Attributes fetched.");
            } else {
                console.error("Invalid attributes list in response.");
                this.attributes = [];
                this.setOutputData(1, []); // Output empty list
                this.setOutputData(2, "Error: Invalid attributes list.");
            }
            this.updateWidgets();
        })
        .catch((error) => {
            console.error("Error fetching attributes:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.setOutputData(1, []); // Output empty list
            this.setOutputData(2, `Error: ${errorMessage}`);
        });
    }

    readAttribute() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(2, "Error: No device provided.");
            return;
        }

        if (!this.selectedAttribute) {
            console.error("No attribute selected.");
            this.setOutputData(2, "Error: No attribute selected.");
            return;
        }

        // Prepare the request payload
        let payload = {
            device: device,
            attributes: [this.selectedAttribute]
        };

        // POST to /read_attributes
        fetch(`/module1/read_attributes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "device": device_name, "values": { "attribute_name": value } }
            console.log("Read Attribute response:", data);
            let attributeValue = data.values && data.values[this.selectedAttribute] !== undefined 
                ? data.values[this.selectedAttribute] 
                : null;

            if (attributeValue !== null) {
                // Output the attribute value
                this.setOutputData(0, attributeValue);
                this.setOutputData(2, "Success: Attribute read.");
            } else {
                console.error("Attribute not found in response.");
                this.setOutputData(2, "Error: Attribute not found.");
            }
        })
        .catch((error) => {
            console.error("Error reading attribute:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.setOutputData(2, `Error: ${errorMessage}`);
        });
    }

    // Called when user clicks "Start Polling" or triggers
    startPolling() {
        this.stopPolling(); // clear any existing interval
        const period = this.properties.pollingPeriod;
        if (period > 0) {
            this._pollingActive = true;
            this._intervalId = setInterval(() => {
                this.readAttribute();
            }, period);
        }
    }

    // Called when user clicks "Pause Polling" or triggers again
    stopPolling() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._pollingActive = false;
    }

    // We do NOT automatically start polling onStart
    onStart() {
        // If you want to do something when the graph starts, do it here
        // (Currently left empty so that polling only starts on button/trigger)
    }

    // Ensure we stop polling if the graph stops
    onStop() {
        this.stopPolling();
    }

    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
        o.selectedAttribute = this.selectedAttribute;
        o.attributes = this.attributes;
        o._pollingActive = this._pollingActive;
    }

    onConfigure(config) {
        if (config.properties) {
            this.properties = config.properties;
        }
        if (config.selectedAttribute !== undefined) {
            this.selectedAttribute = config.selectedAttribute;
        }
        if (config.attributes !== undefined) {
            this.attributes = config.attributes;
        }
        if (config._pollingActive !== undefined) {
            // We'll start fresh and not restore the active state automatically
            this._pollingActive = false; 
        }
        this.updateWidgets();
    }
}

// Register the node
LiteGraph.registerNodeType("tango/readAttributePollButton", ReadAttributePollButtonNode);


//////////////////////////
//////////////////////////



class SetAttributeNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Set Attribute";

        // Properties
        this.properties = {
            device: "",
            deviceInputMode: false // Read device from input or from property
        };

        // Inputs
        // [0] -> Trigger
        // [1] -> Device (optional)
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");

        // Outputs
        this.addOutput("Status", "string"); // Success or error message

        // Internal State
        this.attributes = []; // List of attributes fetched from the device
        this.selectedAttribute = ""; // Currently selected attribute
        this.valueInput = ""; // Value to set

        this.updateWidgets();
    }

    updateWidgets() {
        this.widgets = [];

        // Toggle widget for device input mode
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });

        // Device input or property
        if (this.properties.deviceInputMode) {
            this.inputs[1].name = "Device";
            this.addWidget("info", "Device", "From Input");
        } else {
            this.inputs[1].name = "(unused)";
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
                // Optionally, fetch attributes when device changes
                this.fetchAttributes();
            });
        }

        // Button to fetch attributes
        this.addWidget("button", "Fetch Attributes", null, () => {
            this.fetchAttributes();
        });

        // Dropdown for selecting attribute
        if (this.attributes.length > 0) {
            const comboValues = this.attributes.map(attr => attr);
            this.addWidget("combo", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
                this.setValueInputWidget();
            }, { values: comboValues });
        } else {
            this.addWidget("text", "Select Attribute", this.selectedAttribute, (value) => {
                this.selectedAttribute = value;
                this.setValueInputWidget();
            });
        }

        // Input for setting attribute value
        this.setValueInputWidget();

        // Button to set attribute
        this.addWidget("button", "Set Attribute", null, () => {
            this.setAttribute();
        });

        this.size = this.computeSize();
        this.setDirtyCanvas(true, true);
    }

    setValueInputWidget() {
        // Remove existing value input widget
        this.widgets = this.widgets.filter(widget => widget.name !== "Value");

        if (!this.selectedAttribute) return;

        // Default to text input for all attributes
        this.addWidget("text", "Value", this.valueInput, (value) => {
            this.valueInput = value;
        });
    }

    onAction(action, param) {
        if (action === "Trigger") {
            this.setAttribute();
        }
    }

    fetchAttributes() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(0, "Error: No device provided.");
            return;
        }

        // Prepare the request payload
        let payload = {
            device_name: device
        };

        // POST to /attribute_list
        fetch(`/module1/attribute_list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "attributes": ["ampli", "xyz", ...] }
            console.log("Attribute List response:", data);
            if (data.attributes && Array.isArray(data.attributes)) {
                this.attributes = data.attributes;
                // Set default selected attribute
                if (!this.attributes.includes(this.selectedAttribute)) {
                    this.selectedAttribute = this.attributes[0] || "";
                }
                this.setOutputData(0, "Success: Attributes fetched.");
            } else {
                console.error("Invalid attributes list in response.");
                this.attributes = [];
                this.setOutputData(0, "Error: Invalid attributes list.");
            }
            this.setValueInputWidget(); // Update value input widget based on new attributes
            this.updateWidgets();
        })
        .catch((error) => {
            console.error("Error fetching attributes:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.attributes = [];
            this.setOutputData(0, `Error: ${errorMessage}`);
            this.updateWidgets();
        });
    }

    setAttribute() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            this.setOutputData(0, "Error: No device provided.");
            return;
        }

        if (!this.selectedAttribute) {
            console.error("No attribute selected.");
            this.setOutputData(0, "Error: No attribute selected.");
            return;
        }

        if (this.valueInput === "") {
            console.error("No value provided.");
            this.setOutputData(0, "Error: No value provided.");
            return;
        }

        // Determine the type of the selected attribute and convert valueInput accordingly
        let valueToSend;

        // Attempt to parse the input as integer or float
        if (!isNaN(this.valueInput)) {
            if (Number.isInteger(Number(this.valueInput))) {
                valueToSend = parseInt(this.valueInput, 10);
            } else {
                valueToSend = parseFloat(this.valueInput);
            }
        } else {
            // Keep as string
            valueToSend = this.valueInput;
        }

        // Prepare the request payload
        let payload = {
            device: device,
            attribute: this.selectedAttribute,
            value: valueToSend
        };

        // POST to /set_attribute
        fetch(`/module1/set_attribute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then((data) => {
            // Expecting { "device": device_name, "attribute": "attribute_name", "status": "success" }
            console.log("Set Attribute response:", data);
            if (data.status === "success") {
                this.setOutputData(0, `Success: ${data.attribute} set.`);
            } else {
                console.error("Failed to set attribute:", data);
                this.setOutputData(0, `Error: ${data.error || "Unknown error."}`);
            }
        })
        .catch((error) => {
            console.error("Error setting attribute:", error);
            const errorMessage = error && error.error ? error.error : error;
            this.setOutputData(0, `Error: ${errorMessage}`);
        });
    }

    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
        o.selectedAttribute = this.selectedAttribute;
        o.attributes = this.attributes;
        o.valueInput = this.valueInput;
    }

    onConfigure(config) {
        if (config.properties) {
            this.properties = config.properties;
        }
        if (config.selectedAttribute !== undefined) {
            this.selectedAttribute = config.selectedAttribute;
        }
        if (config.attributes !== undefined) {
            this.attributes = config.attributes;
        }
        if (config.valueInput !== undefined) {
            this.valueInput = config.valueInput;
        }
        this.updateWidgets();
    }
}

// Register the node
LiteGraph.registerNodeType("tango/setAttribute", SetAttributeNode);


/* global LiteGraph */



