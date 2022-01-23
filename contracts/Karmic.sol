//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Badger.sol";

contract Karmic is Badger{
    address[] private _boxTokens;

    constructor(string memory _newBaseUri) Badger(_newBaseUri) {}

    function addBoxTokens(address[] memory tokens, string[] calldata tierUris) external onlyOwner {
        for(uint8 i; i< tokens.length; i++) {
            // TODO: check for duplicates
            for(uint8 j; j < _boxTokens.length; j++) {
                require(_boxTokens[j] != tokens[i], "DUPLICATE_TOKEN");
            }
            _boxTokens.push(tokens[i]);
            createTokenTier(_boxTokens.length, tierUris[i], false);
        }
    }

    function getBoxTokens() external view returns (address[] memory boxTokens){
        boxTokens = new address[](_boxTokens.length);
        for(uint8 i; i < _boxTokens.length; i++) {
            boxTokens[i] = _boxTokens[i];
        }
    }

}
