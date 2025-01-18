from ext.test_harness.facades.csp_facade import CSPFacade
from ext.test_harness.facades.dishes_facade import DishesFacade
from ext.test_harness.facades.sdp_facade import SDPFacade
from ext.test_harness.facades.tmc_facade import TMCFacade
from ext.test_harness.init.test_harness_builder import (
    TestHarnessBuilder,
)
from ext.test_harness.inputs.dish_mode import DishMode
from ext.test_harness.inputs.json_input import DictJSONInput
from ext.test_harness.inputs.pointing_state import PointingState
from ext.test_harness.inputs.test_harness_inputs import (
    TestHarnessInputs,
)
from ext.test_harness.structure.telescope_wrapper import (
    TelescopeWrapper,
)
from dataclasses import dataclass
from typing import Any

import pytest
from ext.ska_control_model.obs_state import ObsState
from ext.ska_control_model.result_code import ResultCode
from ext.ska_tango_testing.integration import TangoEventTracer, log_events
from assertpy import assert_that


@pytest.fixture
def telescope_wrapper(
    default_commands_inputs: TestHarnessInputs,
) -> TelescopeWrapper:
    """Create an unique test harness with proxies to all devices."""
    test_harness_builder = TestHarnessBuilder()

    # import from a configuration file device names and emulation directives
    # for TMC, CSP, SDP and the Dishes
    test_harness_builder.read_config_file(
        "mid/tests/system_level_tests/test_harness_config.yaml"
    )
    test_harness_builder.validate_configurations()

    # set the default inputs for the TMC commands,
    # which will be used for teardown procedures
    test_harness_builder.set_default_inputs(default_commands_inputs)
    test_harness_builder.validate_default_inputs()

    # build the wrapper of the telescope and its sub-systems
    telescope = test_harness_builder.build()
    telescope.actions_default_timeout = 200
    yield telescope
    # after a test is completed, reset the telescope to its initial state
    # (obsState=READY, telescopeState=OFF, no resources assigned)
    telescope.tear_down()


@pytest.fixture
def tmc(telescope_wrapper: TelescopeWrapper) -> TMCFacade:
    """Create a facade to TMC devices."""
    return TMCFacade(telescope_wrapper)


@pytest.fixture
def csp(telescope_wrapper: TelescopeWrapper):
    """Create a facade to CSP devices."""
    return CSPFacade(telescope_wrapper)


@pytest.fixture
def sdp(telescope_wrapper: TelescopeWrapper):
    """Create a facade to SDP devices."""
    return SDPFacade(telescope_wrapper)


@pytest.fixture
def dishes(telescope_wrapper: TelescopeWrapper):
    """Create a facade to dishes devices."""
    return DishesFacade(telescope_wrapper)



###########tango events ############

@pytest.fixture
def event_tracer() -> TangoEventTracer:
    """Create an event tracer."""
    return TangoEventTracer(
        event_enum_mapping={
            "obsState": ObsState,
            "dishMode": DishMode,
            "poitingState": PointingState,
        },
    )




@dataclass
class SubarrayTestContextData:
    """A class to store shared variables between steps."""

    starting_state: ObsState | None = None
    """The state of the system before the WHEN step."""

    expected_next_state: ObsState | None = None
    """The expected state to be reached if no WHEN step is executed.

    It is meaningful when the starting state is transient and so it will
    automatically change to another state (different both from the starting
    state and the expected next state).

    Leave empty if the starting state is not transient.
    """

    when_action_result: Any | None = None
    """The result of the WHEN step command."""

    when_action_name: str | None = None
    """The name of the Tango command executed in the WHEN step."""

    def is_starting_state_transient(self) -> bool:
        """Check if the starting state is transient."""
        return self.expected_next_state is not None


@pytest.fixture
def context_fixt() -> SubarrayTestContextData:
    """A collection of variables shared between steps.

    The shared variables are the following:

    - previous_state: the previous state of the subarray.
    - expected_next_state: the expected next state of the subarray (specified
        only if the previous st
    - trigger: the trigger that caused the state change.

    :return: the shared variables.
    """
    return SubarrayTestContextData()


def _get_long_run_command_id(context_fixt: SubarrayTestContextData) -> str:
    return context_fixt.when_action_result[1][0]


def get_expected_long_run_command_result(context_fixt) -> tuple[str, str]:
    return (
        _get_long_run_command_id(context_fixt),
        f'[{ResultCode.OK.value}, "Command Completed"]',
    )


