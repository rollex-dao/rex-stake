import { Signer } from 'ethers';
import {
  PSM_STAKER_PREMIUM,
  COOLDOWN_SECONDS,
  UNSTAKE_WINDOW,
  STAKED_REX_NAME,
  STAKED_REX_SYMBOL,
  STAKED_REX_DECIMALS,
  MAX_UINT_AMOUNT,
  ZERO_ADDRESS,
} from '../../helpers/constants';
import {
  deployInitializableAdminUpgradeabilityProxy,
  deployRollexIncentivesController,
  deployStakedREX,
  deployMockTransferHook,
  deployStakedREXV3,
} from '../../helpers/contracts-accessors';
import { insertContractAddressInDb } from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { eContractid } from '../../helpers/types';
import { MintableErc20 } from '../../types/MintableErc20';

export const testDeployrexStakeV1 = async (
  rexToken: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const proxyAdmin = await restWallets[0].getAddress();
  const emissionManager = await deployer.getAddress();

  const stakedToken = rexToken.address;
  const rewardsToken = rexToken.address;

  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const rollexIncentivesControllerProxy = await deployInitializableAdminUpgradeabilityProxy();
  const StakedREXProxy = await deployInitializableAdminUpgradeabilityProxy();

  const rollexIncentivesControllerImplementation = await deployRollexIncentivesController([
    rexToken.address,
    vaultOfRewardsAddress,
    StakedREXProxy.address,
    PSM_STAKER_PREMIUM,
    emissionManager,
    (1000 * 60 * 60).toString(),
  ]);

  const StakedREXImpl = await deployStakedREX([
    stakedToken,
    rewardsToken,
    COOLDOWN_SECONDS,
    UNSTAKE_WINDOW,
    vaultOfRewardsAddress,
    emissionManager,
    (1000 * 60 * 60).toString(),
  ]);

  const mockTransferHook = await deployMockTransferHook();

  const StakedREXEncodedInitialize = StakedREXImpl.interface.encodeFunctionData('initialize', [
    mockTransferHook.address,
    STAKED_REX_NAME,
    STAKED_REX_SYMBOL,
    STAKED_REX_DECIMALS,
  ]);
  await StakedREXProxy['initialize(address,address,bytes)'](
    StakedREXImpl.address,
    proxyAdmin,
    StakedREXEncodedInitialize
  );
  await waitForTx(
    await rexToken.connect(vaultOfRewards).approve(StakedREXProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(eContractid.StakedREX, StakedREXProxy.address);

  const peiEncodedInitialize =
    rollexIncentivesControllerImplementation.interface.encodeFunctionData('initialize');
  await rollexIncentivesControllerProxy['initialize(address,address,bytes)'](
    rollexIncentivesControllerImplementation.address,
    proxyAdmin,
    peiEncodedInitialize
  );
  await waitForTx(
    await rexToken
      .connect(vaultOfRewards)
      .approve(rollexIncentivesControllerProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(
    eContractid.RollexIncentivesController,
    rollexIncentivesControllerProxy.address
  );

  return {
    rollexIncentivesControllerProxy,
    StakedREXProxy,
  };
};

export const testDeployrexStakeV2 = async (
  rexToken: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const stakedToken = rexToken.address;
  const rewardsToken = rexToken.address;
  const emissionManager = await deployer.getAddress();
  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const { StakedREXProxy } = await testDeployrexStakeV1(
    rexToken,
    deployer,
    vaultOfRewards,
    restWallets
  );

  const StakedREXImpl = await deployStakedREXV3([
    stakedToken,
    rewardsToken,
    COOLDOWN_SECONDS,
    UNSTAKE_WINDOW,
    vaultOfRewardsAddress,
    emissionManager,
    (1000 * 60 * 60).toString(),
    ZERO_ADDRESS,
  ]);

  const StakedREXEncodedInitialize = StakedREXImpl.interface.encodeFunctionData('initialize');

  await StakedREXProxy.connect(restWallets[0]).upgradeToAndCall(
    StakedREXImpl.address,
    StakedREXEncodedInitialize
  );

  await insertContractAddressInDb(eContractid.StakedREXV3, StakedREXProxy.address);

  return {
    StakedREXProxy,
  };
};
