//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Badger.sol";

contract Karmic is Badger{
    mapping(address => BoxToken) private boxTokenTiers;
    uint256 boxTokenCounter;
    uint256 threshold;

    struct BoxToken{
        uint256 id;
        uint256 amount;
        uint256 funds;
        bool passedThreshold;
    }

    modifier isBoxToken(address token){
        require(boxTokenTiers[token].id != 0, "It is not a box token");
        _;
    }


    constructor(string memory _newBaseUri, uint256 _threshold) Badger(_newBaseUri) {
        boxTokenCounter = 1;
        threshold = _threshold;
        createTokenTier(0, _newBaseUri, false, address(0));
    }

    fallback() external payable {
        boxTokenTiers[msg.sender].amount = ERC20(msg.sender).totalSupply();
        boxTokenTiers[msg.sender].funds = msg.value;
        boxTokenTiers[msg.sender].passedThreshold = msg.value >= threshold;
    }

    function bondToMint(address token, uint256 amount) public isBoxToken(token) {

        require(ERC20(token).transferFrom(msg.sender, address(this), amount),
            "Failed to withdraw stakeholder's ERC20 tokens");
        bytes memory data;
        boxTokenTiers[token].amount -= amount;
        if(boxTokenTiers[token].passedThreshold){
            _mint(msg.sender, boxTokenTiers[token].id, amount, data);
        } else {
            _mint(msg.sender, 0, amount, data);
        }
    }

    function addBoxTokens(address[] memory tokens, string[] calldata tierUris) external onlyOwner {
        uint256 counter = boxTokenCounter;

        for(uint8 i; i< tokens.length; i++) {
            address token = tokens[i];
            require(boxTokenTiers[token].id == 0, "DUPLICATE_TOKEN");
            boxTokenTiers[token].id = counter;
            createTokenTier(counter, tierUris[i], false, token);
            counter++;
        }

        boxTokenCounter = counter;
    }

    function getBoxTokens() external view returns (address[] memory boxTokens){
        boxTokens = new address[](boxTokenCounter);
        for(uint8 i = 1; i <= boxTokenCounter; i++) {
            boxTokens[i-1] = tokenTiers[i].boxToken;
        }
    }

    function withdraw(address token, uint256 amount) external{
        require(!boxTokenTiers[token].passedThreshold,
            "Can withdraw only funds for tokens that didn't pass threshold");
        uint256 withdrawnFunds = amount * boxTokenTiers[token].funds / boxTokenTiers[token].amount;
        boxTokenTiers[token].amount -= amount;
        boxTokenTiers[token].funds -= withdrawnFunds;
        require(ERC20(token).transferFrom(msg.sender, address(this), amount),
            "Failed to withdraw stakeholder's ERC20 tokens");
        payable(msg.sender).transfer(withdrawnFunds);
    }


    function claimGovernanceTokens(address[] memory boxTokens) external {
        bytes memory data;

        address token;
        for(uint8 i; i < boxTokens.length; i++) {
            token = boxTokens[i];
            uint256 amount = IERC20(token).balanceOf(msg.sender);
            boxTokenTiers[token].amount -= amount;
            uint256 tokenId = boxTokenTiers[token].id;
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            if(boxTokenTiers[token].passedThreshold){
                _mint(msg.sender, tokenId, amount, data);
            } else {
                _mint(msg.sender, 0, amount, data);
            }
        }
    }
}
