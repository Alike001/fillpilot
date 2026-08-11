// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/FillPilotCanary.sol";

contract FillPilotCanaryTest is Test {
    FillPilotCanary internal canary;
    function setUp() public { canary = new FillPilotCanary(); }
    function testRecordsEvidenceOnce() public { bytes32 goal = keccak256("goal"); bytes32 evidence = keccak256("evidence"); canary.record(goal, evidence); assertTrue(canary.recorded(evidence)); }
    function testRejectsDuplicateEvidence() public { bytes32 goal = keccak256("goal"); bytes32 evidence = keccak256("evidence"); canary.record(goal, evidence); vm.expectRevert("evidence already recorded"); canary.record(goal, evidence); }
}
