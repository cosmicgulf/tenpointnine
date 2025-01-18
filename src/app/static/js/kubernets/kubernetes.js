class NamespaceNode extends LGraphNode {
  constructor() {
    super();
    this.title = "Namespace";
    this.properties = { namespace: "" };

    // Add a text widget for namespace input
    this.namespaceWidget = this.addWidget("text", "Namespace Name", "", (value) => {
      this.properties.namespace = value;
      this.generatePods();
    });

    // Add a button to remove all pods
    this.addWidget("button", "Remove All Pods", null, () => {
      this.removeAllPods();
    });

    // Initialize an array to store pod nodes
    this.podNodes = [];
  }

  generatePods() {
    const { namespace } = this.properties;
    if (!namespace) return;

    // Remove existing pods before generating new ones
    this.removeAllPods();

    // Fetch pods from the server
    fetch(`/pods/${namespace}`)
      .then((response) => response.json())
      .then((data) => {
        const pods = data.pods;
        if (!pods || pods.length === 0) return;

        const podCount = pods.length;

        // Get NamespaceNode position
        const [startX, startY] = this.pos;

        // Define grid parameters
        const columns = Math.ceil(Math.sqrt(podCount)); // Number of columns
        const rows = Math.ceil(podCount / columns);     // Number of rows
        const horizontalSpacing = 220; // Horizontal distance between pods
        const verticalSpacing = 150;   // Vertical distance between pods

        // Calculate starting position to place the grid below the NamespaceNode
        const offsetX = startX - ((columns - 1) * horizontalSpacing) / 2;
        const offsetY = startY + 100; // 100 pixels below the NamespaceNode

        pods.forEach((podName, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;

          const x = offsetX + col * horizontalSpacing;
          const y = offsetY + row * verticalSpacing;

          const podNode = new PodNode(namespace, podName);
          podNode.pos = [x, y];
          this.graph.add(podNode);
          this.podNodes.push(podNode);
        });
      })
      .catch((error) => {
        console.error('Error fetching pods:', error);
      });
  }

  /**
   * Remove all PodNodes from the graph and clear the podNodes array.
   */
  removeAllPods() {
    if (this.podNodes.length > 0) {
      this.podNodes.forEach((node) => {
        this.graph.remove(node);
      });
      this.podNodes = [];
    }
  }

  // Serialize the node state
  serialize() {
    const baseData = super.serialize();
    baseData.properties = this.properties;
    return baseData;
  }

  // Deserialize the node state
  configure(config) {
    super.configure(config);
    this.properties = config.properties || this.properties;

    // Update the widget's displayed value
    if (this.namespaceWidget) {
      this.namespaceWidget.value = this.properties.namespace;
    }
  }
}

