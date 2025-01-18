class TangoAttributeNode extends LGraphNode {
    constructor() {
      super();
      // Added input for device name
      this.addInput("device name", "string");
      this.addOutput("attribute name", "string");
      this.addProperty("device_name", "");
      this.addProperty("attribute_list", "None");
      this.addProperty("selected_attribute", "None");
      this.addWidget("text", "device name", "", "device_name");
      this.attributeListWidget = this.addWidget(
        "combo",
        "Select Attribute",
        "None",
        "selected_attribute",
        {
          values: ["None"],
        }
      );
      this.widgets_up = true;
      this.size = [300, 50];
      this.title = "Tango Attributes";
      this.desc = "Select an attribute from a Tango device";
  
      this.attributeList = []; // For caching fetched attributes
      this.lastDeviceName = null;
    }
  
    async fetchAttributes(deviceName) {
      try {
        const response = await fetch(
          `module1/attribute_list?device_name=${encodeURIComponent(deviceName)}`
        );
        if (response.ok) {
          const data = await response.json();
          this.attributeList = data;
          this.attributeListWidget.options.values = this.attributeList;
          this.attributeListWidget.value = "None";
          this.properties["attribute_list"] = this.attributeList.join(", ");
          // Update the widget
          this.setDirtyCanvas(true);
        } else {
          console.error("Failed to fetch attributes:", response.status);
        }
      } catch (error) {
        console.error("Error fetching attributes:", error);
      }
    }
  
    onPropertyChanged(name, value) {
      if (name === "device_name") {
        // Update the text widget value
        const widget = this.widgets.find((w) => w.name === "device_name");
        if (widget) {
          widget.value = value;
        }
        if (value) {
          this.fetchAttributes(value);
        }
      } else if (name === "selected_attribute") {
        // No need to fetch attribute value, we just output the attribute name
        // Update the output immediately
        this.setOutputData(0, value !== "None" ? value : null);
      }
    }
  
    onExecute() {
      // Get device name from input port or properties
      const inputDeviceName = this.getInputData(0);
      let deviceName = inputDeviceName || this.properties["device_name"];
  
      // Update device name if it comes from the input port
      if (inputDeviceName && inputDeviceName !== this.properties["device_name"]) {
        this.properties["device_name"] = inputDeviceName;
        const widget = this.widgets.find((w) => w.name === "device_name");
        if (widget) {
          widget.value = inputDeviceName;
        }
        if (inputDeviceName !== this.lastDeviceName) {
          this.lastDeviceName = inputDeviceName;
          this.fetchAttributes(inputDeviceName);
        }
      }
  
      const selectedAttribute = this.properties["selected_attribute"];
  
      // Output the selected attribute name
      if (selectedAttribute && selectedAttribute !== "None") {
        this.setOutputData(0, selectedAttribute);
      } else {
        this.setOutputData(0, null);
      }
    }
  
    getTitle() {
      if (this.flags.collapsed) {
        return this.properties["device_name"] || "Tango Attributes";
      }
      return this.title;
    }
  
    onDrawBackground(ctx) {
      // Show the selected attribute
      this.outputs[0].label = `Selected: ${this.properties["selected_attribute"]}`;
    }
  }
  
  // Register the node
  LiteGraph.registerNodeType("tango/attribute_node", TangoAttributeNode);



class DeviceSubscriptionNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Device Subscription";

        // New properties for single-device usage
        this.properties = {
            device: "",
            deviceInputMode: false // If true, read device from input port
        };

        // We keep track of subscribed devices/attributes to avoid duplicates
        this.subscribedDevices = {};

        // Keep a cache of device -> attributes, as before
        this.deviceAttributes = {
            "": [""]
        };

        // Single “selected attributes” string (comma-separated)
        this.selectedAttributes = "";

        // Add Inputs/Outputs
        // [0] -> Trigger
        // [1] -> Device (optional)
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");
        this.addOutput("Response", "object");

        // Internal function to help with blocking multiple rapid clicks
        this._singlePress = this._singlePress.bind(this);

        // Initialize UI
        this.updateWidgets();
    }

    /**
     * Create or refresh all widgets based on current state
     */
    updateWidgets() {
        // Clear existing widgets
        this.widgets = [];

        // Toggle widget: choose how the device is provided
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });

        // If device is from input port
        if (this.properties.deviceInputMode) {
            // Mark the input port as "Device"
            this.inputs[1].name = "Device";
            // Show info widget indicating we read from input
            this.addWidget("info", "Device", "From Input");
        } else {
            // Otherwise, ignore the input port
            this.inputs[1].name = "(unused)";
            // Show a text widget for device
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
            });
        }

        // Button to fetch attributes for the single device
        this.addWidget("button", "Fetch Attributes", null, this._singlePress(() => {
            this.fetchAttributes();
        }));

        // If we do have a known set of attributes for the device, show a combo widget
        // Otherwise, default to a text input for attributes
        let device = this.getActiveDeviceName();
        let attrList = this.deviceAttributes[device] || [];
        if (attrList.length > 0 && attrList[0] !== "") {
            // Show a combo if we have a non-empty list
            this.addWidget("combo", "Attributes", this.selectedAttributes, (value) => {
                this.selectedAttributes = value;
            }, { values: attrList });
        } else {
            // Fallback: text for specifying attributes
            this.addWidget("text", "Attributes", this.selectedAttributes, (value) => {
                this.selectedAttributes = value;
            });
        }

        // Button to subscribe
        this.addWidget("button", "Subscribe", null, this._singlePress(() => {
            this.subscribe();
        }));

        // Recompute size
        this.size = this.computeSize();
        if (this.graph) {
            this.graph.setDirtyCanvas(true, true);
        }
    }

    /**
     * Helper to prevent rapid multiple clicks within 'delay' ms
     */
    _singlePress(callback) {
        let lastTime = 0;
        const delay = 200; // ms
        return (event) => {
            const now = Date.now();
            if (now - lastTime < delay) {
                return;
            }
            lastTime = now;
            callback(event);
        };
    }

    /**
     * Get the active device name according to the toggle
     */
    getActiveDeviceName() {
        if (this.properties.deviceInputMode) {
            const inputDevice = this.getInputData(1);
            return inputDevice || "";
        } else {
            return this.properties.device;
        }
    }

    /**
     * Fetch attributes for the single device (via POST /module1/attribute_list)
     */
    fetchAttributes() {
        let deviceName = this.getActiveDeviceName();
        if (!deviceName || deviceName.trim() === "") {
            console.warn("Device name is empty, skipping fetchAttributes.");
            return;
        }

        const payload = { device_name: deviceName };
        fetch("/module1/attribute_list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                console.error("Error fetching attributes:", data.error);
                alert("Error fetching attributes: " + data.error);
                return;
            }

            const attributes = data.attributes || [];
            // Update local cache
            this.deviceAttributes[deviceName] = attributes;

            // If the currently selected device matches, reset the selectedAttributes
            if (this.getActiveDeviceName() === deviceName) {
                this.selectedAttributes = "";
            }

            // Rebuild UI to show combo or text
            this.updateWidgets();
        })
        .catch((err) => {
            console.error("Error fetching attributes:", err);
            alert("Error fetching attributes: " + err);
        });
    }

    /**
     * Subscribe to the selected attributes for the single device
     */
    subscribe() {
        let deviceName = this.getActiveDeviceName();
        if (!deviceName) {
            console.warn(`No device name provided.`);
            this.setOutputData(0, null);
            return;
        }

        if (!this.selectedAttributes) {
            console.warn(`No attributes specified.`);
            this.setOutputData(0, null);
            return;
        }

        // Convert comma-separated string to array
        const attributes = this.selectedAttributes
            .split(",")
            .map(a => a.trim())
            .filter(a => a !== "");

        if (attributes.length === 0) {
            console.warn("No valid attributes provided.");
            this.setOutputData(0, null);
            return;
        }

        // Check for new subscriptions
        const subscribedAttributes = this.subscribedDevices[deviceName] || [];
        const newAttrs = attributes.filter(a => !subscribedAttributes.includes(a));

        if (newAttrs.length === 0) {
            console.log("No new subscriptions to add.");
            this.setOutputData(0, null);
            return;
        }

        // Build the subscription data
        const newSubscriptions = {};
        newSubscriptions[deviceName] = newAttrs;

        // Update local tracking
        this.subscribedDevices[deviceName] = subscribedAttributes.concat(newAttrs);

        // Invoke the server endpoint
        this.invokeFlaskEndpoint(newSubscriptions);
    }

    /**
     * Sends the subscription data to /module1/subscribe_event
     */
    invokeFlaskEndpoint(newSubscriptions) {
        console.log("New Subscriptions:", newSubscriptions);

        fetch("/module1/subscribe_event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSubscriptions)
        })
        .then((response) => response.json())
        .then((data) => {
            // data can be an array of subscription statuses or an error object
            this.setOutputData(0, JSON.stringify(data)); // Send the raw response to the output port

            if (Array.isArray(data)) {
                // We have a list of subscription results
                let anyError = false;
                data.forEach(sub => {
                    if (sub.status === "subscribed") {
                        console.log(`Subscribed to ${sub.device}/${sub.attribute}`);
                    } else if (sub.status === "error") {
                        anyError = true;
                        console.error(`Error subscribing to ${sub.device}/${sub.attribute}: ${sub.error}`);
                        alert(`Error subscribing to ${sub.device}/${sub.attribute}: ${sub.error}`);
                    }
                });

                if (!anyError) {
                    console.log("All subscriptions succeeded.");
                }
            } else if (data.error) {
                // Some global error
                console.error("Error from server:", data.error);
                
            } else {
                // Unknown format
                console.log("Unknown response from server:", data);
            }
        })
        .catch((error) => {
            console.error("Fetch error:", error);
            alert("Error subscribing devices: " + error);
            this.setOutputData(0, { error: String(error) });
        });
    }

    /**
     * Trigger method from the "Trigger" action input
     */
    onAction(action, param) {
        if (action === "Trigger") {
            this.subscribe();
        }
    }

    /**
     * Serialize node state
     */
    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
        o.selectedAttributes = this.selectedAttributes;
        o.subscribedDevices = this.subscribedDevices;
        o.deviceAttributes = this.deviceAttributes;
    }

    /**
     * Deserialize node state
     */
    onConfigure(o) {
        if (!o) return;
        if (o.properties) {
            this.properties = o.properties;
        }
        if (o.selectedAttributes !== undefined) {
            this.selectedAttributes = o.selectedAttributes;
        }
        if (o.subscribedDevices) {
            this.subscribedDevices = o.subscribedDevices;
        }
        if (o.deviceAttributes) {
            this.deviceAttributes = o.deviceAttributes;
        }
        this.updateWidgets();
    }
}

