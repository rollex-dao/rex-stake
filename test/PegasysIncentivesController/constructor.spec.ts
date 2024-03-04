import { timeLatest } from '../../helpers/misc-utils';

const { expect } = require('chai');

import { makeSuite } from '../helpers/make-suite';
import { deployPegasysIncentivesController } from '../../helpers/contracts-accessors';
import { RANDOM_ADDRESSES } from '../../helpers/constants';

makeSuite('PegasysIncentivesController constructor tests', () => {
  it('should assign correct params', async () => {
    const peiEmissionManager = RANDOM_ADDRESSES[1];
    const rewardToken = RANDOM_ADDRESSES[3];
    const rewardsVault = RANDOM_ADDRESSES[4];
    const psm = RANDOM_ADDRESSES[5];
    const extraPsmReward = '100';
    const distributionDuration = '100';

    const pegasysIncentivesController = await deployPegasysIncentivesController([
      rewardToken,
      rewardsVault,
      psm,
      extraPsmReward,
      peiEmissionManager,
      distributionDuration,
    ]);
    await expect(await pegasysIncentivesController.REWARD_TOKEN()).to.be.equal(rewardToken);
    await expect(await pegasysIncentivesController.REWARDS_VAULT()).to.be.equal(rewardsVault);
    await expect(await pegasysIncentivesController.PSM()).to.be.equal(psm);
    await expect((await pegasysIncentivesController.EXTRA_PSM_REWARD()).toString()).to.be.equal(
      extraPsmReward
    );
    await expect((await pegasysIncentivesController.EMISSION_MANAGER()).toString()).to.be.equal(
      peiEmissionManager
    );
    await expect((await pegasysIncentivesController.DISTRIBUTION_END()).toString()).to.be.equal(
      (await timeLatest()).plus(distributionDuration).toString()
    );
  });
});