// Register the NamespaceNode
LiteGraph.registerNodeType("kubernetes/namespace", NamespaceNode);

  
  class PodNode extends LGraphNode {
    constructor(namespace, podName) {
      super();
      this.title = podName;
      this.namespace = namespace;
      this.podName = podName;
      this.logsInterval = null;
  
      // Existing widgets
      this.addWidget("button", "View Logs", null, () => {
        this.viewLogs();
      });
  
      this.addWidget("button", "Pod Info", null, () => {
        this.viewPodInfo();
      });
  
      this.addWidget("button", "Describe", null, () => {
        this.describePod();
      });
  
      this.addWidget("button", "Execute", null, () => {
        this.executeCommand();
      });
  
      // Add "Delete" button
      this.addWidget("button", "Delete", null, () => {
        this.deletePod();
      });
  
      // Add input port for delete action
      this.addInput("Delete", LiteGraph.ACTION);
    }
  
    // Existing methods...
  
    deletePod() {
      const { namespace, podName } = this;
      fetch(`/delete_pod/${namespace}/${podName}`, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then((data) => {
          if (response.ok) {
            // Remove this node from the graph
            this.graph.remove(this);
    
            // Update the NamespaceNode's podNodes array
            const namespaceNode = this.graph.findNodesByType("kubernetes/namespace")[0];
            if (namespaceNode && namespaceNode.podNodes) {
              namespaceNode.podNodes = namespaceNode.podNodes.filter((node) => node !== this);
            }
    
            console.log(`Pod ${podName} deleted from namespace ${namespace} and graph.`);
          } else {
            console.error('Failed to delete pod:', data.error);
          }
        })
        .catch((error) => {
          console.error('Error deleting pod:', error);
        });
    }
    
    
  
    onAction(action, param) {
      if (action === 'Delete') {
        this.deletePod();
      }
    }
    
      
    
      executeCommand() {
        const { namespace, podName } = this;
        const executeUrl = `/execute_command/${namespace}/${podName}`;
        window.open(executeUrl, `${podName} Execute Command`, "width=800,height=600");
      }
  
    viewLogs() {
      const { namespace, podName } = this;
      const logWindow = window.open("", `${podName} Logs`, "width=800,height=600");
      logWindow.document.title = `${podName} Logs`;
      logWindow.document.body.innerHTML = `<pre id="logs">Fetching logs...</pre>`;
  
      const fetchLogs = () => {
        fetch(`/logs/${namespace}/${podName}`)
          .then((response) => response.json())
          .then((data) => {
            const logsElement = logWindow.document.getElementById("logs");
            logsElement.textContent = data.logs;
          })
          .catch((error) => {
            console.error('Error fetching logs:', error);
          });
      };
  
      // Initial fetch
      fetchLogs();
  
      // Set interval to update logs every 2 seconds
      this.logsInterval = setInterval(fetchLogs, 2000);
  
      // Clear interval when the window is closed
      const checkWindowClosed = setInterval(() => {
        if (logWindow.closed) {
          clearInterval(this.logsInterval);
          clearInterval(checkWindowClosed);
        }
      }, 1000);
    }
  
    viewPodInfo() {
        const { namespace, podName } = this;
        const infoWindow = window.open("", `${podName} Info`, "width=800,height=600");
        infoWindow.document.title = `${podName} Info`;
        infoWindow.document.body.innerHTML = `<pre id="info">Fetching pod info...</pre>`;
    
        fetch(`/pod_info/${namespace}/${podName}`)
          .then((response) => response.json())
          .then((data) => {
            const infoElement = infoWindow.document.getElementById("info");
            // data.info is already a JSON object
            infoElement.textContent = JSON.stringify(data.info, null, 2);
          })
          .catch((error) => {
            console.error('Error fetching pod info:', error);
            const infoElement = infoWindow.document.getElementById("info");
            infoElement.textContent = `Error fetching pod info: ${error}`;
          });
      }
  
    describePod() {
      const { namespace, podName } = this;
      const describeWindow = window.open("", `${podName} Description`, "width=800,height=600");
      describeWindow.document.title = `${podName} Description`;
      describeWindow.document.body.innerHTML = `<pre id="description">Fetching pod description...</pre>`;
  
      fetch(`/describe_pod/${namespace}/${podName}`)
        .then((response) => response.json())
        .then((data) => {
          const descriptionElement = describeWindow.document.getElementById("description");
          descriptionElement.textContent = data.description;
        })
        .catch((error) => {
          console.error('Error fetching pod description:', error);
        });
    }
  
    // Serialize the node state
    serialize() {
      const baseData = super.serialize();
      baseData.namespace = this.namespace;
      baseData.podName = this.podName;
      return baseData;
    }
  
    // Deserialize the node state
    configure(config) {
      super.configure(config);
      this.namespace = config.namespace;
      this.podName = config.podName;
    }
  }
  
  // Register the PodNode
  LiteGraph.registerNodeType("kubernetes/pod", PodNode);
  

  LiteGraph.registerNodeType("kubernetes/namespace", NamespaceNode);
  