// Register the node
LiteGraph.registerNodeType("tango/device_subscription", DeviceSubscriptionNode);







////////////more dynamic way but not able to save the data properly/////////////
// class CommandDevice extends LGraphNode {
//   constructor() {
//       super();
//       this.title = "Device Command";

//       // Initial properties
//       this.properties = {
//           device: "",
//           commandName: "",
//           inputArgs: "",
//           ifDumps: false,
//           deviceInputMode: false, // Toggle for Device input mode
//           commandNameInputMode: false, // Toggle for Command Name input mode
//           inputArgsInputMode: false, // Toggle for Input Arguments input mode
//           ifDumpsInputMode: false, // Toggle for Dumps input mode
//       };

//       // Initialize widgets and inputs
//       this.widgets = [];
//       this.updateInputs();

//       // Output for result code (only added once)
//       this.addOutput("Result Code", "number");
//   }

//   updateInputs() {
//       // Clear all existing inputs and widgets
//       this.inputs = [];
//       this.widgets = [];

//       // **Add Trigger input**
//       this.addInput("Trigger", LiteGraph.ACTION);

//       // Widgets for toggling input modes
//       this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
//           this.properties.deviceInputMode = value;
//           this.updateInputs();
//       });
//       this.addWidget("toggle", "Command Name Input", this.properties.commandNameInputMode, (value) => {
//           this.properties.commandNameInputMode = value;
//           this.updateInputs();
//       });
//       this.addWidget("toggle", "Input Args Input", this.properties.inputArgsInputMode, (value) => {
//           this.properties.inputArgsInputMode = value;
//           this.updateInputs();
//       });
//       this.addWidget("toggle", "Dumps Input", this.properties.ifDumpsInputMode, (value) => {
//           this.properties.ifDumpsInputMode = value;
//           this.updateInputs();
//       });

//       // Add Send Command button
//       this.addWidget("button", "Send Command", null, () => this.sendCommand());

