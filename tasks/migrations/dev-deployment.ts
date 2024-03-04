import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { StakedPSYS } from '../../types/StakedPSYS';

task('dev-deployment', 'Deployment in hardhat').setAction(async (_, localBRE) => {
  const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');

  const psysStake = (await DRE.run(`deploy-${eContractid.StakedPSYS}`)) as StakedPSYS;
});
