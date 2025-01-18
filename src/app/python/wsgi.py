from flask import Flask, request, jsonify
import tango
import threading
import time
import datetime

app = Flask(__name__)

###############################################################################
# GLOBAL / SINGLETON TANGO MANAGER
###############################################################################

class TangoManager:
    def __init__(self):
        """
        We'll maintain:
        
        1) A dictionary of device_name -> metadata:
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
                 },
                 "event_count": {
                    "ampli": int_count_of_events
                 }
              },
              ...
            }
        
        2) A global list of all event logs: a list of dict, each containing:
            {
              "timestamp": ...,
              "device": ...,
              "attribute": ...,
              "value": ...
            }
        """
        self.devices = {}
        self.event_logs = []  # list of dict
        self.lock = threading.Lock()

    def reset(self):
        """
        Reset the entire manager, removing all device proxies, subscriptions,
        and event logs. It's as if we have a fresh client.
        """
        with self.lock:
            for device_name, dev_entry in self.devices.items():
                # Unsubscribe from all existing subscriptions
                for attribute, event_id in dev_entry["subscriptions"].items():
                    dev_entry["proxy"].unsubscribe_event(event_id)
            self.devices.clear()
            self.event_logs.clear()

    def _get_or_create_device_entry(self, device_name):
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
                    "latest_events": {},
                    "event_count": {}  # track how many events have arrived per attribute
                }
            return self.devices[device_name]

    def subscribe_attribute(self, device_name: str, attribute_name: str):
        """
        Subscribe to the attribute on the given device.
        The subscription remains active for the lifetime of this manager
        or until unsubscribed.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        proxy = dev_entry["proxy"]

        # Full attribute name might look like "sys/tg_test/1/ampli"
        full_attr_name = f"{proxy.name}/{attribute_name}"

        def _event_callback(evt):
            """
            Callback for receiving events. We'll store the last known value
            in dev_entry["latest_events"] and also log it in self.event_logs.
            """
            timestamp = datetime.datetime.now().isoformat()
            if evt.err:
                print(f"[ERROR] {full_attr_name} => {evt.errors}")
                # (Optional) You could also store error logs, if needed
            else:
                value = evt.attr_value.value
                print(f"[EVENT] {full_attr_name} => {value}")

                with self.lock:
                    # Update the last known value
                    dev_entry["latest_events"][attribute_name] = value
                    # Increase event count
                    dev_entry["event_count"][attribute_name] = (
                        dev_entry["event_count"].get(attribute_name, 0) + 1
                    )
                    # Append to global event logs
                    self.event_logs.append({
                        "timestamp": timestamp,
                        "device": device_name,
                        "attribute": attribute_name,
                        "value": value
                    })

        # Actually subscribe
        event_id = proxy.subscribe_event(
            attribute_name,
            tango.EventType.CHANGE_EVENT,
            _event_callback,
            stateless=True
        )

        dev_entry["subscriptions"][attribute_name] = event_id
        dev_entry["event_count"].setdefault(attribute_name, 0)
        print(f"Subscribed to {full_attr_name} with event ID: {event_id}")

    def unsubscribe_attribute(self, device_name: str, attribute_name: str):
        """
        Unsubscribe from an attribute, if currently subscribed.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        subs = dev_entry["subscriptions"]
        if attribute_name in subs:
            event_id = subs[attribute_name]
            dev_entry["proxy"].unsubscribe_event(event_id)
            del subs[attribute_name]
            print(f"Unsubscribed from {device_name}/{attribute_name}, event ID: {event_id}")

    def run_command(self, device_name: str, command_name: str, args=None):
        """
        Run a Tango command on the specified device.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        proxy = dev_entry["proxy"]
        if args is None:
            args = []
        print(f"Running command on {device_name}: {command_name}({args})")
        return proxy.command_inout(command_name, *args)

    def get_latest_event_value(self, device_name: str, attribute_name: str):
        """
        Return the last known event value for an attribute of a device.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        return dev_entry["latest_events"].get(attribute_name, None)

    def get_event_logs(self):
        """
        Return the entire event log as a list.
        """
        with self.lock:
            # Return a shallow copy or you can return it directly
            return list(self.event_logs)

    def wait_for_next_event(self, device_name: str, attribute_name: str, timeout_s: float = 30.0):
        """
        Block (up to `timeout_s` seconds) for the next event on a given
        device/attribute. If a new event arrives, return True; otherwise raise
        a timeout exception.

        Implementation detail:
        We store the current event_count for that device/attribute, then
        poll in a loop for a change in that count. A more robust approach
        is to use a threading.Condition, but this is simpler to illustrate.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        start_time = time.time()

        # Snapshot current event count
        initial_count = dev_entry["event_count"].get(attribute_name, 0)

        while True:
            time.sleep(0.1)  # poll interval
            current_count = dev_entry["event_count"].get(attribute_name, 0)
            if current_count > initial_count:
                # A new event has arrived
                return True
            if (time.time() - start_time) > timeout_s:
                raise TimeoutError(f"No new event within {timeout_s} seconds.")


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
    Query parameters example:
    /latest_event?device=sys/tg_test/1&attribute=ampli
    """
    device_name = request.args.get("device")
    attribute = request.args.get("attribute")

    if not device_name or not attribute:
        return jsonify({"error": "Missing 'device' or 'attribute'"}), 400

    val = tango_manager.get_latest_event_value(device_name, attribute)
    return jsonify({
        "device": device_name,
        "attribute": attribute,
        "last_event_value": val
    }), 200


@app.route("/reset_client", methods=["POST"])
def reset_client():
    """
    Reset the entire TangoManager: unsubscribes all attributes,
    clears all proxies, and wipes the event logs.
    """
    try:
        tango_manager.reset()
        return jsonify({"message": "Tango client reset successfully. All subscriptions removed."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/event_logs", methods=["GET"])
def event_logs():
    """
    Return the full list of event logs. You might want to add filtering,
    pagination, or a limit on how many logs to keep in memory.
    """
    logs = tango_manager.get_event_logs()
    return jsonify({"event_logs": logs}), 200


@app.route("/wait_for_event", methods=["GET"])
def wait_for_event():
    """
    Wait for the *next* event on a specified device & attribute,
    up to a configurable timeout (in seconds).

    Query parameters:
      device=sys/tg_test/1
      attribute=ampli
      timeout=30  (optional, default=30)
    """
    device_name = request.args.get("device")
    attribute = request.args.get("attribute")
    timeout_str = request.args.get("timeout", "30")
    
    if not device_name or not attribute:
        return jsonify({"error": "Missing 'device' or 'attribute'"}), 400

    try:
        timeout_s = float(timeout_str)
    except ValueError:
        return jsonify({"error": f"Invalid timeout '{timeout_str}'"}), 400

    try:
        tango_manager.wait_for_next_event(device_name, attribute, timeout_s)
        return jsonify({"status": True}), 200
    except TimeoutError as e:
        return jsonify({"error": str(e)}), 408  # 408 Request Timeout


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

