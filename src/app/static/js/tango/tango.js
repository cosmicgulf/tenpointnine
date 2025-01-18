class TangoDevNamesNode extends LGraphNode {
  constructor() {
    super();
    this.title = "Tango Dev Names";
    this.desc = "Select Tango Device Names";
    this.size = [300, 100]; // Increased width for better display

    // Initialize properties
    this.addProperty(
      "devices_json",
      JSON.stringify(
        {
          cspmasterleafnodes: "tango://tango-databaseds.ska-tmc-cspleafnodes.svc.cluster.local:10000/ska_mid/tm_leaf_node/csp_master",
          cspcontroller: "tango://tango-databaseds.ska-tmc-cspleafnodes.svc.cluster.local:10000/mid-csp/control/0",
          cspsubarray: ["tango://tango-databaseds.ska-tmc-cspleafnodes.svc.cluster.local:10000/mid-csp/subarray/01"],
          cspsubarrayleafnodes: ["tango://tango-databaseds.ska-tmc-cspleafnodes.svc.cluster.local:10000/ska_mid/tm_leaf_node/csp_subarray01"],
          custom: ""
        },
        null,
        2
      ),
      "string"
    );
    this.addProperty("selected_device_type","Select Device", "string");
    this.addProperty("selected_instance_index", 0, "number");
    this.addProperty("value", "", "string");

    // Parse devices_json
    this.updateDevices();

    // Widgets
    this.widgets_up = true;
    this.deviceTypeWidget = this.addWidget(
      "combo",
      "Device Type",
      this.properties.selected_device_type,
      this.onDeviceTypeChanged.bind(this),
      { values: Object.keys(this.devices) }
    );

    this.instanceWidget = null;
    this.valueWidget = this.addWidget(
      "text",
      "Value",
      this.properties.value,
      this.onValueChanged.bind(this)
    );

    // Output Port
    this.addOutput("value", "string");

    // Initialize value
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
      // Update device type widget
      this.deviceTypeWidget.options.values = Object.keys(this.devices);
      this.setDirtyCanvas(true);
      // Update selected_device_type if necessary
      if (!this.devices.hasOwnProperty(this.properties.selected_device_type)) {
        this.properties.selected_device_type =
          Object.keys(this.devices)[0] || "";
      }
      this.deviceTypeWidget.value = this.properties.selected_device_type;
      this.updateValue();
    }
  }

  onDeviceTypeChanged(v) {
    this.properties.selected_device_type = v;
    this.properties.selected_instance_index = 0; // Reset instance index
    if (this.instanceWidget) {
      // Remove instance widget if it exists
      const index = this.widgets.indexOf(this.instanceWidget);
      if (index !== -1) {
        this.widgets.splice(index, 1);
        this.size[1] -= 30; // Adjust size
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

    // Update the devices object for subarray and central_node
    if (deviceType === "custom") {
      // Custom device: no changes to devices object
      this.devices["custom"] = v;
    } else if (Array.isArray(this.devices[deviceType])) {
      // Subarray: Update the selected instance value
      const idx = this.properties.selected_instance_index;
      this.devices[deviceType][idx] = v;
    } else {
      // Central node or other single-device types
      this.devices[deviceType] = v;
    }

    // Sync devices_json property
    this.properties.devices_json = JSON.stringify(this.devices, null, 2);
  }

  updateValue() {
    const devices = this.devices;
    const deviceType = this.properties.selected_device_type;
    const deviceValue = devices[deviceType];

    if (Array.isArray(deviceValue)) {
      // It's a list of devices
      const instances = deviceValue;
      if (!this.instanceWidget) {
        // Add instance widget
        const instanceNames = instances.map((_, index) => index.toString());
        this.instanceWidget = this.addWidget(
          "combo",
          "Instance",
          this.properties.selected_instance_index.toString(),
          this.onInstanceChanged.bind(this),
          { values: instanceNames }
        );
        this.size[1] += 30; // Adjust size
      } else {
        // Update instance widget values
        this.instanceWidget.options.values = instances.map((_, index) =>
          index.toString()
        );
      }
      const idx = this.properties.selected_instance_index;
      this.properties.value = instances[idx];
      this.valueWidget.value = this.properties.value;
      this.valueWidget.options = { disabled: false }; // Editable
    } else if (typeof deviceValue === "string") {
      // It's a single device
      this.properties.value = deviceValue;
      if (this.instanceWidget) {
        // Remove instance widget
        const index = this.widgets.indexOf(this.instanceWidget);
        if (index !== -1) {
          this.widgets.splice(index, 1);
          this.size[1] -= 30; // Adjust size
        }
        this.instanceWidget = null;
      }
      this.valueWidget.value = this.properties.value;
      this.valueWidget.options = { disabled: false }; // Editable
    } else if (deviceType === "custom") {
      this.properties.value = this.valueWidget.value || "";
      this.valueWidget.options = { disabled: false }; // Editable
    }
    this.setDirtyCanvas(true);
  }

  onExecute() {
    // Output the current value
    this.setOutputData(0, this.properties.value);
  }
}



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

  