//       // Add input or text field for Device
//       if (this.properties.deviceInputMode) {
//           this.addInput("Device", "string");
//       } else {
//           this.addWidget("text", "Device", this.properties.device, (value) => {
//               this.properties.device = value;
//           });
//       }

//       // Add input or text field for Command Name
//       if (this.properties.commandNameInputMode) {
//           this.addInput("Command Name", "string");
//       } else {
//           this.addWidget("text", "Command Name", this.properties.commandName, (value) => {
//               this.properties.commandName = value;
//           });
//       }

//       // Add input or text field for Input Arguments
//       if (this.properties.inputArgsInputMode) {
//           this.addInput("Input Arguments", "string");
//       } else {
//           this.addWidget("text", "Input Arguments", this.properties.inputArgs, (value) => {
//               this.properties.inputArgs = value;
//           });
//       }

//       // Add input or toggle for Dumps
//       if (this.properties.ifDumpsInputMode) {
//           this.addInput("Dumps", "boolean");
//       } else {
//           this.addWidget("toggle", "Dumps", this.properties.ifDumps, (value) => {
//               this.properties.ifDumps = value;
//           });
//       }

//       // Force redraw of the node
//       this.setDirtyCanvas(true, true);
//   }

//   // **Implement onAction to handle the Trigger input**
//   onAction(action, param) {
//       if (action === "Trigger") {
//           this.sendCommand();
//       }
//   }

//   sendCommand() {
//       console.log("sendCommand method called");

//       let inputIndex = 1; // Start from index 1 because index 0 is the Trigger input

//       // Retrieve Device
//       let device;
//       if (this.properties.deviceInputMode) {
//           device = this.getInputData(inputIndex++);
//       } else {
//           device = this.properties.device;
//       }
//       if (device === undefined || device === null || device === "") {
//           console.error("Device not provided.");
//           alert("Error: Device not provided.");
//           return;
//       }

//       // Retrieve Command Name
//       let commandName;
//       if (this.properties.commandNameInputMode) {
//           commandName = this.getInputData(inputIndex++);
//       } else {
//           commandName = this.properties.commandName;
//       }
//       if (commandName === undefined || commandName === null || commandName.trim() === "") {
//           console.error("Command Name not provided.");
//           alert("Error: Command Name not provided.");
//           return;
//       }

//       // Retrieve Input Arguments
//       let inputArgs;
//       if (this.properties.inputArgsInputMode) {
//           inputArgs = this.getInputData(inputIndex++);
//       } else {
//           inputArgs = this.properties.inputArgs;
//       }
//       if (inputArgs === undefined || inputArgs === null) {
//           inputArgs = ""; // Default to empty string if not provided
//       }

//       // Retrieve Dumps
//       let ifDumps;
//       if (this.properties.ifDumpsInputMode) {
//           ifDumps = this.getInputData(inputIndex++);
//       } else {
//           ifDumps = this.properties.ifDumps;
//       }

//       const command = {
//           device: device,
//           command_name: commandName,
//           input_args: inputArgs,
//           if_dumps: ifDumps,
//       };

//       // POST the JSON to Flask API
//       fetch("module1/command_inout", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(command),
//       })
//           .then((response) => response.json())
//           .then((data) => {
//               console.log("Response from Flask API:", data);
//               this.setOutputData(0, data.result_code); // Set result code
//           })
//           .catch((error) => {
//               console.error("Error posting command:", error);
//               alert("Error posting command: " + error);
//           });
//   }

//   onConfigure(config) {
//       // Rebuild the node's interface after loading
//       this.updateInputs();
//   }
// }

// // Register the node with LiteGraph
// LiteGraph.registerNodeType("tango/commandDevice", CommandDevice);


  
class AssertNode extends LGraphNode {
  constructor() {
    super();
    this.size = [350, 120];
    this.title = "Assertion Node";
    this.description = "";

    // Initialize assertions array with one entry
    this.assertions = [
      {
        device: "",
        attribute_name: "",
        expected_value: "",
        inputIndex: 0,
        attributeList: [""],
      },
    ];

    // Add a trigger input to receive events
    this.addInput("trigger", LiteGraph.ACTION);

    // Initialize previous device names array
    this.previousDeviceNames = [];

    // Enable serialization of widgets
    this.serialize_widgets = true;

    // Build inputs and widgets
    this.rebuildInputs();
    this.rebuildWidgets();

    // Adjust node size
    this.updateSize();
  }

