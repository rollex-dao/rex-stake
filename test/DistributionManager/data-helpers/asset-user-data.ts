import { BigNumber } from 'ethers';
import { PegasysDistributionManager } from '../../../types/PegasysDistributionManager';
import { StakedPSYS } from '../../../types/StakedPSYS';
import { PegasysIncentivesController } from '../../../types/PegasysIncentivesController';
import { StakedPSYSV2 } from '../../../types/StakedPSYSV2';

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
    | StakedPSYSV2,
  user: string,
  asset: string
): Promise<BigNumber> {
  return await distributionManager.getUserAssetData(user, asset);
}
