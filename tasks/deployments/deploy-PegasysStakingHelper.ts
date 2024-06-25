import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { getREXtokenPerNetwork } from '../../helpers/constants';
import { deployRollexStakingHelper } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { RollexStakingHelper, StakedREX } = eContractid;

task(`deploy-${RollexStakingHelper}`, `Deploys the ${RollexStakingHelper} contract`)
  .addParam('stkREX', `The address of the ${StakedREX} contract.`)
  .addFlag('verify', 'Verify StakedREX contract via Etherscan API.')
  .setAction(async ({ stkREX: stkREXAddress, verify }, localBRE) => {
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
    console.log(`\n- ${RollexStakingHelper} deployment`);
    console.log(`\tDeploying ${RollexStakingHelper} implementation ...`);

    const rexToken = getREXtokenPerNetwork(network);

    const StakedREXHelper = await deployRollexStakingHelper([stkREXAddress, rexToken], verify);

    await StakedREXHelper.deployTransaction.wait();
    await registerContractInJsonDb(RollexStakingHelper, StakedREXHelper);

    console.log('RollexStakingHelper deployed to', StakedREXHelper.address);
  });