  updateSize() {
    // Adjust node size to accommodate widgets and inputs
    const baseHeight = 80; // initial height
    const widgetHeight = 50; // approximate height per widget
    const inputHeight = 20; // approximate height per input
    const extraSpace = 20;
    const borderSpace=0 // extra space between entries

    this.size[1] =
      baseHeight +
      this.assertions.length * (widgetHeight + inputHeight + borderSpace) +
      extraSpace;
  }

  rebuildWidgets() {
    // Clear widgets
    this.widgets = [];

    // Re-add description widget
    this.addWidget("text", "Description", this.description, (v) => {
      this.description = v;
    });

    // For each assertion, add widgets
    for (let i = 0; i < this.assertions.length; i++) {
      const assertion = this.assertions[i];

      // Add attribute name combo box
      this.addWidget(
        "combo",
        `Attribute ${i + 1}`,
        assertion.attribute_name,
        (v) => {
          assertion.attribute_name = v;
        },
        {
          values: assertion.attributeList || ["voltage"],
        }
      );

      // Add expected value text field
      this.addWidget(
        "text",
        `Expected Value ${i + 1}`,
        assertion.expected_value,
        (v) => {
          assertion.expected_value = v;
        }
      );
    }

    // Add 'Add Entry' and 'Assert' buttons
    this.addButtons();
  }

  rebuildInputs() {
    // For each assertion, ensure there is an input
    if (!this.inputs) this.inputs = [];

    // Ensure inputs array has the same length as assertions plus the trigger input
    while (this.inputs.length < this.assertions.length + 1) {
      const inputName = `Device ${this.inputs.length}`;
      this.addInput(inputName, "string");
    }
    while (this.inputs.length > this.assertions.length + 1) {
      this.removeInput(this.inputs.length - 1);
    }

    // Update input names and assertion input indices
    for (let i = 0; i < this.assertions.length; i++) {
      const assertion = this.assertions[i];
      const inputIndex = i + 1; // input indices start from 1 because index 0 is 'trigger'
      const inputName = `Device ${i + 1}`;
      if (this.inputs[inputIndex].name !== inputName) {
        this.renameInput(this.inputs[inputIndex].name, inputName);
      }
      assertion.inputIndex = inputIndex; // inputs are in the same order
    }
  }

  addButtons() {
    // Remove existing buttons to prevent duplicates
    this.widgets = this.widgets.filter(
      (w) => w !== this.addEntryButton && w !== this.assertButton
    );

    // Add 'Add Entry' button
    this.addEntryButton = this.addWidget("button", "Add Entry", null, () => {
      this.addAssertionEntry();
    });

    // Add 'Assert' button
    this.assertButton = this.addWidget("button", "Assert", null, () => {
      this.onAssert();
    });
  }

  addAssertionEntry() {
    const index = this.assertions.length;
    this.assertions.push({
      device: "",
      attribute_name: "",
      expected_value: "",
      inputIndex: 0,
      attributeList: ["voltage"],
    });

    // Rebuild inputs and widgets
    this.rebuildInputs();
    this.rebuildWidgets();

    // Adjust node size
    this.updateSize();
  }

  onExecute() {
    // Retrieve device names from input ports
    for (let i = 0; i < this.assertions.length; i++) {
      const assertion = this.assertions[i];
      const deviceName = this.getInputData(assertion.inputIndex);
      if (deviceName !== undefined) {
        assertion.device = deviceName;
      } else {
        assertion.device = "";
      }

      // Check if device name has changed
      if (this.previousDeviceNames[i] !== assertion.device) {
        this.previousDeviceNames[i] = assertion.device;
        // Fetch attribute list for this device
        if (assertion.device) {
          this.fetchAttributeList(assertion.device, i);
        }
      }
    }
  }

