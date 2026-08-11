// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract FillPilotCanary { event ExecutionCanaryRecorded(bytes32 indexed goalId,address indexed operator,bytes32 indexed evidenceId); mapping(bytes32=>bool) public recorded; function record(bytes32 goalId,bytes32 evidenceId) external { require(goalId!=bytes32(0),"goal required"); require(evidenceId!=bytes32(0),"evidence required"); require(!recorded[evidenceId],"evidence already recorded"); recorded[evidenceId]=true; emit ExecutionCanaryRecorded(goalId,msg.sender,evidenceId); } }
