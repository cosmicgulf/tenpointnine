class IsPrimeNode extends LGraphNode {
  constructor() {
    super();
    
    // Define Inputs
    this.addInput("In", LiteGraph.ACTION);   // Input trigger
    this.addInput("Number", "number");       // Number to check

    // Define Event Outputs
    this.addOutput("True Event", LiteGraph.EVENT);    // Trigger if prime
    this.addOutput("False Event", LiteGraph.EVENT);   // Trigger if not prime

    // Define Data Outputs
    this.addOutput("True Number", "number");      // Outputs number if prime
    this.addOutput("False Number", "number");     // Outputs number if not prime

    // Set Node Title
    this.title = "Is Prime";
    
    // Optional: Set a color for better visual identification
    this.color = "#FFCC00";
  }

  /**
   * Method to check if a number is prime.
   * 
   * @param {number} num - The number to check.
   * @returns {boolean} - True if prime, false otherwise.
   */
  isPrime(num) {
    if (typeof num !== "number" || !Number.isInteger(num)) {
      return false; // Non-integer or non-number inputs are not prime
    }
    if (num < 2) return false; // 0 and 1 are not prime numbers
    if (num === 2) return true; // 2 is the only even prime number
    if (num % 2 === 0) return false; // Exclude other even numbers

    const sqrt = Math.sqrt(num);
    for (let i = 3; i <= sqrt; i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  }

  /**
   * This method is called when the node receives an action trigger.
   * It retrieves the input number, checks if it's prime, and triggers
   * the appropriate events and outputs based on the result.
   * 
   * @param {number} action - The action identifier.
   * @param {*} param - Additional parameters (if any).
   */
  onAction(action, param) {
    // Retrieve the input number from the second input (index 1)
    const number = this.getInputData(1);
    
    // If no number is provided, exit the method
    if (number == null) return;

    // Check if the number is prime
    const result = this.isPrime(number);

    if (result) {
      // If prime, trigger the "True Event" and set "True Number"
      this.triggerSlot(0); // "True Event"
      this.setOutputData(2, number); // "True Number"
    } else {
      // If not prime, trigger the "False Event" and set "False Number"
      this.triggerSlot(1); // "False Event"
      this.setOutputData(3, number); // "False Number"
    }
  }

  /**
   * This method is called during the execution step of the graph.
   * It continuously checks the input number and updates the outputs accordingly.
   */
  onExecute() {
    // Retrieve the input number from the second input (index 1)
    const number = this.getInputData(1);
    
    // If no number is provided, set both outputs to null
    if (number == null) {
      this.setOutputData(2, null); // "True Number"
      this.setOutputData(3, null); // "False Number"
      return;
    }

    // Check if the number is prime
    const result = this.isPrime(number);

    if (result) {
      // If prime, set "True Number" and clear "False Number"
      this.setOutputData(2, number); // "True Number"
      this.setOutputData(3, null);   // "False Number"
    } else {
      // If not prime, set "False Number" and clear "True Number"
      this.setOutputData(2, null);   // "True Number"
      this.setOutputData(3, number); // "False Number"
    }
  }

  /**
   * Serializes the node's state. This method is called when saving the graph.
   * 
   * @returns {object} - The serialized state of the node.
   */
  serialize() {
    // Get the base serialization from the parent class
    const data = super.serialize();

    // If you have additional properties, serialize them here
    // For example:
    // data.customProperty = this.customProperty;

    return data;
  }

  /**
   * Deserializes the node's state. This method is called when loading the graph.
   * 
   * @param {object} data - The serialized state of the node.
   */
  deserialize(data) {
    // Call the parent class's deserialization method
    super.deserialize(data);

    // If you have additional properties, deserialize them here
    // For example:
    // this.customProperty = data.customProperty;
  }
}





  class CounterNode extends LGraphNode {
    constructor() {
      super();
      // Define one input to take any data
      this.addInput("Input", "number");
      // Define one output to send the current count of non-null values
      this.addOutput(" Count", "number");
      this.title = "Non-Null Counter";
  
      // Initialize the counter for non-null values
      this.nonNullCounter = 0;
    }
  
    onExecute() {
      // Get input data from the input pin
      const inputData = this.getInputData(0);
  
      // Check if the input is neither null nor undefined
      if (inputData !== null && inputData !== undefined) {
        // Increment the non-null counter if the input is valid (not null)
        this.nonNullCounter += 1;
      }
  
      // Output the current value of the non-null counter
      this.setOutputData(0, this.nonNullCounter);
    }
  }
  class EventWatchNode extends LGraphNode {
    constructor() {
      super();
      this.size = [60, 30];
      this.addInput("event", LiteGraph.EVENT);
      this.count = 0;
      this.title = "Event Watch";
      this.desc = "Counts event triggers";
    }
  
    onAction(action, param) {
      this.count++;
      this.setDirtyCanvas(true); // Refresh the node's display
    }
  
    getTitle() {
      return `${this.title}\nCount: ${this.count}`;
    }
  
    serialize() {
      const data = super.serialize();
      data.count = this.count;
      return data;
    }
  
    deserialize(data) {
      super.deserialize(data);
      this.count = data.count || 0;
    }
  }
  class LessThanOrEqualNode extends LGraphNode {
    constructor() {
      super();
      
      // Define Inputs
      this.addInput("In", LiteGraph.ACTION);          // Input trigger
      this.addInput("A", "number");                   // First number (A)
      this.addInput("B", "number");                   // Second number (B)
  
      // Define Event Outputs
      this.addOutput("True Event", LiteGraph.EVENT);    // Trigger if A <= B
      this.addOutput("False Event", LiteGraph.EVENT);   // Trigger if A > B
  
      // Define Data Outputs
      this.addOutput("True", "boolean");      // Outputs true if A <= B
      this.addOutput("False", "boolean");     // Outputs false if A > B
  
      // Set Node Title
      this.title = "Less Than or Equal";
  
      // Optional: Set a color for better visual identification
      this.color = "#00CCFF";
    }
  
    /**
     * This method is called when the node receives an action trigger.
     * It retrieves the input numbers, compares them, and triggers
     * the appropriate events and outputs based on the result.
     * 
     * @param {number} action - The action identifier.
     * @param {*} param - Additional parameters (if any).
     */
    onAction(action, param) {
      // Retrieve the input numbers from inputs A (index 1) and B (index 2)
      const a = this.getInputData(1);
      const b = this.getInputData(2);
  
      // If either number is not provided, exit the method
      if (a == null || b == null) return;
  
      // Perform the comparison
      const result = a <= b;
  
      if (result) {
        // If A <= B, trigger the "True Event" and set "True" output
        this.triggerSlot(0); // "True Event"
        this.setOutputData(2, true); // "True"
        this.setOutputData(3, false); // "False"
      } else {
        // If A > B, trigger the "False Event" and set "False" output
        this.triggerSlot(1); // "False Event"
        this.setOutputData(2, false); // "True"
        this.setOutputData(3, true); // "False"
      }
    }
  
    /**
     * This method is called during the execution step of the graph.
     * It continuously checks the input numbers and updates the outputs accordingly.
     */
    onExecute() {
      // Retrieve the input numbers from inputs A (index 1) and B (index 2)
      const a = this.getInputData(1);
      const b = this.getInputData(2);
  
      // If either number is not provided, set both outputs to null
      if (a == null || b == null) {
        this.setOutputData(2, null); // "True"
        this.setOutputData(3, null); // "False"
        return;
      }
  
      // Perform the comparison
      const result = a <= b;
  
      if (result) {
        // If A <= B, set "True" to true and "False" to false
        this.setOutputData(2, true);  // "True"
        this.setOutputData(3, false); // "False"
      } else {
        // If A > B, set "True" to false and "False" to true
        this.setOutputData(2, false); // "True"
        this.setOutputData(3, true);  // "False"
      }
    }
  
    /**
     * Serializes the node's state. This method is called when saving the graph.
     * 
     * @returns {object} - The serialized state of the node.
     */
    serialize() {
      // Get the base serialization from the parent class
      const data = super.serialize();
  
      // If you have additional properties, serialize them here
      // For example:
      // data.customProperty = this.customProperty;
  
      return data;
    }
  
    /**
     * Deserializes the node's state. This method is called when loading the graph.
     * 
     * @param {object} data - The serialized state of the node.
     */
    deserialize(data) {
      // Call the parent class's deserialization method
      super.deserialize(data);
  
      // If you have additional properties, deserialize them here
      // For example:
      // this.customProperty = data.customProperty;
    }
  }
  
  // Register the node type with LiteGraph
  LiteGraph.registerNodeType("output/event_watch", EventWatchNode);
  LiteGraph.registerNodeType("condition/less_than_equal", LessThanOrEqualNode);

  

  LiteGraph.registerNodeType("counter/u1",CounterNode);
  
  LiteGraph.registerNodeType("math/u", IsPrimeNode);