  fetchAttributeList(deviceName, assertionIndex) {
    // Encode the device name for use in a URL
    const encodedDeviceName = encodeURIComponent(deviceName);

    // Make a GET request to '/module1/attribute_list' with the device name as a query parameter
    fetch(`/module1/attribute_list?device_name=${encodedDeviceName}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // data is the list of attributes
          const attributeList = data;
          // Update the assertion's attributeList
          this.assertions[assertionIndex].attributeList = attributeList;
          // Rebuild widgets to update the attribute combo box
          this.rebuildWidgets();
          // Adjust node size
          this.updateSize();
          // Update the UI
          this.setDirtyCanvas(true, true);
        } else if (data.error) {
          console.error(`Error fetching attributes for device ${deviceName}: ${data.error}`);
        }
      })
      .catch((error) => {
        console.error("Error fetching attribute list:", error);
      });
  }

  onAssert() {
    // Check for missing device names
    for (let i = 0; i < this.assertions.length; i++) {
      if (!this.assertions[i].device) {
        alert(`Device name missing for assertion ${i + 1}`);
        return;
      }
    }

    const data = {
      description: this.description,
      assertions: this.assertions.map((assertion) => ({
        device: assertion.device,
        attribute_name: assertion.attribute_name,
        value: assertion.expected_value,
      })),
    };

    console.log("Assertion Data:", data);

    // Post data to '/module1/assert_in' endpoint
    fetch("/module1/assert_in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        response.json().then((jsonData) => {
          console.log("Response:", jsonData);
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  // Serialization method
  onSerialize(o) {
    o.description = this.description;
    o.assertions = this.assertions;
    o.previousDeviceNames = this.previousDeviceNames;
  }

  // Deserialization method
  onConfigure(o) {
    this.description = o.description || "";
    this.assertions = o.assertions || [];
    this.previousDeviceNames = o.previousDeviceNames || [];

    // Rebuild inputs and widgets
    this.rebuildInputs();
    this.rebuildWidgets();

    // Adjust node size
    this.updateSize();
  }

  // Handle the trigger action
  onAction(action, param) {
    if (action === "trigger") {
      this.onAssert();
    }
  }
}

LiteGraph.registerNodeType("tango/assert_node", AssertNode);


/////////////############################comptests#####################// FunctionNode class definition
// FunctionNode class definition
// FunctionNode class definition
class FunctionNode extends LiteGraph.LGraphNode {
  /**
   * Constructor for the FunctionNode class.
   * @param {Object} func - An object representing the function details.
   */
  constructor(func) {
      super();
      // Set the node title to the function name
      this.title = func.name;
      // Store the function name, parameters, and return status
      this.functionName = func.name;
      this.params = func.params;
      this.hasReturn = func.hasReturn;

      // Initialize the node by adding inputs, outputs, and widgets
      this._initNode();
  }

  /**
   * Initializes the node by adding input ports, output ports, and widgets.
   */
  _initNode() {
      // Add input ports for each parameter
      this.params.forEach(param => {
          this.addInput(param);
      });

      // Add an optional event input port to trigger execution
      this.addInput("Event", LiteGraph.ACTION);

      // Add an output port if the function returns a value
      if (this.hasReturn) {
          this.addOutput('Output');
      }

      // Add a 'Trigger' button widget to manually execute the function
      this.addWidget('button', 'Trigger', null, () => {
          this.executeFunction();
      });
  }

  /**
   * Executes the function by sending a POST request to the server.
   * The input data is collected from the input ports (excluding the event input).
   */
  async executeFunction() {
      // Prepare an object to hold the input data
      const inputData = {};
      if (this.inputs) {
          this.inputs.forEach((input, index) => {
              // Skip the event input port
              if (input.type !== LiteGraph.ACTION) {
                  inputData[input.name] = this.getInputData(index);
              }
          });
      }

      try {
          // Send a POST request to the server endpoint corresponding to the function name
          const response = await fetch(`/${this.functionName}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(inputData)
          });
          const data = await response.json();

