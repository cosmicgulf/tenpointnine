class PingDeviceNode extends LGraphNode {
    constructor() {
        super();
        this.title = "Ping Device";

        // Properties
        this.properties = {
            device: "",
            deviceInputMode: false // read device from input or from property
        };

        // Inputs
        // [0] -> Trigger
        // [1] -> Device
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");

        // One output
        this.addOutput("Ping Result", "string");

        this.updateWidgets();
    }

    updateWidgets() {
        this.widgets = [];

        // Toggle widget for device
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });

        // Button to ping
        this.addWidget("button", "Ping", null, () => {
            this.pingDevice();
        });

        // Device
        if (this.properties.deviceInputMode) {
            this.inputs[1].name = "Device";
            this.addWidget("info", "Device", "From Input");
        } else {
            this.inputs[1].name = "(unused) Device";
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
            });
        }

        this.size = this.computeSize();
        this.setDirtyCanvas(true, true);
    }

    onAction(action, param) {
        if (action === "Trigger") {
            this.pingDevice();
        }
    }

    pingDevice() {
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device) {
            console.error("No device provided.");
            alert("No device provided.");
            return;
        }

        // Example: /module1/ping_device?device=sys/tg_test/1
        let url = `/module1/ping_device?device=${encodeURIComponent(device)}`;
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                // server might return { "ping_result": some value }
                console.log("Ping response:", data);
                let pingVal = data.ping_result !== undefined ? data.ping_result : data;
                // Output
                this.setOutputData(0, pingVal);
            })
            .catch((error) => {
                console.error("Error pinging device:", error);
                alert("Error pinging device: " + error);
                this.setOutputData(0, null);
            });
    }

    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
    }

    onConfigure(config) {
        if (config.properties) {
            this.properties = config.properties;
        }
        this.updateWidgets();
    }
}

// Register the node
LiteGraph.registerNodeType("tango/pingDevice", PingDeviceNode);


/* global LiteGraph */

class CommandDevice extends LGraphNode {
    constructor() {
        super();
        this.title = "Device Command";

        // Initial properties
        this.properties = {
            device: "",
            commandName: "",
            inputArgs: "",      // store the string from property or input
            ifDumps: false,
            deviceInputMode: false,       // read device from input?
            commandNameInputMode: false,  // read commandName from input?
            inputArgsInputMode: false,    // read inputArgs from input?
            ifDumpsInputMode: false,      // read ifDumps from input?
        };

        // Create all possible inputs once
        // 0: Trigger action
        // 1: Device (string)
        // 2: Command Name (string)
        // 3: Input Arguments (any)
        // 4: Dumps (boolean)
        this.addInput("Trigger", LiteGraph.ACTION);
        this.addInput("Device", "string");
        this.addInput("Command Name", "string");
        this.addInput("Input Arguments"); // Changed to 'any' to accept multiple types
        this.addInput("Dumps", "boolean");

        // One output for the result
        this.addOutput("Result"); // Changed to 'any' to reflect potential varied output

        // Debounce state
        this.isSendingCommand = false;

        // Build UI
        this.updateWidgets();
    }

