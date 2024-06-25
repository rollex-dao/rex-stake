import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { StakedREX } from '../../types/StakedREX';

task('dev-deployment', 'Deployment in hardhat').setAction(async (_, localBRE) => {
  const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');

  const rexStake = (await DRE.run(`deploy-${eContractid.StakedREX}`)) as StakedREX;
});
