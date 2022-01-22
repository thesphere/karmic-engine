//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Karmic {
    address[] private _tokens;

    function addTokens(address[] memory tokens) external {
        for(uint8 i; i< tokens.length; i++) {
            _tokens.push(tokens[i]);
        }
    }
}
