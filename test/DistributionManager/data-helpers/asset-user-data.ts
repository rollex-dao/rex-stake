import { BigNumber } from 'ethers';
import { PegasysDistributionManager } from '../../../types/PegasysDistributionManager';
import { StakedPSYS } from '../../../types/StakedPSYS';
import { PegasysIncentivesController } from '../../../types/PegasysIncentivesController';
import { StakedPSYSV3 } from '../../../types/StakedPSYSV3';

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
    | PegasysDistributionManager
    | PegasysIncentivesController
    | StakedPSYS
    | StakedPSYSV3,
  user: string,
  asset: string
): Promise<BigNumber> {
  return await distributionManager.getUserAssetData(user, asset);
}
