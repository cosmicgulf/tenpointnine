from flask import Flask, render_template , request ,redirect, url_for ,jsonify
import json
import os
import inspect
import importlib
import sys
import re
import io
import subprocess
from kubernetes import client, config, stream
from requests.auth import HTTPBasicAuth
import requests
from .testing import module1

app = Flask(__name__, template_folder='templates')
app.register_blueprint(module1, url_prefix="/module1")


@app.route('/')
def index(problem_number=1):
    
    return render_template("index.html")

@app.route('/home')
def home ():
   return "hello world "

@app.route('/tango')
def tango_list ():
   import tango
   db=tango.Database()
   return list(db.get_device_exported("*").value_string)


@app.route("/device")
def device():
   a=1
   return str(a)
@app.route('/device.html')
def devht():
   return render_template("device.html")

@app.route("/speed",methods = ['POST'])
def getSpeed():
   req_data = request.get_json(force=True)
   if (int(req_data["id"])<50):
      a="good"
   else:
      a="not good"
   dic={"a": a}
   return json.dumps(dic)
   
@app.route('/macro-graph-editor')
def macro_graph_editor():
    return render_template('macro.html')
    
@app.route("/startserver")
def startserver():
   #os.system(" gnome-terminal --working-directory Desktop/tango/tangoserver/tango-devices/docker-compose up")
   os.system("gnome-terminal -e 'bash -c \"docker-compose -f ~/Desktop/docker-compose.yml up; exec bash\"'")
   return "the tango server has been started you can close this link"

@app.route('/execute', methods=['POST'])
def execute_code():
    data = request.get_json()
    code = data.get('code', '')
    args = data.get('args', [])

    if not code:
        return jsonify({'output': 'Error: No code provided'}), 400

    try:
        # Create a local dictionary to serve as the local namespace during exec
        local_namespace = {}
        # Execute the code
        exec(code, {}, local_namespace)
        # Find the first function defined in the code
        func_name = [name for name in local_namespace if callable(local_namespace[name])][0]
        func = local_namespace[func_name]
        # Redirect stdout to capture print statements
        old_stdout = sys.stdout
        redirected_output = sys.stdout = io.StringIO()
        # Call the function with provided arguments
        result = func(*args)
        # Get any print output
        output = redirected_output.getvalue()
        sys.stdout = old_stdout  # Reset stdout
        # Combine function return value and print output
        full_output = output + str(result)
        return jsonify({'output': full_output})
    except Exception as e:
        return jsonify({'output': f'Error during execution: {str(e)}'}), 500


#////////////////// kubernetes////////////////////


from flask import Flask, request, jsonify, render_template, redirect, url_for
from kubernetes import client, config, stream



from kubernetes.config import ConfigException

try:
    config.load_incluster_config()  # For running inside the cluster
except ConfigException:
    try:
        config.load_kube_config()  # For local development
    except Exception as e:
        print(f"Failed to load Kubernetes configuration: {e}")



@app.route('/pods/<namespace>')
def get_pods(namespace):
    try:
        v1 = client.CoreV1Api()
        pods = v1.list_namespaced_pod(namespace)
        pod_names = [pod.metadata.name for pod in pods.items]
        return jsonify({'pods': pod_names})
    except client.ApiException as e:
        return jsonify({'error': e.reason}), e.status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/logs/<namespace>/<pod_name>')
def get_logs(namespace, pod_name):
    try:
        v1 = client.CoreV1Api()
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=namespace)
        return jsonify({'logs': logs})
    except client.ApiException as e:
        return jsonify({'error': e.reason}), e.status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pod_info/<namespace>/<pod_name>')
def get_pod_info(namespace, pod_name):
    try:
        v1 = client.CoreV1Api()
        pod = v1.read_namespaced_pod(name=pod_name, namespace=namespace)
        return jsonify({'info': pod.to_dict()})
    except client.ApiException as e:
        return jsonify({'error': e.reason}), e.status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/describe_pod/<namespace>/<pod_name>')
def describe_pod(namespace, pod_name):
    try:
        v1 = client.CoreV1Api()
        pod = v1.read_namespaced_pod(name=pod_name, namespace=namespace)
        description = f"Name: {pod.metadata.name}\nNamespace: {pod.metadata.namespace}\n" \
                      f"Status: {pod.status.phase}\nNode: {pod.spec.node_name}"
        return jsonify({'description': description})
    except client.ApiException as e:
        return jsonify({'error': e.reason}), e.status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/delete_pod/<namespace>/<pod_name>', methods=['DELETE'])
def delete_pod(namespace, pod_name):
    try:
        v1 = client.CoreV1Api()
        response = v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
        return jsonify({'message': f'Pod {pod_name} in namespace {namespace} deleted successfully.'}), 200
    except client.ApiException as e:
        return jsonify({'error': e.reason}), e.status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/run_command/<namespace>/<pod_name>')
def run_command(namespace, pod_name):
    command = request.args.get('command')
    if not command:
        return "No command provided.", 400

    try:
        api_instance = client.CoreV1Api()
        exec_command = ['/bin/sh', '-c', command]

        resp = stream.stream(api_instance.connect_get_namespaced_pod_exec,
                             pod_name,
                             namespace,
                             command=exec_command,
                             stderr=True, stdin=False,
                             stdout=True, tty=False)

        output = resp.strip()
        success = True  # Since exceptions will be raised on failure

        return render_template('command_output.html', namespace=namespace, pod_name=pod_name, command=command, output=output, success=success)
    except client.ApiException as e:
        output = f"API exception: {e}"
        success = False
        return render_template('command_output.html', namespace=namespace, pod_name=pod_name, command=command, output=output, success=success)
    except Exception as e:
        output = f"Exception: {str(e)}"
        success = False
        return render_template('command_output.html', namespace=namespace, pod_name=pod_name, command=command, output=output, success=success)


