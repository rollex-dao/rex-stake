import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getPegasysAdminPerNetwork } from '../../helpers/constants';

task('common-deployment', 'Deployment in for Main, Kovan and Ropsten networks')
  .addFlag('verify', 'Verify StakedPSYSV3 and InitializableAdminUpgradeabilityProxy contract.')
  .addOptionalParam(
    'vaultAddress',
    'Use PegasysIncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('psysAddress', 'Use psysToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, psysAddress }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const pegasysAdmin = getPegasysAdminPerNetwork(network);

    if (!pegasysAdmin) {
      throw Error(
        'The --admin parameter must be set. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    await DRE.run(`deploy-${eContractid.StakedPSYSV3}`, { verify, vaultAddress, psysAddress });

    await DRE.run(`initialize-${eContractid.StakedPSYSV3}`, {
      admin: pegasysAdmin,
    });

    console.log(`\n✔️ Finished the deployment of the PSYS token ${network} Enviroment. ✔️`);
  });
