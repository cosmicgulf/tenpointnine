class ScriptLoaderNode extends LGraphNode {
    // Use a global Set to track loaded scripts across all instances
    static loadedScripts = new Set();

    constructor() {
        super();
        this.title = "Script Loader";

        // Property to store the script URL
        this.properties = { scriptUrl: "static/js/canvas2.js" };

        // Add a text widget to allow users to specify the script URL
        this.addWidget("text", "Script URL", this.properties.scriptUrl, (v) => {
            this.properties.scriptUrl = v.trim();
            this.loadScript(this.properties.scriptUrl);
        });

        // No inputs or outputs needed
    }

    onAdded() {
        // Load the script when the node is added to the graph
        this.loadScript(this.properties.scriptUrl);
    }

    loadScript(url) {
        // If the script is already loaded, skip loading
        if (ScriptLoaderNode.loadedScripts.has(url)) {
            console.log(`Script already loaded: ${url}`);
            return;
        }

        // Create a script element
        const script = document.createElement("script");
        script.src = url;
        script.type = "text/javascript";

        // Define onload and onerror handlers
        script.onload = () => {
            console.log(`Successfully loaded script: ${url}`);
            ScriptLoaderNode.loadedScripts.add(url);
        };
        script.onerror = () => {
            console.error(`Failed to load script: ${url}`);
        };

        // Append the script to the document head
        document.head.appendChild(script);
    }

    onExecute() {
        // Remove the loadScript call from onExecute to prevent repeated loading
        // Optionally, you can add logic here if needed for execution
    }
}

// Register the node with LiteGraph
LiteGraph.registerNodeType("utility/script_loader", ScriptLoaderNode);

