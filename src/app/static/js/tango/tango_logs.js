class TangoLogsNode extends LGraphNode {
    constructor() {
      super();
      this.title = "Tango Logs";
      this.logsInterval = null;
  
      // Add "View Logs" button
      this.addWidget("button", "View Logs", null, () => {
        this.viewLogs();
      });
  
      // Add input port for triggering log fetch
      this.addInput("Fetch Logs", LiteGraph.ACTION);
  
      // Add output port to emit logs as an event
      this.addOutput("Logs", "event_logs");
    }
  
    // Method to fetch and display logs in a new window
    viewLogs() {
      const logsWindow = window.open("", "Tango Logs", "width=800,height=600");
      logsWindow.document.title = "Tango Logs";
      logsWindow.document.body.innerHTML = `<pre id="logs">Fetching logs...</pre>`;
  
      const fetchLogs = () => {
        fetch("/module1/event_logs")
          .then((response) => response.json())
          .then((data) => {
            const logsElement = logsWindow.document.getElementById("logs");
            if (logsElement) {
              logsElement.textContent = JSON.stringify(data.event_logs, null, 2);
            }
            this.setOutputData(0, data.event_logs); // Emit logs as an event
          })
          .catch((error) => {
            console.error("Error fetching logs:", error);
          });
      };
  
      // Fetch logs immediately and set up interval for regular updates
      fetchLogs();
  
      this.logsInterval = setInterval(() => {
        if (logsWindow.closed) {
          // Stop fetching if the window is closed
          clearInterval(this.logsInterval);
          this.logsInterval = null;
        } else {
          fetchLogs();
        }
      }, 2000);
    }
  
    // Handle input actions
    onAction(action, param) {
      if (action === "Fetch Logs") {
        this.viewLogs();
      }
    }
  
    // Serialize the node state
    serialize() {
      const baseData = super.serialize();
      return baseData;
    }
  
    // Deserialize the node state
    configure(config) {
      super.configure(config);
    }
  }
  
  // Register the TangoLogsNode
  LiteGraph.registerNodeType("tango/logs", TangoLogsNode);
  