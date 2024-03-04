import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork, tEthereumAddress } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import {
  getPSYStokenPerNetwork,
  getCooldownSecondsPerNetwork,
  getUnstakeWindowPerNetwork,
  getPegasysAdminPerNetwork,
  getDistributionDurationPerNetwork,
  getPegasysIncentivesVaultPerNetwork,
} from '../../helpers/constants';
import {
  deployStakedPSYS,
  deployInitializableAdminUpgradeabilityProxy,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { StakedPSYS, StakedPSYSImpl } = eContractid;

task(`deploy-${StakedPSYS}`, `Deploys the ${StakedPSYS} contract`)
  .addFlag('verify', 'Verify StakedPSYS contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use PegasysIncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('psysAddress', 'Use psysToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, psysAddress }, localBRE) => {
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
    console.log(`\n- ${StakedPSYS} deployment`);

    console.log(`\tDeploying ${StakedPSYS} implementation ...`);
    const StakedPSYSImpl = await deployStakedPSYS(
      [
        psysAddress || getPSYStokenPerNetwork(network),
        psysAddress || getPSYStokenPerNetwork(network),
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vaultAddress || getPegasysIncentivesVaultPerNetwork(network),
        getPegasysAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
      ],
      false // disable verify due not supported by current buidler etherscan plugin
    );
    await StakedPSYSImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedPSYSImpl, StakedPSYSImpl);

    console.log(`\tDeploying ${StakedPSYS} Transparent Proxy ...`);
    const StakedPSYSProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(StakedPSYS, StakedPSYSProxy);

    console.log(`\tFinished ${StakedPSYS} proxy and implementation deployment`);
    console.log('StakePSYSProxy deployed to', StakedPSYSProxy.address);
  });
