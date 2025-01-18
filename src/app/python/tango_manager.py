from flask import Flask, request, jsonify
import tango
import threading

app = Flask(__name__)

###############################################################################
# GLOBAL / SINGLETON TANGO MANAGER
###############################################################################

class TangoManager:
    def __init__(self):
        """
        We'll maintain a dictionary of device_name -> metadata.

        {
          "sys/tg_test/1": {
             "proxy": <tango.DeviceProxy>,
             "subscriptions": {
                "ampli": <event_id>,
                ...
             },
             "latest_events": {
                "ampli": last_value,
                ...
             }
          },
          ...
        }
        """
        self.devices = {}
        self.lock = threading.Lock()

    def _get_or_create_device_proxy(self, device_name):
        """
        Get an existing device entry if it exists,
        otherwise create a new one and store it.
        """
        with self.lock:
            if device_name not in self.devices:
                proxy = tango.DeviceProxy(device_name)
                self.devices[device_name] = {
                    "proxy": proxy,
                    "subscriptions": {},
                    "latest_events": {}
                }
            return self.devices[device_name]

    def subscribe_attribute(self, device_name: str, attribute_name: str):
        """
        Subscribe to the attribute on the given device. 
        The subscription remains active for the lifetime of this manager or until unsubscribed.
        """
        dev_entry = self._get_or_create_device_proxy(device_name)
        proxy = dev_entry["proxy"]

        # Full attribute name might look like "sys/tg_test/1/ampli"
        full_attr_name = f"{proxy.name}/{attribute_name}"

        def _event_callback(evt):
            """
            Callback for receiving events. We'll store the last known value
            in dev_entry["latest_events"] for retrieval.
            """
            if evt.err:
                print(f"[ERROR] {full_attr_name} => {evt.errors}")
            else:
                print(f"[EVENT] {full_attr_name} => {evt.attr_value.value}")

                # Save to latest_events
                dev_entry["latest_events"][attribute_name] = evt.attr_value.value

        # Actually subscribe
        event_id = proxy.subscribe_event(
            attribute_name,
            tango.EventType.CHANGE_EVENT,
            _event_callback,
            stateless=True
        )

        # Store in subscriptions dictionary
        dev_entry["subscriptions"][attribute_name] = event_id
        print(f"Subscribed to {full_attr_name} with event ID: {event_id}")

    def unsubscribe_attribute(self, device_name: str, attribute_name: str):
        """
        Unsubscribe from an attribute, if currently subscribed.
        """
        dev_entry = self._get_or_create_device_proxy(device_name)
        subs = dev_entry["subscriptions"]
        if attribute_name in subs:
            event_id = subs[attribute_name]
            dev_entry["proxy"].unsubscribe_event(event_id)
            del subs[attribute_name]
            print(f"Unsubscribed from {device_name}/{attribute_name}, event ID: {event_id}")

    def run_command(self, device_name: str, command_name: str, args=None):
        """
        Run a Tango command on the specified device, reusing the same proxy and subscriptions.
        """
        dev_entry = self._get_or_create_device_proxy(device_name)
        proxy = dev_entry["proxy"]
        if args is None:
            args = []
        print(f"Running command on {device_name}: {command_name}({args})")
        return proxy.command_inout(command_name, *args)

    def get_latest_event_value(self, device_name: str, attribute_name: str):
        """
        Return the last known event value for an attribute of a device.
        """
        dev_entry = self._get_or_create_device_proxy(device_name)
        return dev_entry["latest_events"].get(attribute_name, None)


###############################################################################
# Instantiate our global manager
###############################################################################
tango_manager = TangoManager()

###############################################################################
# Flask endpoints
###############################################################################

@app.route("/subscribe", methods=["POST"])
def subscribe():
    """
    JSON body example:
    {
      "device": "sys/tg_test/1",
      "attribute": "ampli"
    }
    """
    data = request.get_json()
    device_name = data.get("device")
    attribute = data.get("attribute")

    if not device_name or not attribute:
        return jsonify({"error": "Missing 'device' or 'attribute'"}), 400

    try:
        tango_manager.subscribe_attribute(device_name, attribute)
        return jsonify({"message": f"Subscribed to {device_name}/{attribute}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/unsubscribe", methods=["POST"])
def unsubscribe():
    """
    JSON body example:
    {
      "device": "sys/tg_test/1",
      "attribute": "ampli"
    }
    """
    data = request.get_json()
    device_name = data.get("device")
    attribute = data.get("attribute")

    if not device_name or not attribute:
        return jsonify({"error": "Missing 'device' or 'attribute'"}), 400

    try:
        tango_manager.unsubscribe_attribute(device_name, attribute)
        return jsonify({"message": f"Unsubscribed {device_name}/{attribute}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/command", methods=["POST"])
def command():
    """
    JSON body example:
    {
      "device": "sys/tg_test/1",
      "command": "DevState",
      "args": []
    }
    """
    data = request.get_json()
    device_name = data.get("device")
    command_name = data.get("command")
    args = data.get("args", [])

    if not device_name or not command_name:
        return jsonify({"error": "Missing 'device' or 'command'"}), 400

    try:
        result = tango_manager.run_command(device_name, command_name, args)
        return jsonify({"result": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/latest_event", methods=["GET"])
def latest_event():
    """
    Query parameters:
    /latest_event?device=sys/tg_test/1&attribute=ampli
    """
    device_name = request.args.get("device")
    attribute = request.args.get("attribute")

    if not device_name or not attribute:
        return jsonify({"error": "Missing 'device' or 'attribute'"}), 400

    val = tango_manager.get_latest_event_value(device_name, attribute)
    return jsonify({"device": device_name, "attribute": attribute, "last_event_value": val}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

