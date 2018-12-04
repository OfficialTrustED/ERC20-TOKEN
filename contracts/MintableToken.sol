pragma solidity ^0.4.24;

import "./StandardToken.sol";
import "./Ownable.sol";


/**
 * @title Mintable Token
 * @dev Token that can be  minted (created).
 */
contract MintableToken is StandardToken, Ownable {

  event MinterAdded(address indexed account);
  event MinterRemoved(address indexed account);

  uint256 mintLockPeriod = 1575158399; // 30 Nov. 2019, 23:59:59 GMT

  /* special minting agents */
  mapping (address => bool) public isMinter;
  
  /**
   * limit minting by only special agents
   */
  modifier canMint() {
    require(isMinter[msg.sender]);
    _;
  }
  
  /**
   * function to add or remove minting agent
   */
  function setMintingAgent(address _address, bool _status) public onlyOwner {
    require(_address != address(0));
    //one more condition can be added which makes sure set address can be a contract only
    isMinter[_address] = _status;
    if(_status) {
        emit MinterAdded(_address);
    } else {
        emit MinterRemoved(_address);
    }
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _value The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _value
  )
    public
    canMint
    returns (bool)
  {
    require(block.timestamp > mintLockPeriod);
    _mint(_to, _value);
    return true;
  }
}