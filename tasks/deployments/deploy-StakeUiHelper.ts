import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { getREXtokenPerNetwork, ZERO_ADDRESS } from '../../helpers/constants';
import { deployStakeUIHelper } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { StakeUIHelper, StakedREX } = eContractid;

task(`deploy-${StakeUIHelper}`, `Deploys the ${StakeUIHelper} contract`)
  .addParam('stkREX', `The address of the ${StakedREX} contract.`)
  .addParam('rollexOracle', `The address of the RollexOracle contract.`)
  .addFlag('verify', 'Verify StakedREX contract via Etherscan API.')
  .setAction(
    async ({ stkREX: stkREXAddress, rollexOracle: rollexOracleAddress, verify }, localBRE) => {
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
      console.log(`\n- ${StakeUIHelper} deployment`);
      console.log(`\tDeploying ${StakeUIHelper} implementation ...`);

      const rexToken = getREXtokenPerNetwork(network);

      const StakedREXHelper = await deployStakeUIHelper(
        [rollexOracleAddress, ZERO_ADDRESS, rexToken, stkREXAddress, ZERO_ADDRESS, ZERO_ADDRESS],
        verify
      );

      await StakedREXHelper.deployTransaction.wait();
      await registerContractInJsonDb(StakeUIHelper, StakedREXHelper);

      console.log('StakeUIHelper deployed to', StakedREXHelper.address);
    }
  );
