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

export const logStakedPSYSBalanceOf = async (staker: tEthereumAddress, StakedPSYS: StakedPSYS) => {
  console.log(
    `[StakedPSYS.balanceOf(${staker})]: ${(await StakedPSYS.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  StakedPSYS: StakedPSYS
) => {
  console.log(
    `[StakedPSYS.getTotalRewardsBalance(${staker})]: ${(
      await StakedPSYS.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedPSYS = async (StakedPSYS: StakedPSYS) => {
  console.log(
    `[StakedPSYS.getRewardPerStakedPSYS()]: ${(
      await StakedPSYS.getRewardPerStakedPSYS()
    ).toString()}`
  );
};