          if (response.ok) {
              // If the function has a return value, set it as the output data
              if (this.hasReturn) {
                  this.setOutputData(0, data.result);
              }
          } else {
              // Log any errors returned by the server
              console.error(`Error executing function: ${data.error}`);
              // Set output to null if there is an error
              if (this.hasReturn) {
                  this.setOutputData(0, null);
              }
          }
      } catch (error) {
          // Handle network errors
          console.error('Network error:', error);
          // Set output to null if there is an error
          if (this.hasReturn) {
              this.setOutputData(0, null);
          }
      }
  }

  /**
   * Handles incoming events on the "Event" input port.
   * @param {String} action - The name of the action.
   * @param {Any} param - The parameter of the action.
   */
  onAction(action, param) {
      // Trigger the function execution when an event is received
      this.executeFunction();
  }

  /**
   * Optionally executes the function when the node is processed during graph execution.
   */
  onExecute() {
      // Uncomment the following line if you want the function to execute automatically
      // this.executeFunction();
  }

  /**
   * Serializes the node's data for saving the graph state.
   * @returns {Object} The serialized data.
   */
  serialize() {
      // Call the base class serialize method
      const data = super.serialize();
      // Add custom properties to the serialized data
      data.functionName = this.functionName;
      data.params = this.params;
      data.hasReturn = this.hasReturn;
      return data;
  }

  /**
   * Configures the node with the serialized data when loading the graph.
   * @param {Object} data - The serialized data.
   */
  configure(data) {
      // Call the base class configure method
      super.configure(data);
      // Restore custom properties from the serialized data
      this.functionName = data.functionName;
      this.params = data.params;
      this.hasReturn = data.hasReturn;

      // Re-add the 'Trigger' button widget if it's not already present
      if (!this.widgets || this.widgets.length === 0) {
          this.addWidget('button', 'Trigger', null, () => {
              this.executeFunction();
          });
      }
  }

  /**
   * Static method to parse functions from Python code.
   * @param {String} pythonCode - The Python code containing function definitions.
   * @returns {Array} An array of function objects with name, params, and hasReturn.
   */
  static parseFunctions(pythonCode) {
      // Regular expression to match Python function definitions
      const functionRegex = /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
      let match;
      const functions = [];

      // Iterate over all matches in the Python code
      while ((match = functionRegex.exec(pythonCode)) !== null) {
          const [_, name, params, returnType] = match;
          // Split the parameter list and remove default values
          const paramList = params
              .split(',')
              .map(param => param.trim().split('=')[0])
              .filter(param => param);
          functions.push({
              name,
              params: paramList,
              hasReturn: true // Assume functions have a return value
          });
      }
      // Log the parsed functions for debugging
      console.log('Parsed functions:', functions);
      return functions;
  }

  /**
   * Static method to register nodes for each function parsed from Python code.
   * @param {String} pythonCode - The Python code containing function definitions.
   */
  static registerFunctionNodes(pythonCode) {
      const functions = FunctionNode.parseFunctions(pythonCode);

      functions.forEach(func => {
          // Dynamically create a unique class for each function node
          const CustomFunctionNode = class extends FunctionNode {
              constructor() {
                  super(func);
              }
          };

          // Register the node type with a unique name in the LiteGraph system
          LiteGraph.registerNodeType(`Functions/${func.name}/`, CustomFunctionNode);
      });
  }
}

// Example usage:
// Fetch the Python module containing function definitions
(async function () {
  /**
   * Fetches the module content from the server.
   * @returns {Promise<String>} The Python code as a string.
   */
  async function fetchModuleFile() {
      try {
          const response = await fetch('/get_module');
          const data = await response.json();
          return data.content;
      } catch (error) {
          console.error('Error fetching module file:', error);
          return '';
      }
  }

  /**
   * Initializes the LiteGraph graph, registers nodes, and starts the graph.
   */
  async function initializeGraph() {
      const pythonCode = await fetchModuleFile();

      // Register function nodes based on the Python code
      FunctionNode.registerFunctionNodes(pythonCode);

      // Create a new LiteGraph graph
      const graph = new LiteGraph.LGraph();

      // Load saved graph data if available
      const savedGraphData = localStorage.getItem('myGraph');
      if (savedGraphData) {
          const graphData = JSON.parse(savedGraphData);

          // Ensure all node types are registered before configuring the graph
          graphData.nodes.forEach(nodeData => {
              const nodeType = nodeData.type;
              if (!LiteGraph.registered_node_types[nodeType]) {
                  // Re-register the node type
                  const func = {
                      name: nodeData.functionName,
                      params: nodeData.params || [],
                      hasReturn: nodeData.hasReturn || false
                  };

                  const CustomFunctionNode = class extends FunctionNode {
                      constructor() {
                          super(func);
                      }
                  };
                  LiteGraph.registerNodeType(nodeType, CustomFunctionNode);
              }
          });

          // Configure the graph with the loaded data
          graph.configure(graphData);
      }

      // Create a new graph canvas and attach it to the DOM element
     
  }

  // Call the initializeGraph function to set up the graph
  initializeGraph();
})();






/////////////############################comptests#####################///////////////////////