    updateWidgets() {
        // Clear any existing widgets each time
        this.widgets = [];

        // Toggle widgets
        this.addWidget("toggle", "Device Input", this.properties.deviceInputMode, (value) => {
            this.properties.deviceInputMode = value;
            this.updateWidgets();
        });
        this.addWidget("toggle", "Command Name Input", this.properties.commandNameInputMode, (value) => {
            this.properties.commandNameInputMode = value;
            this.updateWidgets();
        });
        this.addWidget("toggle", "Input Args Input", this.properties.inputArgsInputMode, (value) => {
            this.properties.inputArgsInputMode = value;
            this.updateWidgets();
        });
        this.addWidget("toggle", "Dumps Input", this.properties.ifDumpsInputMode, (value) => {
            this.properties.ifDumpsInputMode = value;
            this.updateWidgets();
        });

        // Button to send command
        this.addWidget("button", "Send Command", null, () => {
            if (!this.isSendingCommand) {
                this.isSendingCommand = true;
                this.sendCommand();
                // Simple debounce
                setTimeout(() => {
                    this.isSendingCommand = false;
                }, 500);
            }
        });

        // Device
        if (this.properties.deviceInputMode) {
            this.inputs[1].name = "Device";
            this.addWidget("info", "Device", "From Input");
        } else {
            this.inputs[1].name = "(unused) Device";
            this.addWidget("text", "Device", this.properties.device, (value) => {
                this.properties.device = value;
            });
        }

        // Command Name
        if (this.properties.commandNameInputMode) {
            this.inputs[2].name = "Command Name";
            this.addWidget("info", "Command Name", "From Input");
        } else {
            this.inputs[2].name = "(unused) Command Name";
            this.addWidget("text", "Command Name", this.properties.commandName, (value) => {
                this.properties.commandName = value;
            });
        }

        // Input Arguments
        if (this.properties.inputArgsInputMode) {
            this.inputs[3].name = "Input Arguments";
            this.addWidget("info", "Input Args", "From Input");
        } else {
            this.inputs[3].name = "(unused) Input Arguments";
            this.addWidget("text", "Input Args", this.properties.inputArgs, (value) => {
                this.properties.inputArgs = value;
            });
        }

        // Dumps
        if (this.properties.ifDumpsInputMode) {
            this.inputs[4].name = "Dumps";
            this.addWidget("info", "Dumps", "From Input");
        } else {
            this.inputs[4].name = "(unused) Dumps";
            this.addWidget("toggle", "Dumps", this.properties.ifDumps, (value) => {
                this.properties.ifDumps = value;
            });
        }

        // Recompute size of the node
        this.size = this.computeSize();
        // Mark the canvas as needing to be redrawn
        this.setDirtyCanvas(true, true);
    }

    onAction(action, param) {
        if (action === "Trigger") {
            this.sendCommand();
        }
    }

    sendCommand() {
        console.log("sendCommand method called");

        // Collect device from property or input
        let device = this.properties.deviceInputMode 
            ? this.getInputData(1) 
            : this.properties.device;

        if (!device || device.trim() === "") {
            console.error("Device not provided.");
            alert("Error: Device not provided.");
            return;
        }

        // Collect commandName from property or input
        let commandName = this.properties.commandNameInputMode
            ? this.getInputData(2)
            : this.properties.commandName;

        if (!commandName || commandName.trim() === "") {
            console.error("Command Name not provided.");
            alert("Error: Command Name not provided.");
            return;
        }

        // Collect inputArgs from property or input
        let inputArgs = this.properties.inputArgsInputMode
            ? this.getInputData(3)
            : this.properties.inputArgs;
        if (inputArgs == null) inputArgs = "";

        // If inputArgs are from properties, attempt to parse them to their original types
        if (!this.properties.inputArgsInputMode) {
            inputArgs = this.parseInputArgs(inputArgs);
        }

        // Collect ifDumps from property or input
        let ifDumps = this.properties.ifDumpsInputMode
            ? this.getInputData(4)
            : this.properties.ifDumps;

        // **Enhanced Debugging Logs**
        console.log("=== Command Payload Details ===");
        console.log("Device:", device, "| Type:", typeof device);
        console.log("Command Name:", commandName, "| Type:", typeof commandName);
        console.log("Input Args:", inputArgs, "| Type:", typeof inputArgs);
        console.log("If Dumps:", ifDumps, "| Type:", typeof ifDumps);
        console.log("================================");

        // Build payload
        const command = {
            device: device,
            command_name: commandName,
            input_args: inputArgs,
            if_dumps: !!ifDumps // ensure boolean
        };

        // **Log the Final JSON Payload**
        console.log("Final JSON Payload to be sent:", JSON.stringify(command, null, 2));

        // POST to Flask API
        fetch("/module1/command_inout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
        })
        .then((response) => response.json())
        .then((data) => {
            console.log("Response from Flask API:", data);

            // If server returned an error, handle it
            if (data.error) {
                alert("Error from server: " + data.error);
                this.setOutputData(0, data.error);
                return;
            }

            // Otherwise, parse the 'result' if needed
            let outputVal = data.result;

            // If it's a string that might be JSON, optionally parse it:
            if (typeof outputVal === "string") {
                try {
                    outputVal = JSON.parse(outputVal);
                } catch (e) {
                    // Not valid JSON, keep as string
                }
            }

            // Set the final output
            this.setOutputData(0, outputVal);
        })
        .catch((error) => {
            console.error("Error posting command:", error);
            alert("Error posting command: " + error);
            this.setOutputData(0, null);
        });
    }

    // Helper method to parse inputArgs
    parseInputArgs(input) {
        if (typeof input !== "string") {
            return input; // Already the correct type
        }

        // Attempt to parse as JSON
        try {
            return JSON.parse(input);
        } catch (e) {
            // Not JSON, proceed to next checks
        }

        // Attempt to parse as number
        if (!isNaN(input)) {
            return Number(input);
        }

        // Attempt to parse as boolean
        const lowerInput = input.toLowerCase();
        if (lowerInput === "true") return true;
        if (lowerInput === "false") return false;

        // Return as string if all parsing attempts fail
        return input;
    }

    // Save & Load
    onSerialize(o) {
        if (!o) return;
        o.properties = this.properties;
    }

    onConfigure(config) {
        if (config.properties) {
            this.properties = config.properties;
        }
        this.updateWidgets();
    }
}

