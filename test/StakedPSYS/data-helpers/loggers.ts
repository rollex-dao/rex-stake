import { tEthereumAddress } from '../../../helpers/types';
import { MintableErc20 } from '../../../types/MintableErc20';
import { StakedREX } from '../../../types/StakedREX';

export const logREXtokenBalanceOf = async (account: tEthereumAddress, rexToken: MintableErc20) => {
  console.log(
    `[rexToken.balanceOf(${account})]: ${(await rexToken.balanceOf(account)).toString()}`
  );
};

export const logStakedREXBalanceOf = async (staker: tEthereumAddress, StakedREX: StakedREX) => {
  console.log(
    `[StakedREX.balanceOf(${staker})]: ${(await StakedREX.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  StakedREX: StakedREX
) => {
  console.log(
    `[StakedREX.getTotalRewardsBalance(${staker})]: ${(
      await StakedREX.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedREX = async (StakedREX: StakedREX) => {
  console.log(
    `[StakedREX.getRewardPerStakedREX()]: ${(await StakedREX.getRewardPerStakedREX()).toString()}`
  );
};
