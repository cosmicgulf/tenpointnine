class DifferentiationNode extends LGraphNode {
    constructor() {
        super();
        this.addInput("f(x)", "string");    // Input is a string representation of the function
        this.addOutput("f'(x)", "string");  // Output is the derivative as a string
        this.title = "Symbolic Differentiation";
    }
  
    onExecute() {
        // const math = require('mathjs'); // Ensure math.js is available
        const fx = this.getInputData(0); // Get the input function as a string
  
        if (typeof fx !== 'string') {
            this.setOutputData(0, "Invalid input");
            return;
        }
  
        try {
            // Replace implied multiplication like 'x(x-1)' with 'x*(x-1)'
            // const sanitizedFx = fx.replace(/([a-zA-Z0-9])\(/g, "$1*(");
  
            // Parse the input function
            const parsedFunction = math.parse(fx);  
  
            // Compute its symbolic derivative
            const derivative = math.derivative(parsedFunction, 'x');  
  
            // Convert the symbolic derivative back to a string
            const derivativeString = derivative.toString();
  
            // Set the output to the derivative string
            this.setOutputData(0, math.simplify(derivativeString));
            
        } catch (error) {
            console.error("Error during symbolic differentiation:", error);
            this.setOutputData(0, "Error");
        }
    }
  }

  class IntVariableNode extends LGraphNode {
    constructor() {
        super();
        this.addInput("Value", "number");      // Input of type number (integer)
        this.addOutput("Int Value", "number"); // Output as a number (integer)
        this.title = "Integer Variable";

        // Initializing default properties
        this.properties = { 
            name: "varName", // Default variable name
            value: 0         // Default integer value
        };

        // Add the Number widget for setting the integer value
        this.addWidget(
            "number",                    // Widget type
            "Set Int",                   // Widget name
            this.properties.value,       // Default value
            (v) => {                     // Callback when value changes
                // Ensure the value is an integer before setting
                if (Number.isInteger(v)) {
                    this.properties.value = v;
                } else {
                    // Optionally, provide feedback for invalid input
                    console.warn("Please enter an integer value.");
                }
                this.setDirtyCanvas(true); // Update canvas when value changes
            }
        );

        // Add the Text widget for setting the variable name
        this.addWidget(
            "text",                     // Widget type
            "Variable Name",            // Widget name
            this.properties.name,       // Default value
            (v) => {                     // Callback when value changes
                // Validate the name (e.g., non-empty string)
                if (typeof v === "string" && v.trim() !== "") {
                    this.properties.name = v.trim();
                    // Optionally, update the node's title to reflect the variable name
                    this.title = `Int Var: ${this.properties.name}`;
                } else {
                    // Optionally, provide feedback for invalid input
                    console.warn("Variable name must be a non-empty string.");
                }
                this.setDirtyCanvas(true); // Update canvas when name changes
            }
        );
    }

    onExecute() {
        // Get the input value
        const inputValue = this.getInputData(0);

        // If input is not defined or not an integer, use the default value from properties
        const intValue = (typeof inputValue === "number" && Number.isInteger(inputValue))
            ? inputValue
            : this.properties.value;

        // Set the output as the integer value
        this.setOutputData(0, intValue);
    }

    onPropertyChanged(name, value) {
        if (name === "value") {
            // Validate that the new value is an integer
            this.properties.value = Number.isInteger(value) ? value : this.properties.value;
        } else if (name === "name") {
            // Validate that the new name is a non-empty string
            if (typeof value === "string" && value.trim() !== "") {
                this.properties.name = value.trim();
                // Optionally, update the node's title to reflect the variable name
                this.title = `Int Var: ${this.properties.name}`;
            } else {
                // Revert to previous name or set a default
                console.warn("Variable name must be a non-empty string.");
                this.properties.name = this.properties.name || "varName";
            }
        }
    }

    // Optional: Custom drawing logic if needed
    onDrawBackground(ctx) {
        if (this.flags.collapsed) return;

        // Example: Draw a background or additional visuals
        // ctx.fillStyle = "#EFEFEF";
        // ctx.fillRect(0, 0, this.size[0], this.size[1]);
    }
}
class StringVariableNode extends LGraphNode {
    constructor() {
        super();
        this.addInput("Value", "string");       // Input of type string
        this.addOutput("String Value", "string"); // Output as a string
        this.title = "String Variable";

        // Initializing default properties
        this.properties = { 
            name: "varName", // Default variable name
            value: ""        // Default string value
        };

        // Add the Text widget for setting the string value
        this.addWidget(
            "text",                    // Widget type
            "Set String",              // Widget name
            this.properties.value,     // Default value
            (v) => {                   // Callback when value changes
                // Ensure the value is a string before setting
                if (typeof v === "string") {
                    this.properties.value = v;
                } else {
                    // Optionally, provide feedback for invalid input
                    console.warn("Please enter a string value.");
                }
                this.setDirtyCanvas(true); // Update canvas when value changes
            }
        );

        // Add the Text widget for setting the variable name
        this.addWidget(
            "text",                     // Widget type
            "Variable Name",            // Widget name
            this.properties.name,       // Default value
            (v) => {                    // Callback when value changes
                // Validate the name (e.g., non-empty string)
                if (typeof v === "string" && v.trim() !== "") {
                    this.properties.name = v.trim();
                    // Optionally, update the node's title to reflect the variable name
                    this.title = `Str Var: ${this.properties.name}`;
                } else {
                    // Optionally, provide feedback for invalid input
                    console.warn("Variable name must be a non-empty string.");
                }
                this.setDirtyCanvas(true); // Update canvas when name changes
            }
        );
    }

    onExecute() {
        // Get the input value
        const inputValue = this.getInputData(0);

        // If input is not defined or not a string, use the default value from properties
        const strValue = (typeof inputValue === "string")
            ? inputValue
            : this.properties.value;

        // Set the output as the string value
        this.setOutputData(0, strValue);
    }

    onPropertyChanged(name, value) {
        if (name === "value") {
            // Ensure the value is a string
            this.properties.value = (typeof value === "string") ? value : this.properties.value;
        } else if (name === "name") {
            // Validate that the new name is a non-empty string
            if (typeof value === "string" && value.trim() !== "") {
                this.properties.name = value.trim();
                // Optionally, update the node's title to reflect the variable name
                this.title = `Str Var: ${this.properties.name}`;
            } else {
                // Revert to previous name or set a default
                console.warn("Variable name must be a non-empty string.");
                this.properties.name = this.properties.name || "varName";
            }
        }
    }

    // Optional: Custom drawing logic if needed
    onDrawBackground(ctx) {
        if (this.flags.collapsed) return;

        // Example: Draw a background or additional visuals
        // ctx.fillStyle = "#EFEFEF";
        // ctx.fillRect(0, 0, this.size[0], this.size[1]);
    }
}

LiteGraph.registerNodeType("datatype/string", StringVariableNode);
LiteGraph.registerNodeType("datatype/int",IntVariableNode );
LiteGraph.registerNodeType("math/differentiationnode", DifferentiationNode);