// Register the node with LiteGraph
LiteGraph.registerNodeType("tango/commandDevice", CommandDevice);





class ConstantJSONNode extends LGraphNode {
    constructor() {
        super();
        // Add an output port named "JSON" of type "string"
        this.addOutput("JSON", "string");
        // Initialize properties
        this.addProperty("json", ""); // The JSON data as a string
        this.addProperty("url", "");  // URL to fetch JSON from

        // Store the latest JSON data
        this.latestJSON = ""; // Latest JSON data as a string

        // Add a text input widget for the URL
        this.widget = this.addWidget("text", "URL", this.properties.url, "url");

        // Add buttons for uploading JSON file and editing JSON
        this.addWidget("button", "Upload JSON File", "", this.onUploadJSONFile.bind(this));
        this.addWidget("button", "Edit JSON", "", this.onEditJSON.bind(this));

        // Place widgets on top
        this.widgets_up = true;

        // Set size, title, and description
        this.size = [200, 120];
        this.title = "Const JSON";
        this.desc = "Constant JSON";
    }

    // Executes on every frame
    onExecute() {
        // Output the latest JSON data (string)
        this.setOutputData(0, this.latestJSON);
    }

    // Handler for the "Upload JSON File" button
    onUploadJSONFile() {
        // Create a hidden file input element
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        // Handler when a file is selected
        input.onchange = (e) => {
            let file = e.target.files[0];
            if (!file) return;
            let reader = new FileReader();

            reader.onload = (event) => {
                try {
                    // Read the JSON file content as text
                    let jsonStr = event.target.result;
                    // Try parsing to validate JSON
                    JSON.parse(jsonStr);

                    // Update the property and latest JSON data
                    this.setProperty('json', jsonStr);
                    this.latestJSON = jsonStr;
                    // Mark the canvas as dirty to redraw
                    this.setDirtyCanvas(true);
                } catch (err) {
                    // Handle error in JSON parsing
                    console.error("Invalid JSON file", err);
                    alert("Invalid JSON file: " + err.message);
                }
            };

            // Read the file as text
            reader.readAsText(file);
        };

        // Trigger click to open file dialog
        input.click();
    }

    // Handler for the "Edit JSON" button
    onEditJSON() {
        // Get the current JSON as a string
        let jsonStr = this.properties["json"] || "";

        // Open a modal editor
        this.showJSONEditor(jsonStr, (newJSONStr) => {
            try {
                // Try parsing to validate JSON
                JSON.parse(newJSONStr);
                // Update the property and latest JSON data
                this.setProperty("json", newJSONStr);
                this.latestJSON = newJSONStr;
                // Mark the canvas as dirty to redraw
                this.setDirtyCanvas(true);
            } catch (err) {
                // Handle error in JSON parsing
                console.error("Invalid JSON", err);
                alert("Invalid JSON: " + err.message);
            }
        });
    }

