import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { getPSYStokenPerNetwork, ZERO_ADDRESS } from '../../helpers/constants';
import { deployStakeUIHelper } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { StakeUIHelper, StakedPSYS } = eContractid;

task(`deploy-${StakeUIHelper}`, `Deploys the ${StakeUIHelper} contract`)
  .addParam('stkPSYS', `The address of the ${StakedPSYS} contract.`)
  .addParam('pegasysOracle', `The address of the PegasysOracle contract.`)
  .addFlag('verify', 'Verify StakedPSYS contract via Etherscan API.')
  .setAction(
    async ({ stkPSYS: stkPSYSAddress, pegasysOracle: pegasysOracleAddress, verify }, localBRE) => {
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

      const psysToken = getPSYStokenPerNetwork(network);

      const StakedPSYSHelper = await deployStakeUIHelper(
        [pegasysOracleAddress, ZERO_ADDRESS, psysToken, stkPSYSAddress, ZERO_ADDRESS, ZERO_ADDRESS],
        verify
      );

      await StakedPSYSHelper.deployTransaction.wait();
      await registerContractInJsonDb(StakeUIHelper, StakedPSYSHelper);

      console.log('StakeUIHelper deployed to', StakedPSYSHelper.address);
    }
  );
