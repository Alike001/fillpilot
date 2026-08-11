// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/FillPilotCanary.sol";

contract DeployFillPilotCanary is Script {
    function run() external returns (FillPilotCanary canary) {
        vm.startBroadcast();
        canary = new FillPilotCanary();
        vm.stopBroadcast();
    }
}