    // Shows a simple modal editor to edit JSON
    showJSONEditor(initialValue, callback) {
        // Create overlay div
        let overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = 1000;

        // Create editor container
        let editorDiv = document.createElement('div');
        editorDiv.style.position = 'absolute';
        editorDiv.style.left = '50%';
        editorDiv.style.top = '50%';
        editorDiv.style.transform = 'translate(-50%, -50%)';
        editorDiv.style.backgroundColor = 'white';
        editorDiv.style.padding = '10px';
        editorDiv.style.border = '1px solid #ccc';
        editorDiv.style.width = '500px';
        editorDiv.style.height = '400px';
        editorDiv.style.display = 'flex';
        editorDiv.style.flexDirection = 'column';

        // Create textarea
        let textarea = document.createElement('textarea');
        textarea.style.flex = '1';
        textarea.style.width = '100%';
        textarea.style.boxSizing = 'border-box';
        textarea.value = initialValue;

        // Create buttons container
        let buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.justifyContent = 'flex-end';
        buttonsDiv.style.marginTop = '10px';

        // Create Save button
        let saveButton = document.createElement('button');
        saveButton.innerText = 'Save';
        saveButton.style.marginRight = '10px';

        // Create Cancel button
        let cancelButton = document.createElement('button');
        cancelButton.innerText = 'Cancel';

        // Save button handler
        saveButton.onclick = () => {
            let newValue = textarea.value;
            callback(newValue);
            document.body.removeChild(overlay);
        };

        // Cancel button handler
        cancelButton.onclick = () => {
            document.body.removeChild(overlay);
        };

        // Assemble buttons
        buttonsDiv.appendChild(saveButton);
        buttonsDiv.appendChild(cancelButton);

        // Assemble editor
        editorDiv.appendChild(textarea);
        editorDiv.appendChild(buttonsDiv);

        // Assemble overlay
        overlay.appendChild(editorDiv);
        document.body.appendChild(overlay);
    }

    // Handle property changes
    onPropertyChanged(name, value) {
        if (name === "url") {
            if (!value) return;
            // Fetch JSON from the URL
            fetch(value)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.text();
                })
                .then(data => {
                    try {
                        // Validate JSON
                        JSON.parse(data);
                        // Update the latest JSON data
                        this.latestJSON = data;
                        // Update the property
                        this.setProperty("json", data);
                        this.setDirtyCanvas(true);
                    } catch (err) {
                        console.error("Invalid JSON from URL", err);
                        alert("Invalid JSON from URL: " + err.message);
                        // If previously uploaded/edited JSON is available, revert to it
                        if (this.properties["json"]) {
                            this.latestJSON = this.properties["json"];
                        } else {
                            this.latestJSON = data;
                        }
                    }
                })
                .catch(error => {
                    console.error("Error fetching JSON from URL", error);
                    alert("Error fetching JSON from URL: " + error.message);
                    // If we have a stored JSON, revert
                    if (this.properties["json"]) {
                        this.latestJSON = this.properties["json"];
                    } else {
                        this.latestJSON = error.message;
                    }
                    this.setDirtyCanvas(true);
                });
        }
    }

    // Optionally, draw background to show snippet of JSON
    onDrawBackground(ctx) {
        if (this.flags.collapsed) return;
        ctx.save();
        ctx.fillStyle = "#AAA";
        ctx.font = "12px Arial";
        let jsonStr = this.latestJSON || "";
        let lines = jsonStr.split('\n');
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            ctx.fillText(lines[i], 5, 30 + i * 14);
        }
        ctx.restore();
    }

    // Override getTitle to display short status if collapsed
    getTitle() {
        if (this.flags.collapsed) {
            return this.title + " (" + (this.latestJSON ? "JSON Loaded" : "No JSON") + ")";
        }
        return this.title;
    }
}

// Register the node class
LiteGraph.registerNodeType("tango/ConstantJSON", ConstantJSONNode);

