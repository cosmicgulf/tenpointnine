class PyTangoDeviceNode extends LGraphNode {
    constructor() {
        super();

        // Initialize properties with default code if not set
        this.properties = this.properties || {};
        // You can put a minimal PyTango device skeleton code here:
        this.properties.code = this.properties.code || 
`# Example PyTango Device

import tango
from tango import DevState, DebugIt
from tango.server import Device, attribute, command

class MyDevice(Device):
    def init_device(self):
        Device.init_device(self)
        self.set_state(DevState.ON)
    
    @attribute(dtype=int)
    def my_attribute(self):
        # Return an integer attribute
        return 42
    
    @command
    def my_command(self):
        print("Command executed on MyDevice")
`;

        // We do not need dynamic input ports, so remove them all if they exist
        // or simply do not create any:
        this.inputs = [];

        // For illustration, keep a single output for status messages
        if (!this.outputs || this.outputs.length === 0) {
            this.addOutput("Status", "string");
        }

        // Add widgets if not already present
        if (!this.widgets || this.widgets.length === 0) {
            this.addWidget("button", "Open Editor", null, () => this.openEditor());
            this.addWidget("button", "Deploy", null, () => this.deployDevice());
            this.addWidget("button", "Deregister", null, () => this.deregisterDevice());
        }

        this.size = [220, 140];
        this.title = "PyTango Device";
        this.desc = "Manage a PyTango device at runtime";

        // Internal state
        this.editorVisible = false;
        this.output = "";
        this.loading = false;
    }

    /**
     * Configure node from JSON
     */
    configure(data) {
        super.configure(data);

        // Restore code from JSON if available
        if (data.properties && data.properties.code) {
            this.properties.code = data.properties.code;
        }
    }

    /**
     * Serialize node to JSON
     */
    serialize() {
        const data = super.serialize();
        data.properties = data.properties || {};
        data.properties.code = this.properties?.code || "";
        return data;
    }

    /**
     * Button Action: Open Editor
     */
    openEditor() {
        if (this.editorVisible) return;
        this.editorVisible = true;

        const backdrop = document.createElement('div');
        backdrop.id = `tango-editor-backdrop-${this.id}`;
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100%';
        backdrop.style.height = '100%';
        backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
        backdrop.style.zIndex = 999;
        backdrop.onclick = () => this.closeEditor(backdrop, modal);

        const modal = document.createElement('div');
        modal.id = `tango-editor-modal-${this.id}`;
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = '#f0f0f0';
        modal.style.border = '1px solid #ccc';
        modal.style.padding = '20px';
        modal.style.zIndex = 1000;
        modal.style.width = '600px';
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

    closeEditor(backdrop, modal) {
        this.editorVisible = false;
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        if (backdrop && backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
        }
        this.setDirtyCanvas(true);
    }

    /**
     * Button Action: Deploy the PyTango Device
     * (Adjust the fetch URL and request details as needed for your backend.)
     */
    async deployDevice() {
        const code = this.properties.code;
        if (!code) {
            this.output = "No code to deploy.";
            this.setOutputData(0, this.output);
            this.setDirtyCanvas(true);
            return;
        }

        this.loading = true;
        this.output = "Deploying device...";
        this.setOutputData(0, this.output);
        this.setDirtyCanvas(true);

        try {
            // Example: call your server endpoint to deploy this device code
            const response = await fetch('/deploy-pytango', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error(`Deployment failed: ${response.statusText}`);
            }
            const data = await response.json();
            this.output = `Deployment success: ${data.message || ''}`;
        } catch (error) {
            this.output = `Error deploying: ${error.message}`;
        }

        this.loading = false;
        this.setOutputData(0, this.output);
        this.setDirtyCanvas(true);
    }

    /**
     * Button Action: Deregister the PyTango Device
     * (Adjust the fetch URL and request details as needed for your backend.)
     */
    async deregisterDevice() {
        this.loading = true;
        this.output = "Deregistering device...";
        this.setOutputData(0, this.output);
        this.setDirtyCanvas(true);

        try {
            // Example: call your server endpoint to deregister this device
            const response = await fetch('/deregister-pytango', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ /* any needed info, e.g. device name */ })
            });

            if (!response.ok) {
                throw new Error(`Deregistration failed: ${response.statusText}`);
            }
            const data = await response.json();
            this.output = `Deregistration success: ${data.message || ''}`;
        } catch (error) {
            this.output = `Error deregistering: ${error.message}`;
        }

        this.loading = false;
        this.setOutputData(0, this.output);
        this.setDirtyCanvas(true);
    }

    /**
     * Draw status or messages on the node
     */
    onDrawForeground(ctx) {
        if (this.loading) {
            ctx.font = "12px Arial";
            ctx.fillStyle = "#000";
            ctx.fillText("Processing...", 10, this.size[1] - 30);
            return;
        }

        if (this.output) {
            ctx.font = "12px Arial";
            ctx.fillStyle = "#000";
            const displayText = 
                this.output.length > 50 ? this.output.substring(0, 47) + '...' : this.output;
            ctx.fillText(`Status: ${displayText}`, 10, this.size[1] - 10);
        }
    }
}

// Register the node
LiteGraph.registerNodeType("custom/pytango_device", PyTangoDeviceNode);
