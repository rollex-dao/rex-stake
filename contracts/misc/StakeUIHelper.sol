// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import {IStakedToken} from '../interfaces/IStakedToken.sol';
import {StakeUIHelperI} from '../interfaces/StakeUIHelperI.sol';
import {IERC20WithNonce} from '../interfaces/IERC20WithNonce.sol';
import {BPTPriceFeedI} from '../interfaces/BPTPriceFeedI.sol';
import {IPriceOracle} from '../interfaces/IPriceOracle.sol';
import {IERC20} from '../interfaces/IERC20.sol';

contract StakeUIHelper is StakeUIHelperI {
  IPriceOracle public immutable PRICE_ORACLE;
  BPTPriceFeedI public immutable BPT_PRICE_FEED;

  address public immutable PSYS;
  IStakedToken public immutable STAKED_PSYS;

  address public immutable BPT;
  IStakedToken public immutable STAKED_BPT;

  uint256 constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
  uint256 constant APY_PRECISION = 10000;

  address constant MOCK_USD_ADDRESS = 0xCCa7d1416518D095E729904aAeA087dBA749A4dC;
  uint256 internal constant USD_BASE = 1e26;

  constructor(
    IPriceOracle priceOracle,
    BPTPriceFeedI bptPriceFeed,
    address psys,
    IStakedToken stkPSYS,
    address bpt,
    IStakedToken stkBpt
  ) public {
    PRICE_ORACLE = priceOracle;
    BPT_PRICE_FEED = bptPriceFeed;

    PSYS = psys;
    STAKED_PSYS = stkPSYS;

    BPT = bpt;
    STAKED_BPT = stkBpt;
  }

  function _getUserAndGeneralStakedAssetData(
    IStakedToken stakeToken,
    address underlyingToken,
    address user,
    bool isNonceAvailable
  ) internal view returns (AssetUIData memory) {
    AssetUIData memory data;
    GeneralStakeUIData memory generalStakeData = _getGeneralStakedAssetData(stakeToken);

    data.stakeTokenTotalSupply = generalStakeData.stakeTokenTotalSupply;
    data.stakeCooldownSeconds = generalStakeData.stakeCooldownSeconds;
    data.stakeUnstakeWindow = generalStakeData.stakeUnstakeWindow;
    data.rewardTokenPriceEth = generalStakeData.rewardTokenPriceEth;
    data.distributionEnd = generalStakeData.distributionEnd;
    data.distributionPerSecond = generalStakeData.distributionPerSecond;

    if (user != address(0)) {
      UserStakeUIData memory userStakeData = _getUserStakedAssetData(
        stakeToken,
        underlyingToken,
        user,
        isNonceAvailable
      );

      data.underlyingTokenUserBalance = userStakeData.underlyingTokenUserBalance;
      data.stakeTokenUserBalance = userStakeData.stakeTokenUserBalance;
      data.userIncentivesToClaim = userStakeData.userIncentivesToClaim;
      data.userCooldown = userStakeData.userCooldown;
      data.userPermitNonce = userStakeData.userPermitNonce;
    }

    return data;
  }

  function _getUserStakedAssetData(
    IStakedToken stakeToken,
    address underlyingToken,
    address user,
    bool isNonceAvailable
  ) internal view returns (UserStakeUIData memory) {
    UserStakeUIData memory data;
    data.underlyingTokenUserBalance = IERC20(underlyingToken).balanceOf(user);
    data.stakeTokenUserBalance = stakeToken.balanceOf(user);
    data.userIncentivesToClaim = stakeToken.getTotalRewardsBalance(user);
    data.userCooldown = stakeToken.stakersCooldowns(user);
    data.userPermitNonce = isNonceAvailable ? IERC20WithNonce(underlyingToken)._nonces(user) : 0;

    return data;
  }

  function _getGeneralStakedAssetData(
    IStakedToken stakeToken
  ) internal view returns (GeneralStakeUIData memory) {
    GeneralStakeUIData memory data;

    data.stakeTokenTotalSupply = stakeToken.totalSupply();
    data.stakeCooldownSeconds = stakeToken.COOLDOWN_SECONDS();
    data.stakeUnstakeWindow = stakeToken.UNSTAKE_WINDOW();
    data.rewardTokenPriceEth = PRICE_ORACLE.getAssetPrice(PSYS);
    data.distributionEnd = stakeToken.DISTRIBUTION_END();
    if (block.timestamp < data.distributionEnd) {
      data.distributionPerSecond = stakeToken.assets(address(stakeToken)).emissionPerSecond;
    }

    return data;
  }

  function _calculateApy(
    uint256 distributionPerSecond,
    uint256 stakeTokenTotalSupply
  ) internal pure returns (uint256) {
    if (stakeTokenTotalSupply == 0) return 0;
    return (distributionPerSecond * SECONDS_PER_YEAR * APY_PRECISION) / stakeTokenTotalSupply;
  }

  function getstkPSYSData(address user) public view override returns (AssetUIData memory) {
    AssetUIData memory data = _getUserAndGeneralStakedAssetData(STAKED_PSYS, PSYS, user, false);

    data.stakeTokenPriceEth = data.rewardTokenPriceEth;
    data.stakeApy = _calculateApy(data.distributionPerSecond, data.stakeTokenTotalSupply);
    return data;
  }

  function getStkBptData(address user) public view override returns (AssetUIData memory) {
    AssetUIData memory data = _getUserAndGeneralStakedAssetData(STAKED_BPT, BPT, user, false);

    data.stakeTokenPriceEth = address(BPT_PRICE_FEED) != address(0)
      ? BPT_PRICE_FEED.latestAnswer()
      : PRICE_ORACLE.getAssetPrice(BPT);
    data.stakeApy = _calculateApy(
      data.distributionPerSecond * data.rewardTokenPriceEth,
      data.stakeTokenTotalSupply * data.stakeTokenPriceEth
    );

    return data;
  }

  function getStkGeneralPSYSData() public view override returns (GeneralStakeUIData memory) {
    GeneralStakeUIData memory data = _getGeneralStakedAssetData(STAKED_PSYS);

    data.stakeTokenPriceEth = data.rewardTokenPriceEth;
    data.stakeApy = _calculateApy(data.distributionPerSecond, data.stakeTokenTotalSupply);
    return data;
  }

  function getStkGeneralBptData() public view override returns (GeneralStakeUIData memory) {
    GeneralStakeUIData memory data = _getGeneralStakedAssetData(STAKED_BPT);

    data.stakeTokenPriceEth = address(BPT_PRICE_FEED) != address(0)
      ? BPT_PRICE_FEED.latestAnswer()
      : PRICE_ORACLE.getAssetPrice(BPT);
    data.stakeApy = _calculateApy(
      data.distributionPerSecond * data.rewardTokenPriceEth,
      data.stakeTokenTotalSupply * data.stakeTokenPriceEth
    );

    return data;
  }

  function getStkUserPSYSData(address user) public view override returns (UserStakeUIData memory) {
    UserStakeUIData memory data = _getUserStakedAssetData(STAKED_PSYS, PSYS, user, false);
    return data;
  }

  function getStkUserBptData(address user) public view override returns (UserStakeUIData memory) {
    UserStakeUIData memory data = _getUserStakedAssetData(STAKED_BPT, BPT, user, false);
    return data;
  }

  function getUserUIData(
    address user
  ) external view override returns (AssetUIData memory, AssetUIData memory emptyData, uint256) {
    return (
      getstkPSYSData(user),
      emptyData,
      USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS)
    );
  }

  function getGeneralStakeUIData()
    external
    view
    override
    returns (GeneralStakeUIData memory, GeneralStakeUIData memory emptyData, uint256)
  {
    return (
      getStkGeneralPSYSData(),
      emptyData,
      USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS)
    );
  }

  function getUserStakeUIData(
    address user
  )
    external
    view
    override
    returns (UserStakeUIData memory, UserStakeUIData memory emptyData, uint256)
  {
    return (
      getStkUserPSYSData(user),
      emptyData,
      USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS)
    );
  }
}
