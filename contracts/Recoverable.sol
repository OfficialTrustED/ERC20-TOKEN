pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./IERC20.sol";

contract Recoverable is Ownable {

  /// @dev Empty constructor (for now)
  constructor() public {
  }

  /// @dev This will be invoked by the owner, when owner wants to rescue tokens
  /// @param token Token which will we rescue to the owner from the contract
  function recoverTokens(IERC20 token) onlyOwner public {
    token.transfer(owner, tokensToBeReturned(token));
  }

  /// @dev Interface function, can be overwritten by the superclass
  /// @param token Token which balance we will check and return
  /// @return The amount of tokens (in smallest denominator) the contract owns
  function tokensToBeReturned(IERC20 token) public view returns (uint) {
    return token.balanceOf(this);
  }
}