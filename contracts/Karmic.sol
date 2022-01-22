//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Karmic {
    address[] private _boxTokens;

    function addBoxTokens(address[] memory tokens) external {
        for(uint8 i; i< tokens.length; i++) {
            _boxTokens.push(tokens[i]);
        }
    }

    function getBoxTokens() external view returns (address[] memory boxTokens){
        boxTokens = new address[](_boxTokens.length);

        for(uint8 i; i < _boxTokens.length; i++) {
            boxTokens[i] = _boxTokens[i];
        }
    }
}
