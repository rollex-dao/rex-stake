import { makeSuite, TestEnv } from '../helpers/make-suite';
import { MAX_UINT_AMOUNT } from '../../helpers/constants';

const { expect } = require('chai');

makeSuite('RollexIncentivesController initialize', (testEnv: TestEnv) => {
  // TODO: useless or not?
  it('Tries to call initialize second time, should be reverted', async () => {
    const { rollexIncentivesController } = testEnv;
    await expect(rollexIncentivesController.initialize()).to.be.reverted;
  });
  it('allowance on rex token should be granted to psm contract for pei', async () => {
    const { rollexIncentivesController, StakedREX, rexToken } = testEnv;
    await expect(
      (await rexToken.allowance(rollexIncentivesController.address, StakedREX.address)).toString()
    ).to.be.equal(MAX_UINT_AMOUNT);
  });
});
