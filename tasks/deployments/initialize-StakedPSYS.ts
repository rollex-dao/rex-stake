import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import {
  ZERO_ADDRESS,
  STAKED_PSYS_NAME,
  STAKED_PSYS_SYMBOL,
  STAKED_PSYS_DECIMALS,
} from '../../helpers/constants';
import {
  getStakedPSYSV3,
  getStakedPSYSImpl,
  getStakedPSYSProxy,
} from '../../helpers/contracts-accessors';

const { StakedPSYSV3 } = eContractid;

task(`initialize-${StakedPSYSV3}`, `Initialize the ${StakedPSYSV3} proxy contract`)
  .addParam('admin', `The address to be added as an Admin role in ${StakedPSYSV3} Transparent Proxy.`)
  .setAction(async ({ admin: pegasysAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    if (!pegasysAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StakedPSYSV3} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StakedPSYSV3} initialization`);

    const StakedPSYSV3Impl = await getStakedPSYSImpl();
    const StakedPSYSV3Proxy = await getStakedPSYSProxy();

    console.log('\tInitializing StakedPSYSV3');

    const encodedInitializeStakedPSYSV3 = StakedPSYSV3Impl.interface.encodeFunctionData('initialize', [
      ZERO_ADDRESS,
      STAKED_PSYS_NAME,
      STAKED_PSYS_SYMBOL,
      STAKED_PSYS_DECIMALS,
    ]);

    await waitForTx(
      await StakedPSYSV3Proxy.functions['initialize(address,address,bytes)'](
        StakedPSYSV3Impl.address,
        pegasysAdmin,
        encodedInitializeStakedPSYSV3
      )
    );

    console.log('\tFinished PSYS token and Transparent Proxy initialization');
  });
