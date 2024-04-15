import { task } from 'hardhat/config';
import {
  IPegasysGovernanceV2__factory,
  StakedTokenBptRev2__factory,
  StakedTokenV3Rev3,
  StakedTokenV3Rev3__factory,
} from '../../types';
import { Signer } from 'ethers';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { DRE } from '../../helpers/misc-utils';

task('propose-extension', 'Create some proposals and votes')
  .addParam('stkPSYSProxy')
  .addParam('stkPSYSImpl')
  .addParam('stkBptProxy')
  .addParam('stkBptImpl')
  .addParam('pegasysGovernance')
  .addParam('longExecutor')
  .addParam('ipfsHash')
  .addFlag('defender')
  .setAction(
    async (
      {
        pegasysGovernance,
        longExecutor,
        defender,
        stkPSYSProxy,
        stkPSYSImpl,
        stkBptProxy,
        stkBptImpl,
        ipfsHash,
      },
      localBRE: any
    ) => {
      await localBRE.run('set-dre');

      let proposer: Signer;
      [proposer] = await DRE.ethers.getSigners();

      if (defender) {
        const { signer } = await getDefenderRelaySigner();
        proposer = signer;
      }

      if (!stkPSYSImpl) {
        throw '[hh-task][propose-extension] stkPSYSImpl param is missing';
      }
      if (!stkBptImpl) {
        throw '[hh-task][propose-extension] stkBptImpl param is missing';
      }
      if (!longExecutor) {
        throw '[hh-task][propose-extension] longExecutor param is missing';
      }
      if (!stkPSYSProxy) {
        throw '[hh-task][propose-extension] stkPSYSProxy param is missing';
      }
      if (!stkBptProxy) {
        throw '[hh-task][propose-extension] stkBptProxy param is missing';
      }
      if (!ipfsHash) {
        throw '[hh-task][propose-extension] ipfsHash param is missing';
      }

      // Calldata for stkPSYS implementation
      const payloadstkPSYS = StakedTokenV3Rev3__factory.connect(
        stkPSYSImpl,
        proposer
      ).interface.encodeFunctionData('initialize');
      const callDatastkPSYS = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [stkPSYSImpl, payloadstkPSYS]
      );

      // Calldata for StkBpt implementation
      // Empty arguments for initializer due they are not used
      const payloadStkBpt = StakedTokenBptRev2__factory.connect(
        stkBptImpl,
        proposer
      ).interface.encodeFunctionData('initialize', ['', '', '18']);
      const callDataStkBpt = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [stkBptImpl, payloadStkBpt]
      );
      const executeSignature = 'upgradeToAndCall(address,bytes)';
      const gov = await IPegasysGovernanceV2__factory.connect(pegasysGovernance, proposer);

      try {
        const tx = await gov.create(
          longExecutor,
          [stkPSYSProxy, stkBptProxy],
          ['0', '0'],
          [executeSignature, executeSignature],
          [callDatastkPSYS, callDataStkBpt],
          [false, false],
          ipfsHash,
          { gasLimit: 1000000 }
        );
        console.log('- Proposal submitted to Governance');
        await tx.wait();
      } catch (error) {
        throw error;
      }

      console.log('Your Proposal has been submitted');
    }
  );
