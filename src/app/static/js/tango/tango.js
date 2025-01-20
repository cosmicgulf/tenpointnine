class TangoDevNamesNode extends LGraphNode {
  constructor() {
    super();
    this.title = "Tango Dev Names";
    this.desc = "Select Tango Device Names";
    this.size = [300, 100]; // Wider for display

    // Initialize TANGO prefix to empty until fetched
    this.trlPrefix = "";
    // Keep track of the "originalNamespace" we parse out
    this.originalNamespace = "";

    // NEW property and widget for "namespace"
    this.addProperty("namespace", "", "string");

    // Asynchronously fetch the TANGO prefix from /fqdn
    fetch("/fqdn")
      .then((response) => response.json())
      .then((data) => {
        // data.fqdn should be something like:
        //   "tango://tango-databaseds.tenpointnine.svc.cluster.local:1000/"
        this.trlPrefix = data.fqdn || "";

        // Try to parse out the original namespace from the fqdn
        // This is a simple pattern that assumes your prefix looks like:
        //   "tango://HOST.NAMESPACE.svc.CLUSTER_DOMAIN:PORT/"
        const pattern = /^tango:\/\/([^.]+)\.([^.]+)\.svc\.[^:]+:\d+\/$/;
        const match = pattern.exec(this.trlPrefix);
        if (match) {
          // match[2] is the second capture group = the "NAMESPACE" part
          this.originalNamespace = match[2];
          // Use that as default
          this.properties.namespace = this.originalNamespace;
          if (this.namespaceWidget) {
            this.namespaceWidget.value = this.properties.namespace;
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching TANGO prefix from /fqdn:", err);
        this.trlPrefix = ""; // Fallback to empty
      });

    // Example JSON, storing partial device names only
    this.addProperty(
      "devices_json",
      JSON.stringify(
        {
          cspmasterleafnodes: "ska_mid/tm_leaf_node/csp_master",
          cspcontroller: "mid-csp/control/0",
          cspsubarray: ["mid-csp/subarray/01"],
          cspsubarrayleafnodes: ["ska_mid/tm_leaf_node/csp_subarray01"],
          custom: ""
        },
        null,
        2
      ),
      "string"
    );

    this.addProperty("selected_device_type", "Select Device", "string");
    this.addProperty("selected_instance_index", 0, "number");
    this.addProperty("value", "", "string");

    // Parse devices_json
    this.updateDevices();

    // Create widgets
    this.widgets_up = true;
    this.deviceTypeWidget = this.addWidget(
      "combo",
      "Device Type",
      this.properties.selected_device_type,
      this.onDeviceTypeChanged.bind(this),
      { values: Object.keys(this.devices) }
    );

    // The new "namespace" text widget
    // (bind its onChange to store user edits)
    this.namespaceWidget = this.addWidget(
      "text",
      "Namespace",
      this.properties.namespace,
      (v) => {
        this.properties.namespace = v;
      }
    );

    this.instanceWidget = null;
    this.valueWidget = this.addWidget(
      "text",
      "Value",
      this.properties.value,
      this.onValueChanged.bind(this)
    );

    // Create output port
    this.addOutput("value", "string");

    // Initialize the value
    this.updateValue();
  }

  updateDevices() {
    try {
      this.devices = JSON.parse(this.properties.devices_json);
    } catch (e) {
      console.error("Invalid devices JSON", e);
      this.devices = {};
    }
  }

  onPropertyChanged(name, value) {
    if (name === "devices_json") {
      this.updateDevices();
      // Update the device-type widget’s dropdown options
      this.deviceTypeWidget.options.values = Object.keys(this.devices);
      this.setDirtyCanvas(true);
      // If the current device type no longer exists in the JSON, reset it
      if (!this.devices.hasOwnProperty(this.properties.selected_device_type)) {
        this.properties.selected_device_type = Object.keys(this.devices)[0] || "";
      }
      this.deviceTypeWidget.value = this.properties.selected_device_type;
      this.updateValue();
    }
  }

  onDeviceTypeChanged(v) {
    this.properties.selected_device_type = v;
    this.properties.selected_instance_index = 0; // Reset instance index
    // If an instance widget exists (arrays), remove it
    if (this.instanceWidget) {
      const idx = this.widgets.indexOf(this.instanceWidget);
      if (idx !== -1) {
        this.widgets.splice(idx, 1);
        this.size[1] -= 30;
      }
      this.instanceWidget = null;
    }
    this.updateValue();
  }

  onInstanceChanged(v) {
    this.properties.selected_instance_index = parseInt(v);
    this.updateValue();
  }

  onValueChanged(v) {
    this.properties.value = v;
    const deviceType = this.properties.selected_device_type;

    // Store the raw value in the devices JSON
    // (we do NOT prepend the TANGO prefix here—this is raw storage)
    if (deviceType === "custom") {
      // Custom device: store the user input as-is
      this.devices["custom"] = v;
    } else if (Array.isArray(this.devices[deviceType])) {
      // If this is an array (e.g. subarray list):
      const idx = this.properties.selected_instance_index;
      this.devices[deviceType][idx] = v;
    } else {
      // Single device type
      this.devices[deviceType] = v;
    }

    // Keep devices_json in sync
    this.properties.devices_json = JSON.stringify(this.devices, null, 2);
  }

  updateValue() {
    const devices = this.devices;
    const deviceType = this.properties.selected_device_type;
    const deviceValue = devices[deviceType];

    if (Array.isArray(deviceValue)) {
      // It’s a list of possible instances
      if (!this.instanceWidget) {
        // Add an instance selector widget
        const instanceNames = deviceValue.map((_, index) => index.toString());
        this.instanceWidget = this.addWidget(
          "combo",
          "Instance",
          this.properties.selected_instance_index.toString(),
          this.onInstanceChanged.bind(this),
          { values: instanceNames }
        );
        this.size[1] += 30;
      } else {
        // Update existing widget’s possible values
        this.instanceWidget.options.values = deviceValue.map((_, index) =>
          index.toString()
        );
      }
      const idx = this.properties.selected_instance_index;
      this.properties.value = deviceValue[idx];
      this.valueWidget.value = this.properties.value;
      this.valueWidget.options = { disabled: false }; // let user edit
    } else if (typeof deviceValue === "string") {
      // Single device
      this.properties.value = deviceValue;
      if (this.instanceWidget) {
        // Remove the instance widget if it exists
        const idx = this.widgets.indexOf(this.instanceWidget);
        if (idx !== -1) {
          this.widgets.splice(idx, 1);
          this.size[1] -= 30;
        }
        this.instanceWidget = null;
      }
      this.valueWidget.value = this.properties.value;
      this.valueWidget.options = { disabled: false };
    } else if (deviceType === "custom") {
      // Custom device: keep or set to empty
      this.properties.value = this.valueWidget.value || "";
      this.valueWidget.options = { disabled: false };
    }
    this.setDirtyCanvas(true);
  }

  /**
   * Helper that applies the TANGO prefix if the user’s stored value
   * does NOT already start with "tango://".
   * It also replaces the prefix's original namespace with what
   * is currently in this.properties.namespace.
   */
  applyPrefixIfNeeded(rawDeviceName) {
    if (!rawDeviceName) return "";

    // If the user typed a complete TANGO name, just return it
    if (rawDeviceName.startsWith("tango://")) {
      return rawDeviceName;
    }

    // Otherwise, reconstruct or replace namespace if needed
    if (!this.trlPrefix) {
      return rawDeviceName; // fallback if /fqdn was not fetched
    }

    // If we successfully parsed an original namespace, replace it
    // Otherwise just use the raw prefix
    if (this.originalNamespace && this.properties.namespace) {
      // Example: "tango://dbhost.tenpointnine.svc.cluster.local:1000/"
      // we replace ".tenpointnine." with ".<user-namespace>."
      const replacedPrefix = this.trlPrefix.replace(
        `.${this.originalNamespace}.`,
        `.${this.properties.namespace}.`
      );
      return replacedPrefix + rawDeviceName;
    } else {
      return this.trlPrefix + rawDeviceName;
    }
  }

  onExecute() {
    // On each frame, output the fully qualified device name if needed
    const finalValue = this.applyPrefixIfNeeded(this.properties.value);
    this.setOutputData(0, finalValue);
  }
}

// Register your node
LiteGraph.registerNodeType("tango/TangoDevNames", TangoDevNamesNode);




class Waiter extends LGraphNode {
  constructor() {
      super();
      this.title = "Waiter";

      // Add a "Start" button
      this.startButton = this.addWidget(
          "button",
          "Start",
          null,
          () => this.startTimer(),
          {}
      );

      // Internal state
      this.timerActive = false;
      this.elapsedTime = 0; // Time passed in seconds
      this.maxTime = 30;    // Time to complete one cycle
      this.lastUpdateTime = 0; // For tracking time updates

      // Input for external start events
      this.addInput("start_event", LiteGraph.ACTION);

      // Output for tick events every second
      this.addOutput("tick", LiteGraph.EVENT);

      // Set default size
      this.size = [200, 100];
  }

  // Method to start the timer
  startTimer() {
      if (!this.timerActive) {
          this.timerActive = true;
          this.elapsedTime = 0;
          this.lastUpdateTime = performance.now();
      }
  }

  // Method to reset the timer
  resetTimer() {
      this.timerActive = false;
      this.elapsedTime = 0;
  }

  // Handle external start events
  onAction(action, param) {
      if (action === "start_event") {
          this.startTimer();
      }
  }

  // Draw the speedometer UI
  onDrawBackground(ctx) {
      const cx = this.size[0] / 2; // Center x
      const cy = this.size[1] / 2; // Center y
      const radius = 40;           // Radius of the speedometer
      const needleAngle = (Math.PI * 2 * this.elapsedTime) / this.maxTime;

      // Draw the speedometer circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw the needle
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(needleAngle - Math.PI / 2), cy + radius * Math.sin(needleAngle - Math.PI / 2));
      ctx.strokeStyle = "#f00";
      ctx.lineWidth = 3;
      ctx.stroke();
  }

  // Execute method called each frame
  onExecute() {
      if (this.timerActive) {
          const currentTime = performance.now();
          const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert ms to seconds
          this.lastUpdateTime = currentTime;

          this.elapsedTime += deltaTime;

          // Trigger tick output every second
          if (Math.floor(this.elapsedTime) > Math.floor(this.elapsedTime - deltaTime)) {
              this.triggerSlot(0); // Emit tick event
          }

          // Stop the timer when max time is reached
          if (this.elapsedTime >= this.maxTime) {
              this.resetTimer();
          }

          // Request a redraw
          this.setDirtyCanvas(true);
      }
  }
}

// Register the node class with Litegraph
LiteGraph.registerNodeType("tango/waiter", Waiter);

  