import { task } from 'hardhat/config';
import { IRollexGovernanceV2__factory } from '../../types';
import { Signer } from 'ethers';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { DRE } from '../../helpers/misc-utils';
import { MAX_UINT_AMOUNT } from '../../helpers/constants';

task('propose-vault-approval', 'Create some proposals and votes')
  .addParam('rewardsVaultController')
  .addParam('rexProxy')
  .addParam('stkREXProxy')
  .addParam('stkBptProxy')
  .addParam('rollexGovernance')
  .addParam('shortExecutor')
  .addParam('ipfsHash')
  .addFlag('defender')
  .setAction(
    async (
      {
        rewardsVaultController,
        rollexGovernance,
        shortExecutor,
        defender,
        stkREXProxy,
        stkBptProxy,
        rexProxy,
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

      // Calldata for stkREX approval
      const payloadForstkREXApproval = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [rexProxy, stkREXProxy, MAX_UINT_AMOUNT]
      );
      // Calldata for StkBpt approval
      const payloadForStkBPTApproval = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [rexProxy, stkBptProxy, MAX_UINT_AMOUNT]
      );

      const executeSignature = 'approve(address,address,uint256)';
      const gov = await IRollexGovernanceV2__factory.connect(rollexGovernance, proposer);

      try {
        const tx = await gov.create(
          shortExecutor,
          [rewardsVaultController, rewardsVaultController],
          ['0', '0'],
          [executeSignature, executeSignature],
          [payloadForstkREXApproval, payloadForStkBPTApproval],
          [false, false],
          ipfsHash,
          { gasLimit: 1000000 }
        );
        await tx.wait();
        console.log('- Proposal submitted to Governance');
      } catch (error) {
        throw error;
      }
    }
  );
