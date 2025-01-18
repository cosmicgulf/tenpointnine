class ExecutePythonNode extends LGraphNode {
  constructor() {
      super();
      
      // Because sometimes we forget to define properties, let's set them up now.
      this.properties = this.properties || {};
      this.properties.code = this.properties.code || "def method1(a):\n    return a";
      
      // Let's ensure we have our inputs and outputs set up properly,
      // but only if they don't already exist (to avoid messing up deserialization).
      if (!this.inputs || this.inputs.length === 0) {
          this.addInput("Trigger", LiteGraph.ACTION);
          this.updateInputs(); // Only call if inputs don't exist
      }
      
      // Output side: we just create one output by default, "Output".
      if (!this.outputs || this.outputs.length === 0) {
          this.addOutput("Output", "string");
      }
      
      // Silly comment: sometimes I'm too lazy to write comments, but hey, we need them.
      // Let's also add the widgets for opening the editor, triggering execution, and viewing output.
      if (!this.widgets || this.widgets.length === 0) {
          this.addWidget("button", "Open Editor", null, () => this.openEditor());
          this.addWidget("button", "Trigger", null, () => this.triggerExecution());
          this.addWidget("button", "Output", null, () => this.openOutput());
      }
      
      // Some random silly comment: I woke up this morning and had a waffle. 
      this.size = [200, 140];
      this.title = "Execute Python";
      this.desc = "Executes Python code via API";
      
      // Internal states to manage the open/close of modals.
      this.editorVisible = false;
      this.outputVisible = false;
      this.output = "";
      this.loading = false;
  }

  // This function updates the inputs by parsing the arguments in the Python code.
  updateInputs() {
      // "Silly comment #2: I like pineapples on pizza. Or do I?" 
      // We'll parse the function with a regex that allows for more than single character arguments.
      const match = this.properties.code.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
      if (match) {
          const [_, functionName, args] = match;
          const argNames = args.split(",").map(arg => arg.trim()).filter(Boolean);

          // We'll gather existing inputs (excluding the first one, 'Trigger').
          const existingInputs = {};
          for (let i = 1; i < this.inputs.length; i++) {
              const input = this.inputs[i];
              existingInputs[input.name] = i;
          }

          // We always keep "Trigger".
          const inputsToKeep = ["Trigger"];

          // Go through each argument name in the function signature.
          argNames.forEach((argName, idx) => {
              if (existingInputs.hasOwnProperty(argName)) {
                  // If we already have this input name, just keep it.
                  inputsToKeep.push(argName);
              } else {
                  // Let's see if there's an existing input at this index that we can rename.
                  const inputIndex = idx + 1; // +1 to skip "Trigger".
                  if (this.inputs[inputIndex]) {
                      const oldName = this.inputs[inputIndex].name;
                      this.renameInput(oldName, argName);
                      inputsToKeep.push(argName);
                  } else {
                      // If there's no input at that index, we create a new input for it.
                      this.addInput(argName);
                      inputsToKeep.push(argName);
                  }
              }
          });

          // Now we remove any inputs that aren't in our list to keep.
          for (let i = this.inputs.length - 1; i >= 1; i--) {
              const inputName = this.inputs[i].name;
              if (!inputsToKeep.includes(inputName)) {
                  this.removeInput(i);
              }
          }
      }
  }

  // We'll override configure to restore Python code from JSON, 
  // but avoid calling updateInputs() during deserialization to prevent messing up existing inputs.
  configure(data) {
      super.configure(data);
      if (data.properties && data.properties.code) {
          this.properties.code = data.properties.code;
          // Not calling updateInputs() here to avoid messing with the inputs on load.
      }
  }

  // We'll override serialize so that Python code is included in the JSON data.
  serialize() {
      const data = super.serialize();
      data.properties = data.properties || {};
      data.properties.code = this.properties?.code || "";
      return data;
  }

  // Little silly note: "I once tried to run Java code in a Python executor. It didn't go well."
  // This method shows the popup editor for Python code.
  openEditor() {
      if (this.editorVisible) return;
      this.editorVisible = true;

      const backdrop = document.createElement('div');
      backdrop.id = `python-editor-backdrop-${this.id}`;
      backdrop.style.position = 'fixed';
      backdrop.style.top = '0';
      backdrop.style.left = '0';
      backdrop.style.width = '100%';
      backdrop.style.height = '100%';
      backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
      backdrop.style.zIndex = 999;
      backdrop.onclick = () => this.closeEditor(backdrop, modal);

      const modal = document.createElement('div');
      modal.id = `python-editor-modal-${this.id}`;
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.backgroundColor = '#f0f0f0';
      modal.style.border = '1px solid #ccc';
      modal.style.padding = '20px';
      modal.style.zIndex = 1000;
      modal.style.width = '500px';
      modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

      const textarea = document.createElement('textarea');
      textarea.value = this.properties.code;
      textarea.style.width = '100%';
      textarea.style.height = '300px';
      textarea.style.fontFamily = 'monospace';
      textarea.style.fontSize = '14px';

      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.marginTop = '10px';
      buttonsContainer.style.textAlign = 'right';

      const saveButton = document.createElement('button');
      saveButton.innerText = 'Save';
      saveButton.style.marginRight = '10px';
      saveButton.onclick = () => {
          this.properties.code = textarea.value;
          this.updateInputs();
          this.closeEditor(backdrop, modal);
      };

      const cancelButton = document.createElement('button');
      cancelButton.innerText = 'Cancel';
      cancelButton.onclick = () => this.closeEditor(backdrop, modal);

      buttonsContainer.appendChild(saveButton);
      buttonsContainer.appendChild(cancelButton);
      modal.appendChild(textarea);
      modal.appendChild(buttonsContainer);

      modal.onclick = (e) => e.stopPropagation();
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
  }

  // This closes the code editor if open.
  closeEditor(backdrop, modal) {
      this.editorVisible = false;
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      this.setDirtyCanvas(true);
  }

  // Silly comment: "Alright, let's do the actual magic: we trigger the Python code execution!"
  async triggerExecution() {
      const code = this.properties.code;
      if (!code) {
          this.output = "No code to execute.";
          this.setOutputData(0, this.output);
          this.setDirtyCanvas(true);
          return;
      }

      // We'll gather all the input data (skipping the 'Trigger' input).
      const args = [];
      for (let i = 1; i < this.inputs.length; i++) {
          const inputValue = this.getInputData(i);
          args.push(inputValue);
      }

      this.loading = true;
      this.setDirtyCanvas(true);

      try {
          // Make a POST request to our server, sending the code plus arguments.
          const response = await fetch('/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, args })
          });

          if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
          const data = await response.json();
          this.output = data.output; // capture the returned output from the server
      } catch (error) {
          // Another silly comment: "Whoops, we made an oopsie in the code or server."
          this.output = `Error: ${error.message}`;
      }

      this.loading = false;
      // We'll pass our output to the node output slot so other nodes can use it.
      this.setOutputData(0, this.output);
      this.setDirtyCanvas(true);
  }

  // We'll open a modal showing the output from our Python code.
  openOutput() {
      if (this.outputVisible) return;
      this.outputVisible = true;

      const backdrop = document.createElement('div');
      backdrop.id = `output-backdrop-${this.id}`;
      backdrop.style.position = 'fixed';
      backdrop.style.top = '0';
      backdrop.style.left = '0';
      backdrop.style.width = '100%';
      backdrop.style.height = '100%';
      backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
      backdrop.style.zIndex = 999;
      backdrop.onclick = () => this.closeOutput(backdrop, modal);

      const modal = document.createElement('div');
      modal.id = `output-modal-${this.id}`;
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.backgroundColor = '#f0f0f0';
      modal.style.border = '1px solid #ccc';
      modal.style.padding = '20px';
      modal.style.zIndex = 1000;
      modal.style.width = '500px';
      modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordWrap = 'break-word';
      pre.style.maxHeight = '400px';
      pre.style.overflowY = 'auto';
      pre.textContent = this.output || "No output available.";

      const closeButton = document.createElement('button');
      closeButton.innerText = 'Close';
      closeButton.style.marginTop = '10px';
      closeButton.onclick = () => this.closeOutput(backdrop, modal);

      modal.appendChild(pre);
      modal.appendChild(closeButton);

      modal.onclick = (e) => e.stopPropagation();
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
  }

  // Closing the output modal.
  closeOutput(backdrop, modal) {
      this.outputVisible = false;
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  }

  // This is how the node responds when it receives an "action", like "Trigger".
  onAction(action, param) {
      if (action === "Trigger") {
          this.triggerExecution();
      }
  }

  // We'll draw some small text in the corner if it's executing, or if we have output.
  onDrawForeground(ctx) {
      if (this.loading) {
          ctx.font = "12px Arial";
          ctx.fillStyle = "#000";
          ctx.fillText(`Executing...`, 10, this.size[1] - 30);
          return;
      }

      if (this.output) {
          ctx.font = "12px Arial";
          ctx.fillStyle = "#000";
          const displayText = this.output.length > 50 ? this.output.substring(0, 47) + '...' : this.output;
          ctx.fillText(`Output: ${displayText}`, 10, this.size[1] - 10);
      }
  }

  // This little helper function is for renaming inputs, so we don't get errors.
  renameInput(oldName, newName) {
      // Yes, I'm aware that sometimes you rename a rose by any other name, it still smells as sweet.
      // But we need to rename it anyway.
      const index = this.findInputSlot(oldName);
      if (index === -1) return;
      this.inputs[index].name = newName;
  }
}

// Registering the node with LiteGraph (the path can be anything you want).
LiteGraph.registerNodeType("custom/execute_python", ExecutePythonNode);
