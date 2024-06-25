import { task } from 'hardhat/config';

import { eContractid, eEthereumNetwork, tEthereumAddress } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import {
  getREXtokenPerNetwork,
  getCooldownSecondsPerNetwork,
  getUnstakeWindowPerNetwork,
  getRollexAdminPerNetwork,
  getDistributionDurationPerNetwork,
  getRollexIncentivesVaultPerNetwork,
  REX_GOVERNANCE_V2,
} from '../../helpers/constants';
import {
  deployStakedREXV3,
  deployInitializableAdminUpgradeabilityProxy,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';
import { constants } from 'buffer';
const { StakedREXV3 } = eContractid;

task(`deploy-${StakedREXV3}`, `Deploys the ${StakedREXV3} contract`)
  .addFlag('verify', 'Verify StakedREX contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use RollexIncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('rexAddress', 'Use rexToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, rexAddress }, localBRE) => {
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
    console.log(`\n- ${StakedREXV3} deployment`);

    console.log(`\tDeploying ${StakedREXV3} implementation ...`);
    const StakedREXImpl = await deployStakedREXV3(
      [
        rexAddress || getREXtokenPerNetwork(network),
        rexAddress || getREXtokenPerNetwork(network),
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vaultAddress || getRollexIncentivesVaultPerNetwork(network),
        getRollexAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
        REX_GOVERNANCE_V2,
      ],
      true // disable verify due not supported by current buidler etherscan plugin
    );
    await StakedREXImpl.deployTransaction.wait();
    await registerContractInJsonDb(await StakedREXImpl.name(), StakedREXImpl);
    console.log(`\tDeploying ${StakedREXV3} Transparent Proxy ...`);

    const StakedREXProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(StakedREXV3, StakedREXProxy);

    console.log(`\tFinished ${StakedREXV3} proxy and implementation deployment`);
    console.log('StakeREXProxy deployed to', StakedREXProxy.address);
  });
