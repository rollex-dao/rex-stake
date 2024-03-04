import { tEthereumAddress } from '../../../helpers/types';
import { MintableErc20 } from '../../../types/MintableErc20';
import { StakedPSYS } from '../../../types/StakedPSYS';

export const logPSYStokenBalanceOf = async (
  account: tEthereumAddress,
  psysToken: MintableErc20
) => {
  console.log(
    `[psysToken.balanceOf(${account})]: ${(await psysToken.balanceOf(account)).toString()}`
  );
};

export const logStakedPSYSBalanceOf = async (
  staker: tEthereumAddress,
  StakedPSYSV2: StakedPSYS
) => {
  console.log(
    `[StakedPSYSV2.balanceOf(${staker})]: ${(await StakedPSYSV2.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  StakedPSYSV2: StakedPSYS
) => {
  console.log(
    `[StakedPSYSV2.getTotalRewardsBalance(${staker})]: ${(
      await StakedPSYSV2.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedPSYS = async (StakedPSYSV2: StakedPSYS) => {
  console.log(
    `[StakedPSYSV2.getRewardPerStakedPSYS()]: ${(
      await StakedPSYSV2.getRewardPerStakedPSYS()
    ).toString()}`
  );
};
