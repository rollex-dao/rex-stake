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
  getStakedPSYS,
  getStakedPSYSImpl,
  getStakedPSYSProxy,
} from '../../helpers/contracts-accessors';

const { StakedPSYS } = eContractid;

task(`initialize-${StakedPSYS}`, `Initialize the ${StakedPSYS} proxy contract`)
  .addParam('admin', `The address to be added as an Admin role in ${StakedPSYS} Transparent Proxy.`)
  .setAction(async ({ admin: pegasysAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    if (!pegasysAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StakedPSYS} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StakedPSYS} initialization`);

    const StakedPSYSImpl = await getStakedPSYSImpl();
    const StakedPSYSProxy = await getStakedPSYSProxy();

    console.log('\tInitializing StakedPSYS');

    const encodedInitializeStakedPSYS = StakedPSYSImpl.interface.encodeFunctionData('initialize', [
      ZERO_ADDRESS,
      STAKED_PSYS_NAME,
      STAKED_PSYS_SYMBOL,
      STAKED_PSYS_DECIMALS,
    ]);

    await waitForTx(
      await StakedPSYSProxy.functions['initialize(address,address,bytes)'](
        StakedPSYSImpl.address,
        pegasysAdmin,
        encodedInitializeStakedPSYS
      )
    );

    console.log('\tFinished PSYS token and Transparent Proxy initialization');
  });
