pragma solidity ^0.4.24;

import "./StandardToken.sol";
import "./Ownable.sol";

/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract BurnableToken is StandardToken, Ownable {

  event BurningAgentAdded(address indexed account);
  event BurningAgentRemoved(address indexed account);
  
  
  /* special burning agents */
  mapping (address => bool) public isBurningAgent;
  
  /**
   * limit burning by only special agents
   */
  modifier canBurn() {
    require(isBurningAgent[msg.sender]);
    _;
  }
  
  /**
   * function to add or remove burning agent
   */
  function setBurningAgent(address _address, bool _status) public onlyOwner {
    require(_address != address(0));
    isBurningAgent[_address] = _status;
    if(_status) {
        emit BurningAgentAdded(_address);
    } else {
        emit BurningAgentRemoved(_address);
    }
  }
  
  /**
   * @dev Burns a specific amount of tokens.
   * @param _value The amount of token to be burned.
   */
  function burn(
      uint256 _value
  ) 
    public 
    canBurn
    returns (bool)
  {
    _burn(msg.sender, _value);
    return true;
  }
  
}