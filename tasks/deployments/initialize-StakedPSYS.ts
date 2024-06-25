import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import {
  ZERO_ADDRESS,
  STAKED_REX_NAME,
  STAKED_REX_SYMBOL,
  STAKED_REX_DECIMALS,
} from '../../helpers/constants';
import {
  getStakedREXV3,
  getStakedREXImpl,
  getStakedREXProxy,
} from '../../helpers/contracts-accessors';

const { StakedREXV3 } = eContractid;

task(`initialize-${StakedREXV3}`, `Initialize the ${StakedREXV3} proxy contract`)
  .addParam(
    'admin',
    `The address to be added as an Admin role in ${StakedREXV3} Transparent Proxy.`
  )
  .setAction(async ({ admin: rollexAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    if (!rollexAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StakedREXV3} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StakedREXV3} initialization`);

    const StakedREXV3Impl = await getStakedREXImpl();
    const StakedREXV3Proxy = await getStakedREXProxy();

    console.log('\tInitializing StakedREXV3');

    const encodedInitializeStakedREXV3 = StakedREXV3Impl.interface.encodeFunctionData(
      'initialize',
      [ZERO_ADDRESS, STAKED_REX_NAME, STAKED_REX_SYMBOL, STAKED_REX_DECIMALS]
    );

    await waitForTx(
      await StakedREXV3Proxy.functions['initialize(address,address,bytes)'](
        StakedREXV3Impl.address,
        rollexAdmin,
        encodedInitializeStakedREXV3
      )
    );

    console.log('\tFinished REX token and Transparent Proxy initialization');
  });
