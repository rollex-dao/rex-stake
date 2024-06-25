import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getRollexAdminPerNetwork } from '../../helpers/constants';

task('common-deployment', 'Deployment in for Main, Kovan and Ropsten networks')
  .addFlag('verify', 'Verify StakedREXV3 and InitializableAdminUpgradeabilityProxy contract.')
  .addOptionalParam(
    'vaultAddress',
    'Use RollexIncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('rexAddress', 'Use rexToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, rexAddress }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const rollexAdmin = getRollexAdminPerNetwork(network);

    if (!rollexAdmin) {
      throw Error(
        'The --admin parameter must be set. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    await DRE.run(`deploy-${eContractid.StakedREXV3}`, { verify, vaultAddress, rexAddress });

    await DRE.run(`initialize-${eContractid.StakedREXV3}`, {
      admin: rollexAdmin,
    });

    console.log(`\n✔️ Finished the deployment of the REX token ${network} Enviroment. ✔️`);
  });
