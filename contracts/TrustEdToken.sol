pragma solidity ^0.4.24;

import "./BurnableToken.sol";
import "./ReleasableToken.sol";
import "./UpgradeableToken.sol";
import "./Recoverable.sol";
import "./PausableToken.sol";
import "./MintableToken.sol";


/**
 * TrustEdToken smart contract.
 *
 * We mix in recoverable, releasable, pausable, burnable, mintable and upgradeable traits.
 *
 * Token supply is created in the token contract creation and allocated to owner.
 * The owner can then transfer from its supply to crowdsale participants.
 * The owner, or anybody, can burn any excessive tokens they are holding.
 *
 */
contract TrustEdToken is ReleasableToken, PausableToken, Recoverable, BurnableToken, UpgradeableToken, MintableToken {

  // Token meta information
  string public name;
  string public symbol;
  uint256 public decimals;
  
  uint256 TOTAL_SUPPLY;

  /** Name and symbol were updated. */
  event UpdatedTokenInformation(string newName, string newSymbol);

  constructor() public {
    name = "TrustEd Token";
    symbol = "TED";
    decimals = 18;
    
    TOTAL_SUPPLY = 1720000000 * (10**decimals); //1.72 billion total supply
    _mint(msg.sender, TOTAL_SUPPLY);

  }

  /**
   * Owner can update token information here.
   *
   * It is often useful to conceal the actual token association, until
   * the token operations, like central issuance or reissuance have been completed.
   * In this case the initial token can be supplied with empty name and symbol information.
   *
   * This function allows the token owner to rename the token after the operations
   * have been completed and then point the audience to use the token contract.
   */
  function setTokenInformation(string _name, string _symbol) onlyOwner external{
    name = _name;
    symbol = _symbol;
    emit UpdatedTokenInformation(name, symbol);
  }

}
