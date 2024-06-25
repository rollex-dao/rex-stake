import { BigNumber } from 'ethers';
import { RollexDistributionManager } from '../../../types/RollexDistributionManager';
import { StakedREX } from '../../../types/StakedREX';
import { RollexIncentivesController } from '../../../types/RollexIncentivesController';
import { StakedREXV3 } from '../../../types/StakedREXV3';

export type UserStakeInput = {
  underlyingAsset: string;
  stakedByUser: string;
  totalStaked: string;
};

export type UserPositionUpdate = UserStakeInput & {
  user: string;
};
export async function getUserIndex(
  distributionManager:
    | RollexDistributionManager
    | RollexIncentivesController
    | StakedREX
    | StakedREXV3,
  user: string,
  asset: string
): Promise<BigNumber> {
  return await distributionManager.getUserAssetData(user, asset);
}
