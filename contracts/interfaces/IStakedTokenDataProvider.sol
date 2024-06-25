// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

/**
 * @title IStakedTokenDataProvider
 * @notice It defines the basic interface of the Staked Token Data Provider
 */
interface IStakedTokenDataProvider {
  struct StakedTokenData {
    uint256 stakedTokenTotalSupply;
    uint256 stakedTokenTotalRedeemableAmount;
    uint256 stakeCooldownSeconds;
    uint256 stakeUnstakeWindow;
    uint256 stakedTokenPriceEth;
    uint256 rewardTokenPriceEth;
    uint256 stakeApy;
    uint128 distributionPerSecond;
    uint256 distributionEnd;
  }

  struct StakedTokenUserData {
    uint256 stakedTokenUserBalance;
    uint256 stakedTokenRedeemableAmount;
    uint256 underlyingTokenUserBalance;
    uint256 rewardsToClaim;
    uint40 userCooldownTimestamp;
    uint216 userCooldownAmount;
  }

  /**
   * @notice Return the address of the ETH price feed, USD denominated
   * @return The address of the ETH price feed, USD denominated, expressed with 8 decimals
   */
  function ETH_USD_PRICE_FEED() external returns (address);

  /**
   * @notice Return the address of the REX price feed, ETH denominated
   * @return The address of the REX price feed, ETH denominated, expressed with 18 decimals
   */
  function REX_USD_PRICE_FEED() external view returns (address);

  /**
   * @notice Return the address of the Staked REX token
   * @return The address of the StkREX token
   */
  function STAKED_REX() external returns (address);

  /**
   * @notice Returns data of all Staked Tokens
   * @return stkREXData An object with stkREX data
   * @return stkBptData An object with StkBpt data
   * @return ethPrice The price of ETH, USD denominated (expressed with 8 decimals)
   */
  function getAllStakedTokenData()
    external
    view
    returns (
      StakedTokenData memory stkREXData,
      StakedTokenData memory stkBptData,
      uint256 ethPrice
    );

  /**
   * @notice Returns data of Staked REX
   * @return stakedAssetData An object with stkREX data
   */
  function getStakedAssetData(
    address stakedAsset,
    address oracle
  ) external view returns (StakedTokenData memory stakedAssetData);

  /**
   * @notice Returns user data of all Staked Tokens
   * @param user The address of the user
   * @return stkREXData An object with stkREX data
   * @return stkREXUserData An object with user data of stkREX
   * @return stkBptData An object with StkBpt data
   * @return stkBptUserData An object with user data of StkBpt
   * @return ethPrice The price of ETH, USD denominated (expressed with 8 decimals)
   */
  function getAllStakedTokenUserData(
    address user
  )
    external
    view
    returns (
      StakedTokenData memory stkREXData,
      StakedTokenUserData memory stkREXUserData,
      StakedTokenData memory stkBptData,
      StakedTokenUserData memory stkBptUserData,
      uint256 ethPrice
    );

  /**
   * @notice Returns user data of Staked REX
   * @param user The address of the user
   * @return stkREXData An object with stkREX data
   * @return stkREXUserData An object with user data of stkREX
   */
  function getstkREXUserData(
    address user
  )
    external
    view
    returns (StakedTokenData memory stkREXData, StakedTokenUserData memory stkREXUserData);
}
