import { tEthereumAddress } from '../../../helpers/types';
import { MintableErc20 } from '../../../types/MintableErc20';
import { StakedREX } from '../../../types/StakedREX';

export const logREXtokenBalanceOf = async (account: tEthereumAddress, rexToken: MintableErc20) => {
  console.log(
    `[rexToken.balanceOf(${account})]: ${(await rexToken.balanceOf(account)).toString()}`
  );
};

export const logStakedREXBalanceOf = async (staker: tEthereumAddress, StakedREXV3: StakedREX) => {
  console.log(
    `[StakedREXV3.balanceOf(${staker})]: ${(await StakedREXV3.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  StakedREXV3: StakedREX
) => {
  console.log(
    `[StakedREXV3.getTotalRewardsBalance(${staker})]: ${(
      await StakedREXV3.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedREX = async (StakedREXV3: StakedREX) => {
  console.log(
    `[StakedREXV3.getRewardPerStakedREX()]: ${(
      await StakedREXV3.getRewardPerStakedREX()
    ).toString()}`
  );
};
