import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { getPSYStokenPerNetwork } from '../../helpers/constants';
import { deployPegasysStakingHelper } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { PegasysStakingHelper, StakedPSYS } = eContractid;

task(`deploy-${PegasysStakingHelper}`, `Deploys the ${PegasysStakingHelper} contract`)
  .addParam('stkPSYS', `The address of the ${StakedPSYS} contract.`)
  .addFlag('verify', 'Verify StakedPSYS contract via Etherscan API.')
  .setAction(async ({ stkPSYS: stkPSYSAddress, verify }, localBRE) => {
    await localBRE.run('set-dre');

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    const network = localBRE.network.name as eEthereumNetwork;

    console.log(`\n- ${network} network`);
    console.log(`\n- ${PegasysStakingHelper} deployment`);
    console.log(`\tDeploying ${PegasysStakingHelper} implementation ...`);

    const psysToken = getPSYStokenPerNetwork(network);

    const StakedPSYSHelper = await deployPegasysStakingHelper([stkPSYSAddress, psysToken], verify);

    await StakedPSYSHelper.deployTransaction.wait();
    await registerContractInJsonDb(PegasysStakingHelper, StakedPSYSHelper);

    console.log('PegasysStakingHelper deployed to', StakedPSYSHelper.address);
  });