@app.route('/execute_command/<namespace>/<pod_name>', methods=['GET', 'POST'])
def execute_command(namespace, pod_name):
    if request.method == 'POST':
        command = request.form.get('command')
        return redirect(url_for('run_command', namespace=namespace, pod_name=pod_name, command=command))
    return render_template('execute_command.html', namespace=namespace, pod_name=pod_name)

@app.route('/healthz')
def health_check():
    try:
        v1 = client.CoreV1Api()
        namespaces = v1.list_namespace()
        namespace_names = [ns.metadata.name for ns in namespaces.items]
        return jsonify({'status': 'ok', 'namespaces': namespace_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# end kubernetes ///////////////////////////////////////////////


@app.route('/fetch_bdd', methods=['GET'])
def fetch_bdd():
    """
    Endpoint to fetch the 'customfield_11902' from a JIRA ticket.
    Example usage: GET /fetch_bdd?ticket=XTP-29228
    """

    # Retrieve the ticket ID from query parameters
    # ticket = request.args.get('ticket')
    
    # if not ticket:
    #     return jsonify({
    #         'error': "Missing 'ticket' query parameter."
    #     }), 400

    # # Validate that the ticket starts with 'XTP-'
    # if not re.match(r'^XTP-\d+$', ticket, re.IGNORECASE):
    #     return jsonify({
    #         'error': "Invalid ticket format. Ticket must start with 'XTP-' followed by digits. Example: XTP-29228"
    #     }), 400

    # # Normalize the ticket to uppercase
    # ticket = ticket.upper()

    # # Define the JIRA API URL
    # url = f"https://jira.skatelescope.org/rest/api/2/issue/{ticket}"
    
    # # Authentication credentials from environment variables
    # username = ''
    # password = ""

    # try:
    #     # Make the GET request with Basic Authentication
    #     response = requests.get(
    #         url,
    #         auth=HTTPBasicAuth(username, password),
    #         headers={"Content-Type": "application/json"}
    #     )
        
    #     # Check if the request was successful
    #     if response.status_code == 200:
    #         data = response.json()
    #         # Safely get the custom field value
    #         custom_field = data.get("fields", {}).get("customfield_11902")
            
    #         if custom_field is not None:
    #             return jsonify({
    #                 'ticket': ticket,
    #                 'test': custom_field
    #             }), 200
    #         else:
    #             return jsonify({
    #                 'error': f"'customfield_11902' not found in ticket {ticket}."
    #             }), 404
    #     else:
    #         # Return the error status and message from JIRA
    #         return jsonify({
    #             'error': f"Failed to fetch ticket {ticket}.",
    #             'status_code': response.status_code,
    #             'message': response.text
    #         }), response.status_code
    # except requests.exceptions.RequestException as e:
    #     # Handle any request exceptions
    #     return jsonify({
    #         'error': 'An error occurred while fetching the ticket.',
    #         'details': str(e)
    #     }), 500
    return "this feature is disabled due to credentials"

###################################################
###########comp test functionality #################
def add_routes_from_module(module):
    for name, func in inspect.getmembers(module, inspect.isfunction):
        if not name.startswith("_"):  # Skip private or special functions
            def make_endpoint(func):
                def endpoint():
                    # Check if the method has parameters
                    if request.method == "POST":
                        try:
                            params = request.get_json() or {}
                            # Call the function with the provided parameters
                            result = func(**params)
                            return jsonify({"result": result})
                        except TypeError as e:
                            return jsonify({"error": f"Invalid parameters: {str(e)}"}), 400
                    else:
                        return jsonify({"error": "Only POST method is allowed"}), 405
                endpoint.__name__ = func.__name__  # Set unique name for Flask route
                return endpoint

            # Dynamically add Flask route
            app.route(f"/{name}", methods=["POST"])(make_endpoint(func))

module_name = "app.comptest.comptest"  
module = importlib.import_module(module_name)

# Add all functions from the module as routes
add_routes_from_module(module)

@app.route('/get_module', methods=['GET'])
def get_module_file():
    module_file = "src/app/comptest/comptest.py"  # Name of the module file
    # Check if the file exists
    if not os.path.exists(module_file):
        return jsonify({"error": f"File not found: {module_file}"}), 404

    # Return the file content
    try:
        with open(module_file, 'r') as file:
            content = file.read()
        return jsonify({"file_name": module_file, "content": content})
    except Exception as e:
        return jsonify({"error": f"Error reading file: {str(e)}"}), 500
#######################################################################
#######################################################################

@app.route('/fqdn', methods=['GET'])
def get_trl_prefix():
    # Read environment variables
    tango_host_name = os.getenv('TANGO_HOST_NAME', 'tango-databaseds')
    kube_namespace = os.getenv('KUBE_NAMESPACE', 'tenpointnine')
    cluster_domain = os.getenv('CLUSTER_DOMAIN', 'cluster.local')
    port = os.getenv('PORT', '10000')

    # Construct the trl
    if tango_host_name and kube_namespace and cluster_domain and port:
        trl = f"tango://{tango_host_name}.{kube_namespace}.svc.{cluster_domain}:{port}"
    else:
        trl = ""

    # Return the full prefix
    return jsonify({"fqdn": f"{trl}/"})

if __name__ == '__main__':
    app.run(debug=True)
