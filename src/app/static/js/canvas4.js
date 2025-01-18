class StorageNode extends LGraphNode {
  constructor() {
    super();

    this.addInput("Input", 0);  // Input to append new data
    this.addOutput("Stored List", 0);  // Output the stored list of values

    this.title = "Storage Node";
    this.size = [180, 150];
    this.margin = 5;

    // Property to hold the stored list of values
    this.storedList = [];

    // Button to clear stored values
    this.clearButton = {
      width: 100,
      height: 30,
      x: 40,
      y: this.size[1] - 60,
      color: "#FF5252",
      hoverColor: "#FF7575",
      clickColor: "white",
    };

    // Button to view stored data
    this.viewButton = {
      width: 100,
      height: 30,
      x: 40,
      y: this.size[1] - 30,
      color: "#4CAF50",
      hoverColor: "#66BB6A",
      clickColor: "white",
    };

    this.mouseOverClearButton = false;
    this.mouseOverViewButton = false;
    this.clickedClear = false;
    this.clickedView = false;
  }

  onExecute() {
    // Get the input data
    let inputValue = this.getInputData(0);

    // If input is provided, append it to the stored list
    if (inputValue !== undefined && inputValue !== null) {
      this.storedList.push(inputValue);  // Append to the list
    }

    // Output the stored list of values
    this.setOutputData(0, this.storedList);
  }

  onDrawBackground(ctx) {
    if (this.flags.collapsed) {
      return;
    }

    // Draw background
    ctx.fillStyle = "black";
    ctx.fillRect(1, 1, this.size[0] - 2, this.size[1] - 2);

    ctx.fillStyle = "#AAF";
    ctx.fillRect(0, 0, this.size[0] - 2, this.size[1] - 2);

    // Update button positions
    this.updateButtonPositions();

    // Draw buttons
    this.drawButton(ctx, this.clearButton, this.mouseOverClearButton, this.clickedClear, "Clear Storage");
    this.drawButton(ctx, this.viewButton, this.mouseOverViewButton, this.clickedView, "View Data");
  }

  updateButtonPositions() {
    // Position the buttons 30px and 60px from the bottom
    this.clearButton.y = this.size[1] - 60;
    this.viewButton.y = this.size[1] - 30;
  }

  drawButton(ctx, button, isMouseOver, isClicked, label) {
    const buttonColor = isClicked
      ? button.clickColor
      : isMouseOver
      ? button.hoverColor
      : button.color;

    ctx.fillStyle = buttonColor;
    ctx.fillRect(button.x, button.y, button.width, button.height);

    // Draw button text
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.fillText(label, button.x + 10, button.y + 20);
  }

  onMouseMove(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    // Check if mouse is over the clear button
    this.mouseOverClearButton = this.isPointInButton(canvasX, canvasY, this.clearButton);
    this.mouseOverViewButton = this.isPointInButton(canvasX, canvasY, this.viewButton);

    this.clickedClear = false;
    this.clickedView = false;
  }

  onMouseDown(e) {
    const canvasX = e.canvasX;
    const canvasY = e.canvasY;

    if (this.isPointInButton(canvasX, canvasY, this.clearButton)) {
      this.clickedClear = true;
      this.clearStorage();  // Clear the storage when clear button is clicked
    } else if (this.isPointInButton(canvasX, canvasY, this.viewButton)) {
      this.clickedView = true;
      this.viewStorage();  // View the storage when view button is clicked
    } else {
      this.clickedClear = false;
      this.clickedView = false;
    }
  }

  clearStorage() {
    this.storedList = [];  // Reset stored list
    console.log("Storage cleared!");
    this.setDirtyCanvas(true);  // Refresh canvas
  }

  viewStorage() {
    console.log("Stored Data: ", this.storedList);  // Output the stored data to the console
    this.setDirtyCanvas(true);  // Refresh canvas if necessary
  }

  isPointInButton(x, y, button) {
    const nodeX = this.pos[0] || 0;  // Node's X position on canvas
    const nodeY = this.pos[1] || 0;  // Node's Y position on canvas

    return (
      x >= nodeX + button.x &&
      x <= nodeX + button.x + button.width &&
      y >= nodeY + button.y &&
      y <= nodeY + button.y + button.height
    );
  }

  // Serialize and deserialize the stored list
  onSerialize(obj) {
    obj.storedList = this.storedList;
  }

  onDeserialize(obj) {
    this.storedList = obj.storedList || [];
  }
}




  
  LiteGraph.registerNodeType("repeater/d", StorageNode);