import rawBRE from 'hardhat';
import { Signer, ethers } from 'ethers';
import { getEthersSigners } from '../helpers/contracts-helpers';
import { initializeMakeSuite } from './helpers/make-suite';
import { deployMintableErc20, deployATokenMock } from '../helpers/contracts-accessors';
import { waitForTx } from '../helpers/misc-utils';
import { MintableErc20 } from '../types/MintableErc20';
import { testDeploypsysStakeV2, testDeploypsysStakeV1 } from './helpers/deploy';

const topUpWalletsWithPSYS = async (
  wallets: Signer[],
  psysToken: MintableErc20,
  amount: string
) => {
  for (const wallet of wallets) {
    await waitForTx(await psysToken.connect(wallet).mint(amount));
  }
};

const buildTestEnv = async (deployer: Signer, vaultOfRewards: Signer, restWallets: Signer[]) => {
  console.time('setup');

  const psysToken = await deployMintableErc20(['PSYS', 'psys', 18]);

  await waitForTx(await psysToken.connect(vaultOfRewards).mint(ethers.utils.parseEther('1000000')));
  await topUpWalletsWithPSYS(
    [
      restWallets[0],
      restWallets[1],
      restWallets[2],
      restWallets[3],
      restWallets[4],
      restWallets[5],
    ],
    psysToken,
    ethers.utils.parseEther('100').toString()
  );

  await testDeploypsysStakeV2(psysToken, deployer, vaultOfRewards, restWallets);

  const { pegasysIncentivesControllerProxy } = await testDeploypsysStakeV1(
    psysToken,
    deployer,
    vaultOfRewards,
    restWallets
  );

  await deployATokenMock(pegasysIncentivesControllerProxy.address, 'aDai');
  await deployATokenMock(pegasysIncentivesControllerProxy.address, 'aWeth');

  console.timeEnd('setup');
};

before(async () => {
  await rawBRE.run('set-dre');
  const [deployer, rewardsVault, ...restWallets] = await getEthersSigners();
  console.log('-> Deploying test environment...');
  await buildTestEnv(deployer, rewardsVault, restWallets);
  await initializeMakeSuite();
  console.log('\n***************');
  console.log('Setup and snapshot finished');
  console.log('***************\n');
});
