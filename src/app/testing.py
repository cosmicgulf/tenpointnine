from flask import Blueprint ,request ,jsonify
from tango import DeviceProxy
from urllib.parse import unquote
import threading
# from .test import event_tracer ,context_fixt
from assertpy import assert_that
import tango
TIMEOUT = 10 

module1 = Blueprint("module1", __name__)





@module1.route('/command_inouts', methods=['POST'])
def command_inouts():
    data = request.json
    print("Received Command:", data)
    import tango
    dp=tango.DeviceProxy(request.json["device"])
    dp.command_inout(request.json["command_name"])
    # Simulated response
    response = {
        "result_code": 200,  # Example success code
        "message": "Command processed successfully",
    }
    return jsonify(response), 200

@module1.route('/subscribe_events', methods=['POST'])
def subscribe_events():
    import tango
    from tango import EventType
    try:
        # Parse the JSON payload
        data = request.get_json()
        print(data)
        if not data:
            return jsonify({"error": "No data received"}), 400

        # Print the list of devices and attributes
        print("Received Subscription Data:")
        for device, attributes in data.items():
            dp=tango.DeviceProxy(device)
            for i in attributes:
                dp.subscribe_event(i,EventType.CHANGE_EVENT, print,stateless=True)
            print(f"Device: {device}, Attributes: {attributes}")

        # Respond with a success message
        return jsonify({"status": "success", "message": "Subscription data received", "received_data": data}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": "An error occurred", "error": str(e)}), 500
#############################################
##################sample json################
# {
#   "description": "this assertion is made",
#   "assertions": [
#     {
#       "device": "a/b/c",
#       "attribute_name": "obsstate",
#       "value": "READY"
#     },
#     {
#       "device": "a1/b1/c1",
#       "attribute_name": "obsstate1",
#       "value": "EMPTY"
#     }
#   ]
# }
########################################

# @module1.route('/assert_in', methods=['POST'])
# def assert_in_test():
#     data :dict = request.json
#     print("Received Command:", data)
    
#     description = data.get('description', '')
#     assertions = data.get('assertions', [])

#     try:
#         # Start building the assertion chain
#         assertion_chain = assert_that(event_tracer).described_as(description).within_timeout(TIMEOUT)
        
#         # Dynamically add assertions based on the input data
#         for assertion in assertions:
#             device_name = assertion.get('device')
#             attribute_name = assertion.get('attribute_name')
#             value_str = assertion.get('value')

#             # Retrieve the device object based on the device name
#             device = get_device_by_name(device_name)
#             if not device:
#                 raise ValueError(f"Device '{device_name}' not found.")

#             # Map the value string to the actual ObsState enum value
#             value = get_obs_state_value(value_str)
#             if value is None:
#                 raise ValueError(f"ObsState value '{value_str}' is invalid.")

#             previous_value = context_fixt.starting_state

#             # Add the has_change_event_occurred assertion to the chain
#             assertion_chain = assertion_chain.has_change_event_occurred(
#                 device,
#                 attribute_name,
#                 value,
#                 previous_value=previous_value
#             )

#         # Execute the assertion chain
#         assertion_chain.is_not_none()  # You can use any final assertion method as needed

#         # If assertions pass, return a success response
#         response = {
#             "result_code": 200,
#             "message": "Assertions passed successfully",
#         }
#         return jsonify(response), 200

#     except AssertionError as e:
#         # Handle assertion failures
#         response = {
#             "result_code": 400,
#             "message": f"Assertion failed: {str(e)}",
#         }
#         return jsonify(response), 400

#     except Exception as e:
#         # Handle other exceptions
#         response = {
#             "result_code": 500,
#             "message": f"An error occurred: {str(e)}",
#         }
#         return jsonify(response), 500

# Function to retrieve a device object by its name
def get_device_by_name(device_name):
    # Implement this function based on your application's device registry
    # For example:
    # return device_registry.get(device_name)
    pass

# Function to map a value string to an ObsState enum value
def get_obs_state_value(value_str):
    # Implement this function based on your ObsState enum
    # For example:
    # return ObsState[value_str.upper()]
    pass

@module1.route('/assert_in', methods=['POST'])
def assert_in_test():
    data  = request.json
    
    
    description = data.get('description', '')
    assertions = data.get('assertions', [])
    print("assertions", assertions)
    results={}
    i=0
    for entry in assertions:
        dev=tango.DeviceProxy(entry["device"])
        attribute=dev.read_attribute(entry["attribute_name"]).value
        entry["result"]=str(attribute==entry["value"])
        results[str(i)]=entry
    print(results)
    return jsonify(results)

@module1.route('/attribute_value', methods=['POST'])
def get_attribute_info():
    # Get the JSON data from the request
    data = request.get_json()
    
    # Extract device name (split by '/' and take the first part)
    device_name = data.get("device", "")
    
    # Print the device name to the console
    
    
    # Return the same JSON back as response
    return jsonify(data)



#////////////////////////////////////////////////////////////////////
#////////////////////////////////tango manager///////////////////////
#////////////////////////////////////////////////////////////////////
import json
import time
import datetime
import threading
from collections import deque
from flask import Blueprint, request, jsonify

# For the Tango imports, ensure PyTango is installed:
# import tango  # Uncomment if you have the tango library available

module1 = Blueprint("module1", __name__)

###############################################################################
# TangoManager Class
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

        2) A queue (deque) of the last 100 event logs: each item is a dict:
            {
              "timestamp": ...,
              "device": ...,
              "attribute": ...,
              "value": ...
            }
        """
        self.devices = {}
        self.event_logs = deque(maxlen=100)
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
            in dev_entry["latest_events"] and also log it in our queue.
            """
            timestamp = datetime.datetime.now().isoformat()
            if evt.err:
                print(f"[ERROR] {full_attr_name} => {evt.errors}")
                # Optionally store error logs if needed
            else:
                value = evt.attr_value.value
                print(f"[EVENT] {full_attr_name} => {value}")

                with self.lock:
                    dev_entry["latest_events"][attribute_name] = value
                    dev_entry["event_count"][attribute_name] = (
                        dev_entry["event_count"].get(attribute_name, 0) + 1
                    )
                    self.event_logs.append({
                        "timestamp": timestamp,
                        "device": device_name,
                        "attribute": attribute_name,
                        "value": value
                    })

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
        if not str(args):
            print(f"Running command on {device_name}: {command_name}() [no args]")
            return proxy.command_inout(command_name)
        else:
            print(f"Running command on {device_name}: {command_name}({args})")
            return proxy.command_inout(command_name, args)

    def ping_device(self, device_name: str):
        """
        Ping a device (returns some info or success message).
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        return dev_entry["proxy"].ping()

    def read_attribute(self, device_name: str, attribute_name: str):
        """
        Read a single attribute's current value from a device.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        return dev_entry["proxy"].read_attribute(attribute_name).value

    def read_attributes(self, device_name: str, attributes: list):
        """
        Read multiple attributes from the same device at once.
        Returns a dict of attribute_name -> value
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        result = {}
        attr_data_list = dev_entry["proxy"].read_attributes(attributes)
        for attr_data in attr_data_list:
            result[attr_data.name] = attr_data.value
        return result

    def get_device_info(self, device_name: str):
        """
        Return device info from the proxy.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        info = dev_entry["proxy"].info()
        return {
            "dev_class": info.dev_class,
            "server_id": info.server_id,
            "server_host": info.server_host,
            "ior": info.ior
        }

    def get_latest_event_value(self, device_name: str, attribute_name: str):
        """
        Return the last known event value for an attribute of a device.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        return dev_entry["latest_events"].get(attribute_name, None)

    def get_event_logs(self):
        """
        Return the entire (up to 100) event log as a list of dicts.
        """
        with self.lock:
            return list(self.event_logs)

    def wait_for_next_event(self, device_name: str, attribute_name: str, timeout_s: float = 30.0):
        """
        Block (up to `timeout_s` seconds) for the next event on a given
        device/attribute. If a new event arrives, return True; otherwise raise
        a timeout exception.
        """
        dev_entry = self._get_or_create_device_entry(device_name)
        start_time = time.time()

        initial_count = dev_entry["event_count"].get(attribute_name, 0)

        while True:
            time.sleep(0.1)
            current_count = dev_entry["event_count"].get(attribute_name, 0)
            if current_count > initial_count:
                return True
            if (time.time() - start_time) > timeout_s:
                raise TimeoutError(f"No new event within {timeout_s} seconds.")


###############################################################################
# Instantiate our global manager
###############################################################################
tango_manager = TangoManager()

###############################################################################
# Helper function to return JSON responses via `jsonify`
###############################################################################
def make_json_response(data, status=200):
    """
    Always return JSON (via Flask jsonify), ensuring
    the browser sees valid JSON. 
    """
    if not isinstance(data, dict):
        return jsonify({"error":"error occurred"})
    return jsonify(data), status


###############################################################################
# Flask endpoints
###############################################################################
@module1.route("/subscribe_event", methods=["POST"])
def subscribe_event():
    """
    JSON body example:
    {
      "sys/tg_test/1": ["ampli", "xyz"],
      "sys/tg_test/2": ["ampli2"]
    }
    """
    data = request.get_json()
    if not data:
        return make_json_response({"error": "Missing request body"}, 400)

    responses = []
    for device_name, attributes in data.items():
        if not isinstance(attributes, list):
            return make_json_response(
                {"error": f"Attributes for device '{device_name}' must be a list"},
                400
            )
        for attribute in attributes:
            try:
                tango_manager.subscribe_attribute(device_name, attribute)
                responses.append({
                    "device": device_name,
                    "attribute": attribute,
                    "status": "subscribed"
                })
            except Exception as e:
                responses.append({
                    "device": device_name,
                    "attribute": attribute,
                    "status": "error",
                    "error": str(e)
                })

    return make_json_response({
                    "device": str(device_name),
                    "attribute": str(attribute),
                    "status": "subscribed"
                }, 200)


@module1.route("/unsubscribe", methods=["POST"])
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
        return make_json_response(
            {"error": "Missing 'device' or 'attribute'"},
            400
        )

    try:
        tango_manager.unsubscribe_attribute(device_name, attribute)
        return make_json_response(
            {"message": f"Unsubscribed {device_name}/{attribute}"},
            200
        )
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


@module1.route("/command_inout", methods=["POST"])
def command_inout():
    """
    Expects JSON body like:
    {
      "device": "sys/tg_test/1",
      "command_name": "MyCommand",
      "input_args": "some string or JSON",
      "if_dumps": false
    }
    """
    try:
        data = request.get_json()
        if not data:
            return make_json_response({"error": "No JSON payload received"}, 400)
        print(data)

        device_name = data.get("device")
        command_name = data.get("command_name")
        input_args = data.get("input_args", None)
        if_dumps = data.get("if_dumps", False)
        # Validate required fields
        if not device_name:
            return make_json_response({"error": "Missing 'device'"}, 400)
        if not command_name:
            return make_json_response({"error": "Missing 'command_name'"}, 400)

        # If if_dumps is True, you might want to JSON-encode input_args:
        if if_dumps and input_args is not None:
            # Convert input_args to a JSON string
            input_args = json.dumps(input_args)
        
        if str(input_args):
            result = tango_manager.run_command(device_name, command_name, input_args)
        else:
            result = tango_manager.run_command(device_name, command_name, args=None)

        # If 'result' is not JSON-serializable, convert it to string
        # e.g. PyTango objects, or anything else that is not trivially serializable
        try:
            # Test if result is JSON-serializable
            json.dumps(result)
        except TypeError:
            # Fallback to a string representation
            result = str(result)

        return make_json_response({"result": result}, 200)

    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


@module1.route("/latest_event", methods=["GET"])
def latest_event():
    """
    Query parameters:
    /latest_event?device=sys/tg_test/1&attribute=ampli
    """
    device_name = request.args.get("device")
    attribute = request.args.get("attribute")

    if not device_name or not attribute:
        return make_json_response(
            {"error": "Missing 'device' or 'attribute'"},
            400
        )

    val = tango_manager.get_latest_event_value(device_name, attribute)
    # val might be anything - int, float, str, list, ...
    # Usually it's safe for JSON, but if it's not, use str(val).
    return make_json_response({
        "device": device_name,
        "attribute": attribute,
        "last_event_value": val
    }, 200)


@module1.route("/event_logs", methods=["GET"])
def event_logs():
    """
    Return the most recent (up to 100) event logs.
    """
    logs = tango_manager.get_event_logs()
    # logs is a list of dicts, presumably JSON-serializable.
    # If there's any weird object, you'd do `str(...)` but likely not needed.
    return make_json_response({"event_logs": logs}, 200)


@module1.route("/ping_device", methods=["GET"])
def ping_device():
    """
    Query parameters:
    /ping_device?device=sys/tg_test/1
    """
    device_name = request.args.get("device")
    if not device_name:
        return make_json_response({"error": "Missing 'device' param"}, 400)

    try:
        result = tango_manager.ping_device(device_name)
        # Turn 'result' into a string if it's not JSON serializable
        return make_json_response({"ping_result": str(result)}, 200)
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)
#for multiple devices
@module1.route("/ping_devices", methods=["GET"])
def ping_devices():
    """
    Query parameters:
    /ping_devices?devices=sys/tg_test/1,sys/tg_test/2
    """
    devices_param = request.args.get("devices")
    if not devices_param:
        return make_json_response({"error": "Missing 'devices' param"}, 400)

    device_names = devices_param.split(",")
    results = {}

    for device_name in device_names:
        try:
            result = tango_manager.ping_device(device_name.strip())
            results[device_name] = {"ping_result": str(result)}
        except Exception as e:
            results[device_name] = {"error": str(e)}

    return make_json_response(results, 200)


@module1.route("/read_attribute", methods=["GET"])
def read_attribute():
    """
    Query parameters:
    /read_attribute?device=sys/tg_test/1&attribute=ampli
    """
    device_name = request.args.get("device")
    attribute_name = request.args.get("attribute")
    if not device_name or not attribute_name:
        return make_json_response(
            {"error": "Missing 'device' or 'attribute' param"},
            400
        )

    try:
        val = tango_manager.read_attribute(device_name, attribute_name)
        # val might be an int, float, or even an array. Usually safe to JSONify.
        return make_json_response(
            {"device": device_name, "attribute": attribute_name, "value": val},
            200
        )
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


@module1.route("/read_attributes", methods=["POST"])
def read_attributes():
    """
    JSON body example:
    {
      "device": "sys/tg_test/1",
      "attributes": ["ampli", "phase"]
    }
    """
    data = request.get_json()
    if not data:
        return make_json_response({"error": "Missing request body"}, 400)

    device_name = data.get("device")
    attributes = data.get("attributes")

    if not device_name or not attributes:
        return make_json_response(
            {"error": "Missing 'device' or 'attributes'"},
            400
        )

    try:
        result = tango_manager.read_attributes(device_name, attributes)
        # result is a dict: { attribute_name: value, ... }
        # Typically JSON-serializable if values are primitive or arrays.
        return make_json_response({
            "device": device_name,
            "values": result
        }, 200)
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


@module1.route("/get_device_info", methods=["GET"])
def get_device_info():
    """
    Query parameters:
    /get_device_info?device=sys/tg_test/1
    """
    device_name = request.args.get("device")
    if not device_name:
        return make_json_response(
            {"error": "Missing 'device' param"},
            400
        )

    try:
        info = tango_manager.get_device_info(device_name)
        # info is a dict with strings.
        return make_json_response({"device_info": info}, 200)
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


@module1.route("/reset_manager", methods=["POST"])
def reset_manager():
    """
    Reset the TangoManager (unsubscribe all, clear logs, etc.).
    """
    try:
        tango_manager.reset()
        return make_json_response({"message": "TangoManager reset successfully."}, 200)
    except Exception as e:
        return make_json_response({"error": str(e)}, 500)


from urllib.parse import unquote
# Assuming you have the following imports based on your initial code
# from your_flask_app import module1, tango_manager, make_json_response
# Ensure you have imported the TangoManager and other necessary components

@module1.route("/attribute_list", methods=["POST"])
def attribute_list():
    """
    POST /attribute_list
    Expects JSON body:
    {
        "device_name": "sys/tg_test/1"
    }
    
    Returns JSON response:
    {
        "attributes": ["ampli", "xyz", ...]
    }
    
    On error:
    {
        "error": "Error message"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return make_json_response({"error": "No JSON payload received"}, 400)
        
        device_name = data.get("device_name")
        if not device_name:
            return make_json_response({"error": "Missing 'device_name' in request"}, 400)
        
        # If device_name was URL-encoded, decode it. If not, this is safe.
        device_name = unquote(device_name)
        
        # Use TangoManager to get or create the device entry
        dev_entry = tango_manager._get_or_create_device_entry(device_name)
        proxy = dev_entry["proxy"]
        
        # Fetch attribute names using Tango DeviceProxy
        attributes = list(proxy.get_attribute_list())
        
        return make_json_response({"attributes": attributes}, 200)
    
    except Exception as e:
        # Log the exception as needed
        return make_json_response({"error": str(e)}, 500)

@module1.route("/set_attribute", methods=["POST"])
def set_attribute():
    """
    POST /set_attribute
    Expects JSON body:
    {
        "device": "sys/tg_test/1",
        "attribute": "adminMode",
        "value": 0  # For ONLINE, 1 for OFFLINE, 2 for ENGINEERING
    }

    Returns JSON response:
    {
        "device": "sys/tg_test/1",
        "attribute": "adminMode",
        "status": "success"
    }

    On error:
    {
        "error": "Error message"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return make_json_response({"error": "No JSON payload received"}, 400)
        
        device_name = data.get("device")
        attribute = data.get("attribute")
        value = data.get("value")
        
        if not device_name or not attribute or value is None:
            return make_json_response(
                {"error": "Missing 'device', 'attribute', or 'value' in request"},
                400
            )
        
        # If device_name was URL-encoded, decode it. If not, this is safe.
        device_name = unquote(device_name)
        
        # Use TangoManager to get or create the device entry
        dev_entry = tango_manager._get_or_create_device_entry(device_name)
        proxy = dev_entry["proxy"]
        
        # Set the attribute value
        proxy.write_attribute(attribute, value)
        
        return make_json_response({
            "device": device_name,
            "attribute": attribute,
            "status": "success"
        }, 200)
    
    except Exception as e:
        # Log the exception as needed
        return make_json_response({"error": str(e)}, 500)